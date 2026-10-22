import { getTimelineForAttempt, type LoggedEvent } from "./telemetry";

// ---------------------------------------------------------------------------
// Cycle summary — a single flat rollup of "what happened this cycle attempt".
//
// This is a pure reducer: given an attempt_id, it scans that attempt's
// events (already grouped for you by getTimelineForAttempt) and picks out
// the handful of fields you actually want to eyeball afterwards, rather
// than re-deriving them by hand from the raw event stream every time.
//
// It is NOT auto-fired here — see derive.ts, which calls fireCycleSummary()
// when a "cycle_ended" semantic event comes through (the actual exit click:
// Restart Term / Proceed to Next Term / Finish Game).
// ---------------------------------------------------------------------------

export interface TurnSummary {
  turn: number;
  policy_enacted: string | null;
  score_start: number | null;
  score_end: number | null;
  score_delta: number | null;
  time_on_turn_ms: number | null;

  /** every policy id that was on offer this turn */
  options_available: string[];
  /** policy ids the player picked as their candidate at least once this
   * turn (via clicking a card in the deck) - not necessarily the one they
   * ended up enacting, and not necessarily via View Details */
  options_previewed: string[];
  /** policy ids that had "View Details" opened at least once this turn */
  options_view_details_opened: string[];

  pct_options_previewed: number | null;
  pct_options_view_details_opened: number | null;

  /** ms each policy was the selected/candidate policy before being swapped
   * out or the turn ending - one entry per pick, order doesn't matter */
  preview_durations_ms: number[];
  /** ms each "View Details" panel stayed open - one entry per open/close */
  view_details_durations_ms: number[];

  /** public approval (%) at the start / end of the turn */
  approval_start: number | null;
  approval_end: number | null;
  /** every card pick this turn, in order (repeats kept) */
  picks: string[];
  picks_count: number;
  first_pick: string | null;
  /** enacted the first card they picked (no switching) */
  enacted_was_first_pick: boolean | null;
  /** total ms each policy was the selected card / had View Details open */
  preview_ms_by_policy: Record<string, number>;
  view_details_ms_by_policy: Record<string, number>;

  /** change in this term's metric each offered policy would have caused */
  option_effects: Record<string, number> | null;
  /** the offered policy with the biggest improvement, and that improvement */
  best_option: string | null;
  best_delta: number | null;
  enacted_delta: number | null;
  /** 1 = the best of the options on offer (ties share a rank) */
  enacted_rank: number | null;
  picked_best: boolean | null;

  /** histogram bar hovers during this turn: [bin, count, dwell_ms] */
  chart_bin_hovers: [number, number, number][];
}

export interface CycleSummary {
  cycle?: string;
  attempt_id: string;
  attempt_number?: number;

  player_won: boolean | null;
  outcome: "won" | "lost_retry" | "lost_final" | null;

  starting_score: number | null;
  final_score: number | null;
  score_delta: number | null;
  turns_played: number;

  time_on_briefing_ms: number | null;
  time_on_term_summary_ms: number | null;
  time_on_verdict_ms: number | null;
  time_on_wellbeing_changes_ms: number | null;
  time_on_electorate_feedback_ms: number | null;
  time_on_academic_debrief_ms: number | null;

  voter_quotes_clicked: number;
  player_viewed_enacted_history: boolean;
  player_viewed_animated_histogram: boolean;

  press_conf_q1_correct: boolean | null;
  press_conf_q2_correct: boolean | null;
  press_conf_non_chosen_policy_chosen: boolean | null;
  /** out of 2 - null if the press conference never happened this attempt */
  

  /** full per-turn breakdown - score, timing, and how much of the deck they
   * actually looked at before enacting */
  turns: TurnSummary[];
  /** across every turn this attempt: previewed-options / available-options,
   * as a %. This is what tells you "are players actually engaging with the
   * choices on offer or just clicking the first thing". */
  pct_policy_options_previewed: number | null;
  pct_policy_options_view_details_opened: number | null;

  /** wall-clock ms from the first event of this attempt to the last */
  total_cycle_duration_ms: number;
  /** page refreshes during this attempt (the game resumed at the start of the turn) */
  refreshes: number;

  /** false = still in progress (a snapshot saved after each turn) */
  complete: boolean;
  started_at: number;
  ended_at: number;
  /** verdict: approval >= 51% */
  won: boolean | null;
  /** which button ended it: restart / next_term / finish_game */
  exit: string | null;
  /** one step of the player's path, e.g. "Benthamite_won", "Rawlsian_fail",
   * "Rawlsian_won_replayed", "SocietalUtility_fail_moved_on" (see pathLabel) */
  path_label: string;

