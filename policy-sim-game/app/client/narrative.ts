import type { LoggedEvent } from "./telemetry";
import type { CycleSummary } from "./cycleSummary";

// ---------------------------------------------------------------------------
// Narrative timeline formatting.
//
// Two jobs:
//   1. groupTimeline() — chops the full chronological log into readable
//      sections: Intro, Level Select, Cycle X — Attempt N, Cycle X —
//      Attempt N+1 (if they failed and retried), etc.
//   2. formatLine() — turns one LoggedEvent into a human sentence, or
//      returns null if it shouldn't show in the narrative view at all
//      (raw_* / derived_* noise, internal bookkeeping events).
//
// This is presentation-only — it doesn't change what's captured, just how
// TelemetryDevPanel (and, if you want later, the JSON export) reads back.
// ---------------------------------------------------------------------------

export interface TimelineGroup {
  key: string;
  label: string;
  events: LoggedEvent[];
}

export function groupTimeline(log: LoggedEvent[]): TimelineGroup[] {
  const sorted = [...log].sort((a, b) => a.ts - b.ts);
  const groups: TimelineGroup[] = [];
  let current: TimelineGroup | null = null;
  let levelSelectVisits = 0;

  for (const e of sorted) {
    // hide raw/derived noise from grouping decisions entirely except
    // cycle_summary, which belongs inside the attempt group it summarizes
    if (e.layer === "raw") continue;
    if (e.layer === "derived" && e.event !== "cycle_summary") continue;

    let bucketKey: string;
    let bucketLabel: string;

    if (e.attempt_id) {
      bucketKey = `attempt:${e.attempt_id}`;
      bucketLabel = `${e.level_id ?? "Unknown Cycle"} — Attempt #${e.attempt_number ?? "?"}`;
    } else if (e.event.startsWith("level_select_") || e.event.startsWith("utility_")) {
      // starting a *new* level-select visit only if we're not already in one
      if (!current || !current.key.startsWith("levelselect")) {
        levelSelectVisits += 1;
      }
      bucketKey = `levelselect:${levelSelectVisits}`;
      bucketLabel = "Level Select";
    } else {
      bucketKey = "intro";
      bucketLabel = "Intro / Welcome";
    }

    if (!current || current.key !== bucketKey) {
      current = { key: bucketKey, label: bucketLabel, events: [] };
      groups.push(current);
    }
    current.events.push(e);
  }

  return groups;
}

// ---------------------------------------------------------------------------
// Line formatting
// ---------------------------------------------------------------------------

export interface NarrativeLine {
  ts: number;
  text: string;
  /** minor lines render indented/parenthesized under the main flow */
  minor: boolean;
  /** cycle_summary gets its own block styling rather than a plain line */
  isSummaryBlock?: boolean;
  summary?: CycleSummary;
}

function fmtDur(ms: unknown): string {
  if (typeof ms !== "number" || Number.isNaN(ms)) return "";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}

function fmtScore(n: unknown): string {
  // Matches the in-game score display (DPMCard, UtilityTable, etc all use
  // .toFixed(2)) - telemetry was previously rounding to 1dp here, which
  // made turn-to-turn score deltas look coarser/less precise than what the
  // player actually sees on screen.
  return typeof n === "number" ? n.toFixed(2) : "?";
}

function fmtPct(n: unknown): string {
  // Approval rating is a %, shown in-game to 1dp (with the "100.0"->"100"
  // special case) - kept separate from fmtScore since it's a different
  // unit/precision than the raw metric score.
  if (typeof n !== "number") return "?";
  const s = n.toFixed(1);
  return s === "100.0" ? "100" : s;
}

