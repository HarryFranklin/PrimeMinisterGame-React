import { subscribeToEvents, trackDerived, getCurrentAttemptId, type LoggedEvent } from "./telemetry";
import { buildCycleSummary } from "./cycleSummary";

// ---------------------------------------------------------------------------
// Layer 1 — derivations.
//
// This is the "virtual sensor" pattern: small functions that listen to the
// event stream, package up what they see, and emit a new synthesized
// logline. Game code never calls these directly and doesn't need to know
// they exist - you can add a new derivation later and it'll apply
// retroactively to anything still in the log, or live going forward.
//
// Call once at startup, after startRawCapture():
//   import { startDerivations } from "./telemetry/derive";
//   startDerivations();
// ---------------------------------------------------------------------------

let started = false;

export function startDerivations() {
  if (started) return;
  started = true;

  detectRageClicks();
  detectDialogueReadingDwell();
  detectCycleEnd();
}

/** "Mindless clicking" signal: 3+ raw clicks on the same tagged element
 * within a 1-second window. Doesn't care what the element is - a policy
 * card, a modal's Continue button, anything. */
function detectRageClicks() {
  const RAGE_WINDOW_MS = 1000;
  const RAGE_THRESHOLD = 3;
  const recentClicksByTarget = new Map<string, number[]>();

  subscribeToEvents((entry: LoggedEvent) => {
    if (entry.event !== "raw_click") return;
    const targetId = entry.payload?.target_id as string | null;
    if (!targetId) return;

    const list = recentClicksByTarget.get(targetId) ?? [];
    list.push(entry.ts);
    const cutoff = entry.ts - RAGE_WINDOW_MS;
    const recent = list.filter((t) => t >= cutoff);
    recentClicksByTarget.set(targetId, recent);

    if (recent.length >= RAGE_THRESHOLD) {
      trackDerived("derived_rage_click", {
        target_id: targetId,
        click_count: recent.length,
        window_ms: RAGE_WINDOW_MS,
      });
      recentClicksByTarget.set(targetId, []); // reset so it doesn't refire every click after
    }
  });
}

/** Reading-dwell computed purely from raw signals rather than an explicit
 * per-component hook: one raw sensor call when dialogue renders
 * (`trackRaw("raw_dialogue_shown", { text_id, char_count })`, a single line
 * in your dialogue component), matched against the generic raw click on
 * whatever's tagged data-telemetry-id="dialogue_continue_button". */
function detectDialogueReadingDwell() {
  let lastShown: { text_id: string; char_count: number; ts: number } | null = null;

  subscribeToEvents((entry: LoggedEvent) => {
    if (entry.event === "raw_dialogue_shown") {
      lastShown = {
        text_id: entry.payload?.text_id as string,
        char_count: (entry.payload?.char_count as number) ?? 0,
        ts: entry.ts,
      };
      return;
    }

    if (entry.event === "raw_click" && entry.payload?.target_id === "dialogue_continue_button" && lastShown) {
      const dwellMs = entry.ts - lastShown.ts;
      const words = lastShown.char_count / 5;
      const wpm = dwellMs > 0 ? Math.round(words / (dwellMs / 60000)) : 9999;
      trackDerived("derived_reading_dwell", {
        text_id: lastShown.text_id,
        char_count: lastShown.char_count,
        dwell_ms: dwellMs,
        reading_speed_wpm: wpm,
        likely_skipped: dwellMs < 300,
      });
      lastShown = null;
    }
  });
}

/** Cycle summary rollup. Listens for the semantic "cycle_ended" event
 * (fired from ElectionModal's Restart Term / Proceed to Next Term / Finish
 * Game buttons — whichever actually closes out the attempt) and, at that
 * moment, reduces every event tagged with that attempt_id into one flat
 * summary object via buildCycleSummary(), then emits it as its own logline
 * so it lands in the JSON export automatically. */
function detectCycleEnd() {
  subscribeToEvents((entry: LoggedEvent) => {
    if (entry.event !== "cycle_ended") return;

    const attemptId = entry.attempt_id ?? getCurrentAttemptId();
    if (!attemptId) return;

    const outcome = entry.payload?.outcome as "won" | "lost_retry" | "lost_final" | undefined;
    const summary = buildCycleSummary(attemptId, outcome);
    if (!summary) return;

    trackDerived("cycle_summary", summary as unknown as Record<string, unknown>);
  });
}