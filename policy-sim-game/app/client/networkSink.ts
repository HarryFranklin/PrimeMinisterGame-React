// app/client/networkSink.ts
// Turns the game's telemetry into the participant's `activity` record, saved
// by the shared study code (@study → study-worker /sync, one row per sync).
// Raw sensor events (mouse moves etc.) never leave the device.
//
// activity = {
//   v: 2,
//   setup:        { difficulty_seed, win_threshold_scalars, difficulty: { <term>: { scalar,
//                   simulated_win_rate, max_score, threshold, walks } } }
//   ls:           life_satisfaction_submitted payload (LS intro screen)
//   elicitation:  { social: …, personal: … }   elicitation_completed payloads
//   attempts:     [cycle_summary, …]   one per finished term attempt: outcome, per-turn
//                 breakdown, per-screen timings, and its full action timeline
//   open_attempt: the term attempt in progress (snapshot after every turn) or null –
//                 shows how far someone got if they stop part-way through a term
//   path:         ["Benthamite_won", "Rawlsian_fail", "Rawlsian_won", …]
//   session:      [[ts, event, payload], …]  every deliberate action OUTSIDE a term
//                 attempt (intro, level select, LS screen, elicitation, final debrief)
//   loads:        [[ts, session_id, app_version], …]  each page load / refresh
//   flow:         start and end of the game: loading_ms, title_ms (time on the start
//                 menu), about/options opens and ms, option choices, game_started_at,
//                 game_complete_ms (time on "Game complete!"), game_ended_at,
//                 fullscreen_ok (did Start game get fullscreen), fullscreen_exits,
//                 fullscreen_nudges ("Go full screen" clicks), fullscreen_ms (total time in fullscreen)
//   last:         last deliberate action (where people stopped)
//   final:        { dwell_ms, ts }   final debrief closed
// }

import type { LoggedEvent } from "./telemetry";
import { buildCycleSummary } from "./cycleSummary";
import { setActivity, syncStudy, getStudyState } from "@study";

type Json = Record<string, unknown>;

interface GameActivity {
  v: 2;
  setup: Json | null;
  ls: Json | null;
  elicitation: Json;
  attempts: Json[];
  open_attempt: Json | null;
  path: string[];
  session: [number, string, Json | null][];
  loads: [number, string, string][];
  flow: Json;
  last: Json | null;
  final: Json | null;
}

/** Keep the saved record well under the database's 2 MB row limit. */
const MAX_ACTIVITY_CHARS = 1_300_000;
const MAX_SESSION_EVENTS = 3000;

/** Session-level events worth an immediate save to the server. */
const SYNC_ON = new Set([
  "title_start_clicked",
  "intro_proceeded",
  "level_select_continue_clicked",
  "utility_intervention_completed",
  "elicitation_reveal_closed",
  "final_debrief_opened",
]);

let activity: GameActivity | null = null;

/** The record so far – restored from the saved study state after a refresh. */
function current(): GameActivity {
  if (!activity) {
    const saved = getStudyState().cells.activity as Partial<GameActivity> | undefined;
    activity = {
      v: 2,
      setup: saved?.setup ?? null,
      ls: saved?.ls ?? null,
      elicitation: saved?.elicitation ?? {},
      attempts: saved?.attempts ?? [],
      open_attempt: saved?.open_attempt ?? null,
      path: saved?.path ?? [],
      session: saved?.session ?? [],
      loads: saved?.loads ?? [],
      flow: saved?.flow ?? {},
      last: saved?.last ?? null,
      final: saved?.final ?? null,
    };
  }
  return activity;
}

function compact(entry: LoggedEvent): Json | null {
  if (!entry.payload) return null;
  const out: Json = { ...entry.payload };
  if (entry.level_id && !("level_id" in out)) out.level_id = entry.level_id;
  return Object.keys(out).length ? out : null;
}

/** If the record has grown too big, drop the action timelines of the oldest
 * finished attempts first (their summaries stay), then old session events. */
function shrinkIfNeeded(a: GameActivity) {
  let size = JSON.stringify(a).length;
  for (let i = 0; size > MAX_ACTIVITY_CHARS && i < a.attempts.length; i++) {
    if (a.attempts[i].timeline) {
      a.attempts[i] = { ...a.attempts[i], timeline: null, timeline_dropped: true };
      size = JSON.stringify(a).length;
    }
  }
  while (size > MAX_ACTIVITY_CHARS && a.session.length > 200) {
    a.session = a.session.slice(Math.floor(a.session.length / 4));
    size = JSON.stringify(a).length;
  }
}

function save(sync: boolean, beacon = false) {
  const a = current();
  a.path = a.attempts.map((x) => String(x.path_label ?? "?"));
  shrinkIfNeeded(a);
  setActivity({ ...a }, { sync, beacon });
}