function humanize(eventName: string): string {
  return eventName
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Events that should never show in the narrative view (still visible in
// the Grouped tab, since they're part of the full log).
const HIDDEN_EVENTS = new Set([
  "policy_options_presented",
  "level_attempt_started",
  "session_started",
  "session_ended",
]);

// Events that render as a small indented/parenthetical sub-line rather than
// a main timeline entry.
const MINOR_EVENTS = new Set([
  "intro_text_skipped",
  "briefing_metric_definition_clicked",
  "briefing_text_skipped",
  "level_select_history_explored",
  "view_details_opened",
  "graph_hovered",
  "policy_impact_popup_interacted",
  "term_summary_timeline_started",
  "term_summary_timeline_jumped",
  "term_summary_timeline_completed",
  "verdict_celebrate_clicked",
  "wellbeing_note_clicked",
  "academic_debrief_first_interaction",
  "utility_scenario_answered",
  "utility_maths_seen",
  "utility_graph_animation_awaited",
  "utility_table_help_clicked",
]);

/**
 * Formats a single event as a narrative line, given the running context
 * needed for cross-event computations (e.g. turn score deltas).
 * `ctx.turnStartScore` should be a mutable map you keep per-group and pass
 * back in on every call (see TimelineView for the reduce loop).
 */
export function formatLine(
  e: LoggedEvent,
  ctx: { turnStartScoreByTurn: Map<number, number> }
): NarrativeLine | null {
  if (HIDDEN_EVENTS.has(e.event)) return null;

  const minor = MINOR_EVENTS.has(e.event);
  const p = e.payload ?? {};

  switch (e.event) {
    // ---- Intro ----
    case "intro_opened":
      return { ts: e.ts, text: "Welcome Modal Started", minor };
    case "intro_envelope_opened":
      return { ts: e.ts, text: "Welcome Message Opened", minor: true };
    case "intro_text_skipped":
      return { ts: e.ts, text: "Welcome Modal Skipped Typing", minor };
    case "intro_proceeded":
      return { ts: e.ts, text: `Welcome Modal Proceeded (${fmtDur(p.dwell_ms)})`, minor };

    // ---- Level select ----
    case "level_select_viewed":
      return { ts: e.ts, text: "Level Select Screen Loaded", minor };
    case "level_select_continue_clicked":
      return { ts: e.ts, text: `Level Selected — ${p.level_id ?? "?"}`, minor };
    case "level_select_history_explored":
      return { ts: e.ts, text: `Viewed Previous Cycle Graph (lens: ${p.lens_cycle})`, minor };

    // ---- Briefing ----
    case "briefing_opened":
      return { ts: e.ts, text: "New Term Commencing Modal Shown", minor };
    case "briefing_envelope_opened":
      return { ts: e.ts, text: "Briefing Opened", minor: true };
    case "briefing_metric_definition_clicked":
      return { ts: e.ts, text: "Metric Definition Opened", minor };
    case "briefing_text_skipped":
      return { ts: e.ts, text: "Briefing Skipped Typing", minor };
    case "briefing_proceeded":
      return { ts: e.ts, text: `Mandate Accepted — Term Begun (${fmtDur(p.dwell_ms)})`, minor };

    // ---- Turns ----
    case "turn_started":
      if (typeof e.turn === "number" && typeof p.score === "number") {
        ctx.turnStartScoreByTurn.set(e.turn, p.score as number);
      }
      return { ts: e.ts, text: `── Turn ${e.turn} Start — Score: ${fmtScore(p.score)} ──`, minor: false };
    case "policy_card_selected":
      return {
        ts: e.ts,
        text: p.action === "picked" ? `Policy "${p.policy_id}" Picked` : `Policy "${p.policy_id}" Deselected`,
        minor: true,
      };
    case "policy_selected":
      return { ts: e.ts, text: `Policy "${p.policy_id}" Enacted`, minor };
    case "view_details_closed":
      return { ts: e.ts, text: `Policy "${p.policy_id}" Details Viewed (${fmtDur(p.dwell_ms)})`, minor: true };
    case "graph_hovered":
      return { ts: e.ts, text: "Graph Hovered", minor };
    case "policy_impact_popup_interacted":
      return {
        ts: e.ts,
        text: `Policy Impact Popup ${p.interaction_type === "click" ? "Clicked" : "Hovered"}`,
        minor,
      };
    case "turn_completed": {
      const startScore = typeof e.turn === "number" ? ctx.turnStartScoreByTurn.get(e.turn) : undefined;
      const endScore = p.score as number | undefined;
      let arrow = "";
      if (typeof startScore === "number" && typeof endScore === "number") {
        const delta = endScore - startScore;
        arrow = delta === 0 ? " (–)" : delta > 0 ? ` (▲${delta.toFixed(2)})` : ` (▼${Math.abs(delta).toFixed(2)})`;
      }
      return {
        ts: e.ts,
        text: `Turn ${e.turn} Enacted — Score: ${fmtScore(p.score)}${arrow} · Time on turn: ${fmtDur(p.time_on_turn_ms)}`,
        minor: false,
      };
    }
    case "enacted_policies_reviewed":
      return {
        ts: e.ts,
        text: `Reviewed Enacted Policies (${p.policies_viewed}) — ${fmtDur(p.dwell_ms)}`,
        minor: true,
      };
    case "hold_press_conference_clicked":
      return { ts: e.ts, text: `Held Press Conference (${fmtDur(p.time_after_turn5_ms)} after Turn 5)`, minor: false };

    // ---- Press conference ----
    case "press_conference_started":
      return { ts: e.ts, text: "Press Conference Started", minor: false };
    case "press_q1_answered":
      return {
        ts: e.ts,
        text: `Q1 Answered — ${p.correct ? "Correct" : "Incorrect"} (${fmtDur(p.time_to_answer_ms)}${p.text_was_skipped ? ", skipped text" : ""})`,
        minor: false,
      };
    case "press_q2_answered":
      return {
        ts: e.ts,
        text: `Q2 Answered — ${p.correct ? "Correct" : "Incorrect"}${p.picked_unenacted_policy ? " (chose an un-enacted policy)" : ""} (${fmtDur(p.time_to_answer_ms)})`,
        minor: false,
      };
    case "press_conference_completed":
      return { ts: e.ts, text: `Press Conference Completed — ${p.correct_count} correct`, minor: false };

    // ---- Term summary ----
    case "term_summary_opened":
      return { ts: e.ts, text: "Term Summary Shown", minor: false };
    case "term_summary_timeline_started":
      return { ts: e.ts, text: "Term Summary Timeline Played", minor };
    case "term_summary_timeline_jumped":
      return { ts: e.ts, text: `Term Summary Jumped to Turn ${p.to_turn}`, minor };
    case "term_summary_closed":
      return { ts: e.ts, text: `Term Summary Closed (${fmtDur(p.dwell_ms)})`, minor: false };

    // ---- Verdict ----
    case "verdict_shown":
      return { ts: e.ts, text: `Verdict Shown — ${p.won ? "WON" : "LOST"} (${fmtPct(p.approval_rating)}%)`, minor: false };
    case "verdict_celebrate_clicked":
      return { ts: e.ts, text: "Clicked Celebrate", minor };
    case "verdict_dwell":
      return { ts: e.ts, text: `Verdict Viewed (${fmtDur(p.dwell_ms)})`, minor: false };

    // ---- Wellbeing changes ----
    case "wellbeing_changes_opened":
      return { ts: e.ts, text: "Wellbeing Changes Shown", minor: false };
    case "wellbeing_note_clicked":
      return { ts: e.ts, text: "Wellbeing Note Clicked", minor };
    case "wellbeing_changes_closed":
      return { ts: e.ts, text: `Wellbeing Changes Closed (${fmtDur(p.dwell_ms)})`, minor: false };

    // ---- Electorate feedback ----
    case "electorate_feedback_opened":
      return { ts: e.ts, text: "Electorate Feedback Shown", minor: false };
    case "electorate_feedback_closed":
      return {
        ts: e.ts,
        text: `Electorate Feedback Closed (${fmtDur(p.dwell_ms)}, ${p.policies_clicked} policies clicked)`,
        minor: false,
      };

    // ---- Academic debrief ----
    case "academic_debrief_opened":
      return { ts: e.ts, text: "Academic Debrief Shown", minor: false };
    case "academic_debrief_first_interaction":
      return { ts: e.ts, text: `First Reveal Clicked (${fmtDur(p.time_to_first_ms)} in)`, minor: true };
    case "academic_debrief_closed":
      return {
        ts: e.ts,
        text: `Academic Debrief Closed (${fmtDur(p.dwell_ms)}, idle ${fmtDur(p.idle_before_proceed_ms)} before proceeding)`,
        minor: false,
      };

    // ---- Cycle lifecycle ----
    case "cycle_ended":
      return {
        ts: e.ts,
        text: `Cycle Ended — ${p.outcome === "won" ? "Won, proceeded" : p.outcome === "lost_final" ? "Lost, out of retries" : "Lost, restarting"}`,
        minor: false,
      };
    case "cycle_summary":
      return { ts: e.ts, text: "", minor: false, isSummaryBlock: true, summary: e.payload as unknown as CycleSummary };

    // ---- Utility intervention ----
    case "utility_intervention_opened":
      return { ts: e.ts, text: "Utility Intervention Started", minor: false };
    case "utility_scenario_answered":
      return { ts: e.ts, text: `Scenario ${p.scenario_index} Answered — ${p.answer_given} (${fmtDur(p.time_to_answer_ms)})`, minor };
    case "utility_resume_clicked":
      return { ts: e.ts, text: "Resumed Simulation", minor: false };
    case "utility_intervention_completed":
      return { ts: e.ts, text: `Utility Intervention Completed (${fmtDur(p.dwell_ms)})`, minor: false };

    // ---- Final debrief / postgame ----
    case "final_debrief_opened":
      return { ts: e.ts, text: "Final Debrief Opened", minor: false };
    case "final_debrief_celebrate_clicked":
      return { ts: e.ts, text: "Clicked Celebrate (Final Debrief)", minor };
    case "final_debrief_submitted":
      return { ts: e.ts, text: `Final Debrief Submitted — "${p.best_metric}" / "${p.best_society}"`, minor: false };
    case "postgame_finish_clicked":
      return { ts: e.ts, text: `Finish Game Clicked (${fmtDur(p.time_after_level4_ms)} after final level)`, minor: false };
    case "postgame_replay_clicked":
      return { ts: e.ts, text: "Replay Clicked", minor: false };

    // ---- Level lifecycle ----
    case "level_completed":
      return { ts: e.ts, text: `Level Completed — ${p.outcome} (${p.turns_taken} turns, final score ${fmtScore(p.final_score)})`, minor: false };
    case "level_attempt_ended":
      return { ts: e.ts, text: `Attempt Ended — ${p.outcome}`, minor: false };

    default:
      // Fallback for anything not explicitly mapped yet — still readable,
      // just not hand-tuned. Better than silently dropping new events.
      return { ts: e.ts, text: humanize(e.event), minor: false };
  }
}