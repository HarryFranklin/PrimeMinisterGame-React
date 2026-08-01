// app/client/networkSink.ts
// Ships semantic + derived events to /api/events (D1-backed). Batches and
// flushes periodically, and force-flushes via sendBeacon on tab hide/close
// so the last few events of a session aren't lost.

import type { LoggedEvent } from "./telemetry";

const ENDPOINT = "/api/events";
const FLUSH_INTERVAL_MS = 5000;
const MAX_BATCH = 50;

let queue: LoggedEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

function ensureTimer() {
  if (flushTimer !== null) return;
  flushTimer = setInterval(() => flush(), FLUSH_INTERVAL_MS);
}

async function flush(useBeacon = false) {
  if (queue.length === 0) return;
  const batch = queue.splice(0, MAX_BATCH);
  const body = JSON.stringify({ events: batch });

  if (useBeacon && "sendBeacon" in navigator) {
    const blob = new Blob([body], { type: "application/json" });
    const ok = navigator.sendBeacon(ENDPOINT, blob);
    if (!ok) queue.unshift(...batch); // beacon queue was full - retry next tick
    return;
  }

  try {
    await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    queue.unshift(...batch); // network hiccup - retry on next timer tick
  }
}

/** Pass this to registerSink() in telemetry - raw events are filtered out
 * here so hover/click noise never leaves the device. */
export function networkSink(entry: LoggedEvent) {
  if (entry.layer === "raw") return;
  queue.push(entry);
  ensureTimer();
  if (queue.length >= MAX_BATCH) flush();
}

/** Call this from a beforeunload/pagehide listener. */
export function flushOnExit() {
  flush(true);
}