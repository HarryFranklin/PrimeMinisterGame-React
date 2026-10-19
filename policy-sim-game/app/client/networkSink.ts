// app/client/networkSink.ts
// Turns the game's telemetry into the participant's `activity` record, saved
// by the shared study code (@study → study-worker /sync, one row per sync).
// Raw/derived events never leave the device – each attempt's cycle_summary
// already rolls them up (see derive.ts / cycleSummary.ts).
//
// activity = {
//   v: 1,
//   setup:       { difficulty_seed, win_threshold_scalars }
//   ls:          life_satisfaction_submitted payload (LS intro screen)
//   elicitation: { social: …, personal: … }   elicitation_completed payloads
//   attempts:    [cycle_summary, …]            one per term attempt, incl. turns
//   last:        last semantic event (where people stopped)
//   final:       { outcome, dwell_ms, ts }     final debrief closed
// }

import type { LoggedEvent } from "./telemetry";
import { setActivity, syncStudy, getStudyState } from "@study";

interface GameActivity {
  v: 1;
  setup: Record<string, unknown> | null;
  ls: Record<string, unknown> | null;
  elicitation: Record<string, unknown>;
  attempts: Record<string, unknown>[];
  last: Record<string, unknown> | null;
  final: Record<string, unknown> | null;
}

let activity: GameActivity | null = null;

/** The record so far – restored from the saved study state after a refresh. */
function current(): GameActivity {
  if (!activity) {
    const saved = getStudyState().cells.activity as Partial<GameActivity> | undefined;
    activity = {
      v: 1,
      setup: saved?.setup ?? null,
      ls: saved?.ls ?? null,
      elicitation: saved?.elicitation ?? {},
      attempts: saved?.attempts ?? [],
      last: saved?.last ?? null,
      final: saved?.final ?? null,
    };
  }
  return activity;
}

function save(sync: boolean, beacon = false) {
  const { v, setup, ls, elicitation, attempts, last, final } = current();
  setActivity({ v, setup, ls, elicitation, attempts, last, final }, { sync, beacon });
}

/** Pass this to registerSink() in telemetry.ts. */
export function networkSink(entry: LoggedEvent) {
  if (entry.layer !== "semantic") return;
  const a = current();

  // Kept in memory only; saved with the next sync (or on tab hide).
  a.last = {
    event: entry.event,
    level_id: entry.level_id ?? null,
    attempt_number: entry.attempt_number ?? null,
    turn: entry.turn ?? null,
    ts: entry.ts,
  };

  switch (entry.event) {
    case "setup_submitted":
      a.setup = {
        difficulty_seed: entry.payload?.difficulty_seed ?? null,
        win_threshold_scalars: entry.payload?.win_threshold_scalars ?? null,
      };
      save(true);
      break;
    case "life_satisfaction_submitted":
      a.ls = { ...entry.payload, ts: entry.ts };
      save(true);
      break;
    case "elicitation_completed": {
      const block = (entry.payload?.block as string) ?? "all";
      a.elicitation = { ...a.elicitation, [block]: { ...entry.payload, ts: entry.ts } };
      save(true);
      break;
    }
    case "cycle_summary": {
      const summary: Record<string, unknown> = { ...entry.payload, app_version: entry.app_version ?? null };
      const id = summary.attempt_id;
      // Replace if this attempt was already saved (e.g. resent), else append.
      a.attempts = [...a.attempts.filter((x) => !id || x.attempt_id !== id), summary];
      save(true);
      break;
    }
    case "final_debrief_closed":
      a.final = { outcome: entry.payload?.outcome ?? null, dwell_ms: entry.payload?.dwell_ms ?? null, ts: entry.ts };
      save(true);
      break;
  }
}

/** Kept for call-site compatibility with page.tsx's unload listener. */
export function flushOnExit() {}

/** Tab hidden/closed: save the last position so we know where people stopped. */
export function pingProgress() {
  if (!activity) return;
  save(false);
  syncStudy({ beacon: true });
}
