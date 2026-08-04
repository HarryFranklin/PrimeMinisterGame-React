// app/client/networkSink.ts
// Ships two lightweight payload shapes to the D1-backed worker: a
// participant identity/completion ping, and a per-attempt cycle_summary
// rollup. Per-turn/raw/derived noise never leaves the device - it's already
// folded into the cycle_summary by the time this sees it (see derive.ts).

import type { LoggedEvent } from "./telemetry";

const BASE = "https://telemetry-worker.franklinh.workers.dev";

function send(path: string, body: unknown, useBeacon = false) {
  const json = JSON.stringify(body);
  if (useBeacon && "sendBeacon" in navigator) {
    navigator.sendBeacon(BASE + path, new Blob([json], { type: "application/json" }));
    return;
  }
  fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: json,
    keepalive: true,
  }).catch(() => {
    // best-effort - at this write volume a dropped ping isn't worth a retry queue
  });
}

function identity(entry: LoggedEvent, extra: Record<string, unknown> = {}) {
  return {
    user_id: entry.user_id,
    session_id: entry.session_id,
    prolific_pid: entry.prolific_pid ?? null,
    study_id: entry.study_id ?? null,
    prolific_session_id: entry.prolific_session_id ?? null,
    app_version: entry.app_version ?? null,
    ...extra,
  };
}

/** Pass this to registerSink() in telemetry.ts. */
export function networkSink(entry: LoggedEvent) {
  if (entry.event === "session_started") {
    send("/participant", identity(entry));
    return;
  }

  if (entry.event === "cycle_summary") {
    send("/cycle-attempt", { ...identity(entry), ...entry.payload });
    return;
  }

  if (entry.event === "final_debrief_closed") {
    send("/participant", identity(entry, { completed: true, final_outcome: entry.payload?.outcome ?? null }), true);
    return;
  }
}

/** Kept for call-site compatibility with page.tsx's beforeunload listener -
 * there's no queue to flush any more, sinks fire immediately. */
export function flushOnExit() {}