/** Pass this to registerSink() in telemetry.ts. */
export function networkSink(entry: LoggedEvent) {
  // cycle_summary is a "derived" event (built in derive.ts), so it must be
  // handled before the semantic-only filter below.
  if (entry.event !== "cycle_summary" && entry.layer !== "semantic") return;
  const a = current();

  if (entry.layer === "semantic") {
    // Last deliberate action – saved with the next sync (or on tab hide).
    a.last = {
      event: entry.event,
      level_id: entry.level_id ?? null,
      attempt_number: entry.attempt_number ?? null,
      turn: entry.turn ?? null,
      ts: entry.ts,
    };
    // Outside a term attempt: goes on the session timeline. (Inside one, it is
    // in that attempt's own timeline, built by cycleSummary.ts.)
    if (!entry.attempt_id) {
      a.session.push([entry.ts, entry.event, compact(entry)]);
      if (a.session.length > MAX_SESSION_EVENTS) a.session = a.session.slice(-MAX_SESSION_EVENTS);
    }
  }

  switch (entry.event) {
    // ---- Start menu and "Game complete!" (summarised in `flow`) ----
    case "loading_finished":
      a.flow = { ...a.flow, loading_ms: entry.payload?.duration_ms ?? null };
      break;
    case "title_screen_shown":
      if (!a.flow.title_shown_at) a.flow = { ...a.flow, title_shown_at: entry.ts };
      break;
    case "title_panel_closed": {
      const key = `${entry.payload?.panel}_ms`;
      a.flow = { ...a.flow, [key]: ((a.flow[key] as number) ?? 0) + ((entry.payload?.dwell_ms as number) ?? 0) };
      break;
    }
    case "title_option_changed":
      a.flow = { ...a.flow, [`option_${entry.payload?.option}`]: entry.payload?.value ?? null };
      break;
    case "title_start_clicked":
      a.flow = {
        ...a.flow,
        title_ms: entry.payload?.ms_on_title ?? null,
        about_opens: entry.payload?.about_opens ?? 0,
        options_opens: entry.payload?.options_opens ?? 0,
        option_textSpeed: entry.payload?.text_speed ?? null,
        option_sound: entry.payload?.sound ?? null,
        game_started_at: entry.ts,
      };
      save(true);
      break;
    case "game_complete_shown":
      if (!a.flow.game_complete_shown_at) a.flow = { ...a.flow, game_complete_shown_at: entry.ts };
      break;
    case "fullscreen_requested":
      if (entry.payload?.source === 'start') a.flow = { ...a.flow, fullscreen_ok: !!entry.payload?.ok };
      else a.flow = { ...a.flow, fullscreen_nudges: ((a.flow.fullscreen_nudges as number) ?? 0) + 1 };
      break;
    case "fullscreen_changed":
      if (entry.payload?.fullscreen) {
        a.flow = { ...a.flow, fullscreen_since: entry.ts };
      } else if (typeof a.flow.fullscreen_since === 'number') {
        a.flow = {
          ...a.flow,
          fullscreen_ms: ((a.flow.fullscreen_ms as number) ?? 0) + (entry.ts - (a.flow.fullscreen_since as number)),
          fullscreen_exits: ((a.flow.fullscreen_exits as number) ?? 0) + 1,
          fullscreen_since: null,
        };
      }
      break;
    case "game_complete_continue_clicked":
      // Close any fullscreen period still running (fullscreen ends here).
      if (typeof a.flow.fullscreen_since === 'number') {
        a.flow = { ...a.flow, fullscreen_ms: ((a.flow.fullscreen_ms as number) ?? 0) + (entry.ts - (a.flow.fullscreen_since as number)), fullscreen_since: null };
      }
      a.flow = { ...a.flow, game_complete_ms: entry.payload?.dwell_ms ?? null, game_ended_at: entry.ts };
      save(true);
      break;
    case "session_started":
      a.loads.push([entry.ts, entry.session_id, entry.app_version ?? "dev"]);
      break;
    case "setup_submitted":
      a.setup = {
        difficulty_seed: entry.payload?.difficulty_seed ?? null,
        win_threshold_scalars: entry.payload?.win_threshold_scalars ?? null,
        difficulty: entry.payload?.difficulty ?? null,
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
    case "turn_completed": {
      // Snapshot of the attempt so far, so a participant who stops mid-term
      // still leaves every finished turn behind.
      if (entry.attempt_id) {
        const partial = buildCycleSummary(entry.attempt_id);
        if (partial) a.open_attempt = { ...partial, app_version: entry.app_version ?? null } as unknown as Json;
      }
      save(true);
      break;
    }
    case "cycle_summary": {
      const summary: Json = { ...entry.payload, app_version: entry.app_version ?? null };
      const id = summary.attempt_id;
      // Replace if this attempt was already saved (e.g. resent), else append.
      a.attempts = [...a.attempts.filter((x) => !id || x.attempt_id !== id), summary];
      if (a.open_attempt?.attempt_id === id) a.open_attempt = null;
      save(true);
      break;
    }
    case "final_debrief_closed":
      a.final = { dwell_ms: entry.payload?.dwell_ms ?? null, ts: entry.ts };
      save(true);
      break;
    default:
      if (SYNC_ON.has(entry.event)) save(true);
  }
}

/** Kept for call-site compatibility with page.tsx's unload listener. */
export function flushOnExit() {}

/** Tab hidden/closed: save everything so far (also covers a refresh). */
export function pingProgress() {
  if (!activity) return;
  save(false);
  syncStudy({ beacon: true });
}