  approval_start: number | null;
  approval_final: number | null;
  /** this term's win threshold, best possible score and difficulty scalar */
  target_score: number | null;
  max_score: number | null;
  win_scalar: number | null;

  /** per-screen timings and interactions (flat, for the CSV) */
  screens: Record<string, number | string | boolean | null>;

  /** across all turns */
  avg_preview_ms: number | null;
  avg_view_details_ms: number | null;
  pct_turns_picked_best: number | null;
  pct_turns_enacted_first_pick: number | null;
  mean_enacted_rank: number | null;
  chart_bin_hovers: number;
  enacted_history_hovers: number;
  enacted_history_hover_ms: number;
  /** enacted-policy hovers after the last turn (the end-of-term review) */
  enacted_history_hovers_after_final_turn: number;
  /** distinct enacted policies hovered: [policy_id, total ms] */
  enacted_history_hovered: [string, number][];

  /** every deliberate action in this attempt, in order:
   * [ms since attempt start, event, turn, payload (minus repeated context)] */
  timeline: [number, string, number | null, Record<string, unknown> | null][];
}

function findFirst(events: LoggedEvent[], name: string): LoggedEvent | undefined {
  return events.find((e) => e.event === name);
}

function findLast(events: LoggedEvent[], name: string): LoggedEvent | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].event === name) return events[i];
  }
  return undefined;
}

function num(v: unknown): number | null {
  return typeof v === "number" && !Number.isNaN(v) ? v : null;
}

