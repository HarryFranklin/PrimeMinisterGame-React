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
  /** turn number -> ms spent on that turn (kept for backwards compat - see
   * `turns` below for the fuller per-turn breakdown) */
  time_on_turn: Record<number, number>;

  time_on_briefing_ms: number | null;
  time_on_term_summary_ms: number | null;
  time_on_verdict_ms: number | null;
  time_on_wellbeing_changes_ms: number | null;
  time_on_electorate_feedback_ms: number | null;
  time_on_academic_debrief_ms: number | null;

  player_viewed_voter_quotes: boolean;
  voter_quotes_clicked: number;
  player_viewed_enacted_history: boolean;
  player_viewed_animated_histogram: boolean;

  press_conf_q1_correct: boolean | null;
  press_conf_q2_correct: boolean | null;
  press_conf_non_chosen_policy_chosen: boolean | null;
  /** out of 2 - null if the press conference never happened this attempt */
  press_conference_correct_count: number | null;
  press_conference_score_pct: number | null;

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

    const previewed = new Set<string>();
    const viewDetailsOpened = new Set<string>();
    for (const e of events) {
      if (e.turn !== turn) continue;
      if (e.event === "policy_card_selected" && e.payload?.action === "picked" && typeof e.payload?.policy_id === "string") {
        previewed.add(e.payload.policy_id as string);
      }
      if (e.event === "view_details_opened" && typeof e.payload?.policy_id === "string") {
        viewDetailsOpened.add(e.payload.policy_id as string);
      }
    }

    const scoreStart = num(started?.payload?.score);
    const scoreEnd = num(completed?.payload?.score);

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
    };
  });
}

export function buildCycleSummary(attemptId: string, outcome?: CycleSummary["outcome"]): CycleSummary | null {
  const events = getTimelineForAttempt(attemptId);
  if (events.length === 0) return null;

  const first = events[0];

  const turnStarted = events.filter((e) => e.event === "turn_started");
  const turnCompleted = events.filter((e) => e.event === "turn_completed");

  const timeOnTurn: Record<number, number> = {};
  for (const e of turnCompleted) {
    const ms = num(e.payload?.time_on_turn_ms);
    if (e.turn !== undefined && ms !== null) timeOnTurn[e.turn] = ms;
  }

  const verdict = findFirst(events, "verdict_shown");
  const startingScore = num(turnStarted[0]?.payload?.score);
  const finalScore = num(turnCompleted[turnCompleted.length - 1]?.payload?.score);

  const electorateFeedback = findFirst(events, "electorate_feedback_closed");
  const q1 = findFirst(events, "press_q1_answered");
  const q2 = findFirst(events, "press_q2_answered");
  const pressCompleted = findFirst(events, "press_conference_completed");
  const academicFirstInteraction = findFirst(events, "academic_debrief_first_interaction");
  const enactedReviewed = findFirst(events, "enacted_policies_reviewed");

  const voterQuotesClicked = num(electorateFeedback?.payload?.policies_clicked) ?? 0;

  const turns = buildTurnSummaries(events);
  const totalOptions = turns.reduce((sum, t) => sum + t.options_available.length, 0);
  const totalPreviewed = turns.reduce((sum, t) => sum + t.options_previewed.length, 0);
  const totalViewDetails = turns.reduce((sum, t) => sum + t.options_view_details_opened.length, 0);

  const pressCorrectCount = num(pressCompleted?.payload?.correct_count);

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
    time_on_turn: timeOnTurn,

    time_on_briefing_ms: num(findFirst(events, "briefing_proceeded")?.payload?.dwell_ms),
    time_on_term_summary_ms: num(findFirst(events, "term_summary_closed")?.payload?.dwell_ms),
    time_on_verdict_ms: num(findFirst(events, "verdict_dwell")?.payload?.dwell_ms),
    time_on_wellbeing_changes_ms: num(findFirst(events, "wellbeing_changes_closed")?.payload?.dwell_ms),
    time_on_electorate_feedback_ms: num(electorateFeedback?.payload?.dwell_ms),
    time_on_academic_debrief_ms: num(findFirst(events, "academic_debrief_closed")?.payload?.dwell_ms),

    player_viewed_voter_quotes: voterQuotesClicked > 0,
    voter_quotes_clicked: voterQuotesClicked,
    player_viewed_enacted_history: !!enactedReviewed,
    player_viewed_animated_histogram: !!academicFirstInteraction,

    press_conf_q1_correct: q1 ? !!q1.payload?.correct : null,
    press_conf_q2_correct: q2 ? !!q2.payload?.correct : null,
    press_conf_non_chosen_policy_chosen: q2 ? !!q2.payload?.picked_unenacted_policy : null,
    press_conference_correct_count: pressCorrectCount,
    // there are always exactly 2 press conference questions (q1 + q2) -
    // hardcoded rather than counting q1/q2 events so a partially-answered
    // (abandoned) press conference doesn't inflate the %.
    press_conference_score_pct: pressCorrectCount !== null ? Math.round((pressCorrectCount / 2) * 100) : null,

    turns,
    pct_policy_options_previewed: totalOptions > 0 ? Math.round((totalPreviewed / totalOptions) * 100) : null,
    pct_policy_options_view_details_opened: totalOptions > 0 ? Math.round((totalViewDetails / totalOptions) * 100) : null,

    total_cycle_duration_ms: events[events.length - 1].ts - first.ts,
  };
}