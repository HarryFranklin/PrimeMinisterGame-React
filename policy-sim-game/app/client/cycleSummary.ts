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
  /** turn number -> ms spent on that turn */
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
  const academicFirstInteraction = findFirst(events, "academic_debrief_first_interaction");
  const enactedReviewed = findFirst(events, "enacted_policies_reviewed");

  const voterQuotesClicked = num(electorateFeedback?.payload?.policies_clicked) ?? 0;

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

    total_cycle_duration_ms: events[events.length - 1].ts - first.ts,
  };
}