function buildTurnSummaries(events: LoggedEvent[]): TurnSummary[] {
  const turnNumbers = new Set<number>();
  for (const e of events) {
    if (e.event === "turn_started" && typeof e.turn === "number") turnNumbers.add(e.turn);
  }

  return [...turnNumbers].sort((a, b) => a - b).map((turn) => {
    const started = findFirst(events.filter((e) => e.turn === turn), "turn_started");
    const completed = findFirst(events.filter((e) => e.turn === turn), "turn_completed");
    const enacted = findFirst(events.filter((e) => e.turn === turn), "policy_selected");
    const optionsPresented = findFirst(events.filter((e) => e.turn === turn), "policy_options_presented");

    const optionsAvailable = Array.isArray(optionsPresented?.payload?.options)
      ? (optionsPresented!.payload!.options as unknown[]).filter((x): x is string => typeof x === "string")
      : [];

    const turnEvents = events.filter((e) => e.turn === turn);
    // Some events pass turn in their payload rather than via setContext, so
    // we check both the top-level e.turn and payload.turn to avoid missing them.
    const eventTurn = (e: LoggedEvent) =>
      e.turn === turn || (e.payload?.turn as number | undefined) === turn;

    const previewed = new Set<string>();
    const viewDetailsOpened = new Set<string>();
    for (const e of events) {
      if (!eventTurn(e)) continue;
      if (e.event === "policy_card_selected" && e.payload?.action === "picked" && typeof e.payload?.policy_id === "string") {
        previewed.add(e.payload.policy_id as string);
      }
      if (e.event === "view_details_opened" && typeof e.payload?.policy_id === "string") {
        viewDetailsOpened.add(e.payload.policy_id as string);
      }
    }

    // Preview duration per pick = time until the next selection change
    // (another pick, a deselect, or the turn ending) - selection is
    // exclusive so this needs no extra instrumentation, just the existing
    // policy_card_selected sequence.
    const turnEndTs = completed?.ts ?? turnEvents[turnEvents.length - 1]?.ts ?? started?.ts ?? 0;
    const selections = turnEvents.filter((e) => e.event === "policy_card_selected").sort((a, b) => a.ts - b.ts);
    const previewDurationsMs: number[] = [];
    for (let i = 0; i < selections.length; i++) {
      if (selections[i].payload?.action !== "picked") continue;
      const endTs = selections[i + 1]?.ts ?? turnEndTs;
      previewDurationsMs.push(endTs - selections[i].ts);
    }

    const viewDetailsDurationsMs = turnEvents
      .filter((e) => e.event === "view_details_closed")
      .map((e) => num(e.payload?.dwell_ms))
      .filter((v): v is number => v !== null);

    const scoreStart = num(started?.payload?.score);
    const scoreEnd = num(completed?.payload?.score);

    // Card picks in order, and total time per policy.
    const picks = selections
      .filter((e) => e.payload?.action === "picked" && typeof e.payload?.policy_id === "string")
      .map((e) => e.payload!.policy_id as string);
    const previewByPolicy: Record<string, number> = {};
    for (let i = 0; i < selections.length; i++) {
      if (selections[i].payload?.action !== "picked") continue;
      const id = selections[i].payload?.policy_id as string;
      const endTs = selections[i + 1]?.ts ?? turnEndTs;
      previewByPolicy[id] = (previewByPolicy[id] ?? 0) + (endTs - selections[i].ts);
    }
    const viewDetailsByPolicy: Record<string, number> = {};
    for (const e of turnEvents) {
      if (e.event !== "view_details_closed") continue;
      const id = e.payload?.policy_id as string;
      const ms = num(e.payload?.dwell_ms);
      if (id && ms !== null) viewDetailsByPolicy[id] = (viewDetailsByPolicy[id] ?? 0) + ms;
    }

    // Did they enact the best of the options on offer (for this term's metric)?
    const enactedId = typeof enacted?.payload?.policy_id === "string" ? (enacted!.payload!.policy_id as string) : null;
    const effects = (enacted?.payload?.option_effects as Record<string, number> | undefined) ?? null;
    let bestOption: string | null = null;
    let bestDelta: number | null = null;
    let enactedDelta: number | null = null;
    let enactedRank: number | null = null;
    if (effects && Object.keys(effects).length > 0) {
      for (const [id, d] of Object.entries(effects)) {
        if (bestDelta === null || d > bestDelta) { bestDelta = d; bestOption = id; }
      }
      if (enactedId && typeof effects[enactedId] === "number") {
        enactedDelta = effects[enactedId];
        enactedRank = 1 + Object.values(effects).filter((d) => d > enactedDelta! + 1e-9).length;
      }
    }

    // Histogram hovers while the turn was being played.
    const startTs = started?.ts ?? 0;
    const chartHovers: [number, number, number][] = events
      .filter((e) => e.event === "chart_bin_hovered" && e.ts >= startTs && e.ts <= turnEndTs)
      .map((e) => [num(e.payload?.bin) ?? -1, num(e.payload?.count) ?? 0, num(e.payload?.dwell_ms) ?? 0]);

    return {
      turn,
      policy_enacted: typeof enacted?.payload?.policy_id === "string" ? (enacted!.payload!.policy_id as string) : null,
      score_start: scoreStart,
      score_end: scoreEnd,
      score_delta: scoreStart !== null && scoreEnd !== null ? scoreEnd - scoreStart : null,
      time_on_turn_ms: num(completed?.payload?.time_on_turn_ms),
      options_available: optionsAvailable,
      options_previewed: [...previewed],
      options_view_details_opened: [...viewDetailsOpened],
      pct_options_previewed: optionsAvailable.length > 0 ? Math.round((previewed.size / optionsAvailable.length) * 100) : null,
      pct_options_view_details_opened: optionsAvailable.length > 0 ? Math.round((viewDetailsOpened.size / optionsAvailable.length) * 100) : null,
      preview_durations_ms: previewDurationsMs,
      view_details_durations_ms: viewDetailsDurationsMs,
      approval_start: num(started?.payload?.approval),
      approval_end: num(completed?.payload?.approval),
      picks,
      picks_count: picks.length,
      first_pick: picks[0] ?? null,
      enacted_was_first_pick: enactedId && picks.length ? picks[0] === enactedId : null,
      preview_ms_by_policy: previewByPolicy,
      view_details_ms_by_policy: viewDetailsByPolicy,
      option_effects: effects,
      best_option: bestOption,
      best_delta: bestDelta,
      enacted_delta: enactedDelta,
      enacted_rank: enactedRank,
      picked_best: enactedRank === null ? null : enactedRank === 1,
      chart_bin_hovers: chartHovers,
    };
  });
}

/** Context every event already carries – left out of timeline payloads. */
const CONTEXT_KEYS = new Set(["cycle", "level_id", "attempt_number"]);
/** Never part of a timeline (the summary itself / too fine-grained). */
const NOT_IN_TIMELINE = new Set(["cycle_summary"]);

function compactPayload(e: LoggedEvent): Record<string, unknown> | null {
  if (!e.payload) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(e.payload)) {
    if (CONTEXT_KEYS.has(k)) continue;
    if (k === "turn" && v === e.turn) continue;
    out[k] = v;
  }
  return Object.keys(out).length ? out : null;
}

/** "Benthamite_won", "Rawlsian_fail"; plus "_replayed" when they won but chose
 * Restart Term, "_moved_on" when they lost a third time and went on anyway, and
 * "_incomplete" for a term still in progress / abandoned. */
function pathLabel(level: string | undefined, won: boolean | null, exit: string | null): string {
  const base = `${level ?? "?"}_${won === null ? "incomplete" : won ? "won" : "fail"}`;
  if (won === true && exit === "restart") return `${base}_replayed`;
  if (won === false && (exit === "next_term" || exit === "finish_game")) return `${base}_moved_on`;
  return base;
}

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

function mean(xs: number[]): number | null {
  return xs.length ? Math.round(sum(xs) / xs.length) : null;
}

/** Times and interactions on each screen of the term, flattened for the CSV.
 * Times are ms; *_at are ms since the attempt started. */
function buildScreens(events: LoggedEvent[], t0: number): Record<string, number | string | boolean | null> {
  const all = (name: string) => events.filter((e) => e.event === name);
  const first = (name: string) => findFirst(events, name);
  const last = (name: string) => findLast(events, name);
  const at = (e?: LoggedEvent) => (e ? e.ts - t0 : null);
  const p = (e: LoggedEvent | undefined, k: string) => (e?.payload?.[k] as number | string | boolean | undefined) ?? null;

  // Election stages: time on each (summed over visits, via Back) and time
  // between the Continue button unlocking and the click.
  const nav = all("election_stage_navigated");
  const exit = last("election_exit_clicked");
  const stageMs = (stage: string) => {
    const xs = nav.filter((e) => e.payload?.from_stage === stage).map((e) => num(e.payload?.ms_on_stage) ?? 0);
    if (stage === "electorate_feedback" && exit) xs.push(num(exit.payload?.ms_on_stage) ?? 0);
    return xs.length ? sum(xs) : null;
  };
  const afterUnlock = (stage: string) => {
    const e = stage === "electorate_feedback" ? exit : nav.find((n) => n.payload?.from_stage === stage && n.payload?.direction === "continue");
    return num(e?.payload?.ms_after_unlock);
  };

  // Term summary timeline: how long it actually played (start -> pause/complete).
  let playMs = 0;
  let playingSince: number | null = null;
  for (const e of events) {
    if (e.event === "term_summary_timeline_started") playingSince = e.ts;
    else if ((e.event === "term_summary_timeline_paused" || e.event === "term_summary_timeline_completed") && playingSince !== null) {
      playMs += e.ts - playingSince;
      playingSince = null;
    }
  }

  const briefingOpened = first("briefing_opened");
  const briefingSkip = first("briefing_text_skipped");
  const briefingProceeded = first("briefing_proceeded");
  const q1 = first("press_q1_answered");
  const q2 = first("press_q2_answered");
  const reveals = all("academic_debrief_revealed");
  const academicContinue = last("academic_debrief_continue_clicked");
  const feedbackPolicies = all("electorate_feedback_policy_clicked").map((e) => String(e.payload?.policy_id));

  return {
    briefing_opened_at: at(briefingOpened),
    briefing_is_retry: p(briefingOpened, "is_retry"),
    briefing_envelope_opened_ms: briefingOpened && first("briefing_envelope_opened") ? first("briefing_envelope_opened")!.ts - briefingOpened.ts : null,
    briefing_text_skipped: !!briefingSkip,
    briefing_skip_pct_seen: p(briefingSkip, "pct_seen"),
    briefing_skip_elapsed_ms: p(briefingSkip, "elapsed_ms"),
    briefing_metric_definition_clicks: all("briefing_metric_definition_clicked").length,
    briefing_used_skip_button: p(briefingProceeded, "used_skip_button"),
    briefing_reading_ms: p(briefingProceeded, "dwell_ms"),
    briefing_total_ms: briefingOpened && briefingProceeded ? briefingProceeded.ts - briefingOpened.ts : null,

    after_final_turn_ms: p(first("hold_press_conference_clicked"), "time_after_turn5_ms"),

    press_started_at: at(first("press_conference_started")),
    press_approval_at_start: p(first("press_conference_started"), "approval_rating"),
    press_q1_answer: p(q1, "answer_given"),
    press_q1_correct: p(q1, "correct"),
    press_q1_time_ms: p(q1, "time_to_answer_ms"),
    press_q1_text_skipped: p(q1, "text_was_skipped"),
    press_q2_answer: p(q2, "answer_given"),
    press_q2_correct: p(q2, "correct"),
    press_q2_time_ms: p(q2, "time_to_answer_ms"),
    press_q2_text_skipped: p(q2, "text_was_skipped"),
    press_q2_picked_unenacted: p(q2, "picked_unenacted_policy"),
    press_ms: stageMs("press_conference"),

    term_summary_ms: stageMs("term_summary") ?? p(last("term_summary_closed"), "dwell_ms"),
    term_summary_definition_clicks: all("term_summary_definition_clicked").length,
    term_summary_timeline_plays: all("term_summary_timeline_started").length,
    term_summary_timeline_pauses: all("term_summary_timeline_paused").length,
    term_summary_timeline_jumps: all("term_summary_timeline_jumped").length,
    term_summary_timeline_completed: !!first("term_summary_timeline_completed"),
    term_summary_timeline_play_ms: playMs,
    term_summary_continue_after_unlock_ms: afterUnlock("term_summary"),

    verdict_ms: stageMs("verdict"),
    verdict_continue_after_reveal_ms: afterUnlock("verdict"),
    verdict_celebrate_clicks: all("verdict_celebrate_clicked").length,

    wellbeing_ms: stageMs("wellbeing_changes") ?? p(last("wellbeing_changes_closed"), "dwell_ms"),
    wellbeing_definition_clicks: all("wellbeing_note_clicked").length,
    wellbeing_continue_after_unlock_ms: afterUnlock("wellbeing_changes"),

    electorate_feedback_ms: stageMs("electorate_feedback") ?? p(last("electorate_feedback_closed"), "dwell_ms"),
    electorate_policies_clicked: feedbackPolicies.length,
    electorate_policies_clicked_ids: feedbackPolicies.join(" "),
    election_back_clicks: nav.filter((e) => e.payload?.direction === "back").length,
    election_exit_action: p(exit, "action"),

    academic_debrief_ms: p(academicContinue, "dwell_ms") ?? p(last("academic_debrief_closed"), "dwell_ms"),
    academic_debrief_reveals: reveals.length,
    academic_guess: p(first("academic_debrief_guess"), "guess"),
    academic_guess_correct: p(first("academic_debrief_guess"), "correct"),
    academic_first_reveal_ms: p(first("academic_debrief_first_interaction"), "time_to_first_ms"),
    academic_continue_after_last_reveal_ms: p(academicContinue, "ms_after_last_reveal"),
    academic_continue_after_unlock_ms: p(academicContinue, "ms_after_unlock"),
  };
}

export function buildCycleSummary(attemptId: string, outcome?: CycleSummary["outcome"]): CycleSummary | null {
  const events = getTimelineForAttempt(attemptId).filter((e) => e.layer !== "raw" && !NOT_IN_TIMELINE.has(e.event));
  if (events.length === 0) return null;

  const first = events[0];

  const turnStarted = events.filter((e) => e.event === "turn_started");
  const turnCompleted = events.filter((e) => e.event === "turn_completed");

  const verdict = findFirst(events, "verdict_shown");
  const startingScore = num(turnStarted[0]?.payload?.score);
  const finalScore = num(turnCompleted[turnCompleted.length - 1]?.payload?.score);

  const electorateFeedback = findLast(events, "electorate_feedback_closed");
  const q1 = findFirst(events, "press_q1_answered");
  const q2 = findFirst(events, "press_q2_answered");
  const academicFirstInteraction = findFirst(events, "academic_debrief_first_interaction");
  const enactedReviewed = findFirst(events, "enacted_policies_reviewed");

  const voterQuotesClicked = num(electorateFeedback?.payload?.policies_clicked) ?? 0;

  const turns = buildTurnSummaries(events);
  const screens = buildScreens(events, first.ts);
  const ended = findLast(events, "cycle_ended");
  const won = ended && typeof ended.payload?.won === "boolean" ? (ended.payload.won as boolean) : verdict ? !!verdict.payload?.won : null;
  const rated = turns.filter((t) => t.enacted_rank !== null);
  const withPick = turns.filter((t) => t.enacted_was_first_pick !== null);
  const historyHovers = events.filter((e) => e.event === "enacted_policy_hovered");
  const lastTurnTs = turnCompleted.length ? turnCompleted[turnCompleted.length - 1].ts : null;
  const hoverByPolicy = new Map<string, number>();
  for (const e of historyHovers) {
    const id = String(e.payload?.policy_id ?? "?");
    hoverByPolicy.set(id, (hoverByPolicy.get(id) ?? 0) + (num(e.payload?.dwell_ms) ?? 0));
  }
  const totalOptions = turns.reduce((sum, t) => sum + t.options_available.length, 0);
  const totalPreviewed = turns.reduce((sum, t) => sum + t.options_previewed.length, 0);
  const totalViewDetails = turns.reduce((sum, t) => sum + t.options_view_details_opened.length, 0);

  return {
    cycle: first.level_id,
    attempt_id: attemptId,
    attempt_number: first.attempt_number,

    player_won: verdict ? !!verdict.payload?.won : null,
    outcome: outcome ?? null,

    starting_score: startingScore,
    final_score: finalScore,
    score_delta: startingScore !== null && finalScore !== null ? finalScore - startingScore : null,
    turns_played: turnCompleted.length,

    // Whole time on each screen (until its Continue was clicked, incl. visits via Back).
    time_on_briefing_ms: num(screens.briefing_total_ms),
    time_on_term_summary_ms: num(screens.term_summary_ms),
    time_on_verdict_ms: num(screens.verdict_ms),
    time_on_wellbeing_changes_ms: num(screens.wellbeing_ms),
    time_on_electorate_feedback_ms: num(screens.electorate_feedback_ms),
    time_on_academic_debrief_ms: num(screens.academic_debrief_ms),

    voter_quotes_clicked: voterQuotesClicked,
    player_viewed_enacted_history: !!enactedReviewed || historyHovers.length > 0,
    player_viewed_animated_histogram: !!academicFirstInteraction,

    press_conf_q1_correct: q1 ? !!q1.payload?.correct : null,
    press_conf_q2_correct: q2 ? !!q2.payload?.correct : null,
    press_conf_non_chosen_policy_chosen: q2 ? !!q2.payload?.picked_unenacted_policy : null,

    turns,
    pct_policy_options_previewed: totalOptions > 0 ? Math.round((totalPreviewed / totalOptions) * 100) : null,
    pct_policy_options_view_details_opened: totalOptions > 0 ? Math.round((totalViewDetails / totalOptions) * 100) : null,

    total_cycle_duration_ms: events[events.length - 1].ts - first.ts,
    refreshes: events.filter((e) => e.event === "session_resumed").length,

    complete: !!ended,
    started_at: first.ts,
    ended_at: events[events.length - 1].ts,
    won,
    exit: (ended?.payload?.exit as string | undefined) ?? (findLast(events, "election_exit_clicked")?.payload?.action as string | undefined) ?? null,
    path_label: pathLabel(first.level_id, won, (ended?.payload?.exit as string | undefined) ?? null),

    approval_start: num(turnStarted[0]?.payload?.approval),
    approval_final: num(ended?.payload?.approval) ?? num(verdict?.payload?.approval_rating),
    target_score: num(turnStarted[0]?.payload?.target_score),
    max_score: num(turnStarted[0]?.payload?.max_score),
    win_scalar: num(turnStarted[0]?.payload?.win_scalar),

    screens,

    avg_preview_ms: mean(turns.flatMap((t) => t.preview_durations_ms)),
    avg_view_details_ms: mean(turns.flatMap((t) => t.view_details_durations_ms)),
    pct_turns_picked_best: rated.length ? Math.round((rated.filter((t) => t.picked_best).length / rated.length) * 100) : null,
    pct_turns_enacted_first_pick: withPick.length ? Math.round((withPick.filter((t) => t.enacted_was_first_pick).length / withPick.length) * 100) : null,
    mean_enacted_rank: rated.length ? Math.round((sum(rated.map((t) => t.enacted_rank!)) / rated.length) * 100) / 100 : null,
    chart_bin_hovers: events.filter((e) => e.event === "chart_bin_hovered").length,
    enacted_history_hovers: historyHovers.length,
    enacted_history_hover_ms: sum(historyHovers.map((e) => num(e.payload?.dwell_ms) ?? 0)),
    enacted_history_hovers_after_final_turn: lastTurnTs === null ? 0 : historyHovers.filter((e) => e.ts > lastTurnTs).length,
    enacted_history_hovered: [...hoverByPolicy.entries()],

    timeline: events.map((e) => [e.ts - first.ts, e.event, e.turn ?? null, compactPayload(e)]),
  };
}