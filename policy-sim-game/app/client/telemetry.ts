import type { TelemetryEventName, PayloadFor } from "./events";

// ---------------------------------------------------------------------------
// Environment / debug detection
// ---------------------------------------------------------------------------

const DEBUG_FLAG_KEY = "telemetry_debug";

/** True on localhost automatically, or anywhere if you've set the flag
 * (visit any URL with ?telemetryDebug=1 once — it persists via localStorage,
 * so it works on deployed preview/dev branches too, not just localhost). */
export function isTelemetryDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;

  const params = new URLSearchParams(window.location.search);
  if (params.get("telemetryDebug") === "1") localStorage.setItem(DEBUG_FLAG_KEY, "1");
  if (params.get("telemetryDebug") === "0") localStorage.removeItem(DEBUG_FLAG_KEY);

  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") return true;
  return localStorage.getItem(DEBUG_FLAG_KEY) === "1";
}

// ---------------------------------------------------------------------------
// IDs
// ---------------------------------------------------------------------------

const USER_ID_KEY = "telemetry_user_id";
const SESSION_ID_KEY = "telemetry_session_id";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function getUserId(): string {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = uuid();
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = uuid();
    sessionStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

// ---------------------------------------------------------------------------
// Attempt tracking
// A player can retry a level. Each attempt gets its own id and its own
// incrementing attempt_number, so "did they try something different on
// attempt 2 vs attempt 1" is a plain filter rather than something you have
// to reconstruct after the fact.
// ---------------------------------------------------------------------------

const ATTEMPT_COUNT_PREFIX = "telemetry_attempt_count:"; // + levelId, persisted so counts survive reloads

let currentAttemptId: string | undefined;
let currentAttemptNumber: number | undefined;

function nextAttemptNumber(levelId: string): number {
  const key = ATTEMPT_COUNT_PREFIX + levelId;
  const prev = Number(localStorage.getItem(key) ?? "0");
  const next = prev + 1;
  try {
    localStorage.setItem(key, String(next));
  } catch {
    // ignore quota errors - worst case attempt numbering resets
  }
  return next;
}

/** Call when a level (re)starts - including retries. Sets level_id, turn=0,
 * and a fresh attempt_id/attempt_number that every subsequent event carries
 * until the next call to this or another level starts. */
export function startLevelAttempt(levelId: string) {
  currentLevelId = levelId;
  currentAttemptId = uuid();
  currentAttemptNumber = nextAttemptNumber(levelId);
  currentTurn = 0;
  track("level_attempt_started", { level_id: levelId, attempt_number: currentAttemptNumber });
}

// ---------------------------------------------------------------------------
// Reusable timer primitive
// This is the thing under the hood of "start a timer when a modal opens, end
// it when Continue/Skip fires" — use it directly for anything new; you don't
// need a bespoke hook for every UI element.
// ---------------------------------------------------------------------------

const timers = new Map<string, number>();

/** Start (or restart) a named timer. */
export function startTimer(key: string) {
  timers.set(key, Date.now());
}

/** Stop a named timer and return elapsed ms (0 if it was never started). */
export function stopTimer(key: string): number {
  const start = timers.get(key);
  if (start === undefined) return 0;
  timers.delete(key);
  return Date.now() - start;
}

// ---------------------------------------------------------------------------
// Event log + sinks
// ---------------------------------------------------------------------------

export interface LoggedEvent {
  event: string;
  layer: "semantic" | "raw" | "derived";
  ts: number;
  user_id: string;
  session_id: string;
  level_id?: string;
  attempt_id?: string;
  attempt_number?: number;
  turn?: number;
  app_version?: string;
  payload?: Record<string, unknown>;
  ms_since_last_event: number | null;
  ms_since_last_same_event: number | null;
}

export type Sink = (entry: LoggedEvent) => void;

const sinks: Sink[] = [];
const fullLog: LoggedEvent[] = [];
let telemetryInitialized = false;
let appVersion = "dev";
let currentLevelId: string | undefined;
let currentTurn: number | undefined;

let lastEventTs: number | null = null;
const lastEventTsByType = new Map<string, number>();
const lastPayloadByType = new Map<string, string>();

/** Register something to receive every event as it's tracked.
 * This is the extension point for Phase 2: `registerSink(networkSink)`
 * sends everything to Cloudflare too, with zero changes anywhere else. */
export function registerSink(sink: Sink) {
  sinks.push(sink);
}

// --- built-in sinks ---

let consoleLoggingEnabled = false;
export function setConsoleLogging(enabled: boolean) {
  consoleLoggingEnabled = enabled;
}
export function isConsoleLoggingEnabled() {
  return consoleLoggingEnabled;
}

const consoleSink: Sink = (entry) => {
  if (!consoleLoggingEnabled) return;
  // eslint-disable-next-line no-console
  console.log(
    `%c[telemetry] %c${entry.event}`,
    "color:#8a8f98",
    "color:#3b6ef2;font-weight:600",
    entry
  );
};

const LOCAL_STORAGE_LOG_KEY = "telemetry_dev_log";
const localStorageSink: Sink = () => {
  try {
    localStorage.setItem(LOCAL_STORAGE_LOG_KEY, JSON.stringify(fullLog));
  } catch {
    // storage full or unavailable - dev-only convenience, safe to ignore
  }
};

// --- live-feed subscription (for DevPanel) ---

type EventListener = (entry: LoggedEvent, log: LoggedEvent[]) => void;
const eventListeners = new Set<EventListener>();
export function subscribeToEvents(cb: EventListener): () => void {
  eventListeners.add(cb);
  return () => eventListeners.delete(cb);
}

// --- save status pub/sub (for SavingIndicator) ---

export type SaveStatus = "idle" | "saving" | "saved";
let saveStatus: SaveStatus = "idle";
const saveStatusListeners = new Set<(s: SaveStatus) => void>();
function setSaveStatus(s: SaveStatus) {
  saveStatus = s;
  saveStatusListeners.forEach((l) => l(s));
}
export function subscribeSaveStatus(cb: (s: SaveStatus) => void): () => void {
  saveStatusListeners.add(cb);
  cb(saveStatus);
  return () => saveStatusListeners.delete(cb);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function initTelemetry(options?: { appVersion?: string }) {
  if (telemetryInitialized) return;
  telemetryInitialized = true;

  if (options?.appVersion) appVersion = options.appVersion;

  if (isTelemetryDebugEnabled()) {
    setConsoleLogging(true); // sensible default; DevPanel checkbox can flip it off
    registerSink(consoleSink);
    registerSink(localStorageSink);

    // restore any log left over from a previous session on this device (dev convenience)
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_LOG_KEY);
      if (saved) fullLog.push(...(JSON.parse(saved) as LoggedEvent[]));
    } catch {
      // ignore corrupt/missing data
    }
  }

  track("session_started", {});
}

/** So subsequent events auto-tag with the right level/turn without threading
 * it through every call site. */
export function setContext(ctx: { levelId?: string; turn?: number }) {
  if (ctx.levelId !== undefined) currentLevelId = ctx.levelId;
  if (ctx.turn !== undefined) currentTurn = ctx.turn;
}

function logEntry(event: string, layer: LoggedEvent["layer"], payload: Record<string, unknown> | undefined) {
  const now = Date.now();
  const ms_since_last_event = lastEventTs !== null ? now - lastEventTs : null;
  const ms_since_last_same_event = lastEventTsByType.has(event) ? now - lastEventTsByType.get(event)! : null;

  // Guard against accidental double-fires of the exact same event (e.g. a
  // component's mount effect running twice in the same tick due to a
  // re-render/remount race) - if we just logged this event with identical
  // payload under 50ms ago, treat it as a duplicate and drop it silently
  // rather than recording it twice.
  if (ms_since_last_same_event !== null && ms_since_last_same_event < 50) {
    const serialized = JSON.stringify(payload ?? {});
    if (lastPayloadByType.get(event) === serialized) {
      return null;
    }
  }

  lastEventTs = now;
  lastEventTsByType.set(event, now);
  lastPayloadByType.set(event, JSON.stringify(payload ?? {}));

  const entry: LoggedEvent = {
    event,
    layer,
    ts: now,
    user_id: getUserId(),
    session_id: getSessionId(),
    level_id: currentLevelId,
    attempt_id: currentAttemptId,
    attempt_number: currentAttemptNumber,
    turn: currentTurn,
    app_version: appVersion,
    payload,
    ms_since_last_event,
    ms_since_last_same_event,
  };

  fullLog.push(entry);
  for (const sink of sinks) sink(entry);
  eventListeners.forEach((l) => l(entry, fullLog));
  return entry;
}

export function track<N extends TelemetryEventName>(event: N, payload: PayloadFor<N>) {
  logEntry(event, "semantic", payload as Record<string, unknown>);

  // Auto "close off" an attempt the moment it completes - this is what the
  // level-select "Saving Progress" indicator reacts to.
  if (event === "level_completed" || event === "level_attempt_ended") {
    closeOutAttempt();
  }
}

/** For Layer 0 raw sensors (clicks, hovers, scrolls, keys) - looser typing
 * on purpose, this is meant to be called generically by rawCapture.ts, not
 * hand-written per interaction. Still flows through the same log/sinks/
 * delta computation as track(). */
export function trackRaw(event: string, detail: Record<string, unknown>) {
  logEntry(event, "raw", detail);
}

/** For Layer 1 loglines synthesized by watching the raw stream (see
 * derive.ts) - e.g. "reading_dwell" computed from a raw dialogue-shown
 * signal plus a raw click on the continue button. */
export function trackDerived(event: string, detail: Record<string, unknown>) {
  logEntry(event, "derived", detail);
}

export function endSession(durationMs: number) {
  track("session_ended", { duration_ms: durationMs });
}

/** Snapshot everything tracked so far for the *current attempt* into its own
 * localStorage entry, and flip the save-status indicator saving -> saved.
 * Called automatically on `level_completed` / `level_attempt_ended`; call it
 * manually too (e.g. on leaving a level early) for defensive coverage. */
export function closeOutAttempt(attemptId: string = currentAttemptId ?? "") {
  if (!attemptId) return;
  setSaveStatus("saving");
  const attemptEvents = fullLog.filter((e) => e.attempt_id === attemptId);
  try {
    localStorage.setItem(`telemetry_attempt:${attemptId}`, JSON.stringify(attemptEvents));
  } catch {
    // dev-only convenience; ignore quota errors
  }
  // tiny delay so the pulsing "Saving..." state is actually visible/felt,
  // rather than flashing saved instantly
  setTimeout(() => setSaveStatus("saved"), 400);
}

/** Every event for one attempt, in chronological order - the "reconstruct a
 * timeline" replay you asked for. Works for the current attempt or any past
 * one still in the in-memory log / localStorage. */
export function getTimelineForAttempt(attemptId: string): LoggedEvent[] {
  return fullLog.filter((e) => e.attempt_id === attemptId).sort((a, b) => a.ts - b.ts);
}

/** Every attempt seen so far in this log, in order, with a quick summary -
 * handy for "did they try something different attempt to attempt". */
export function listAttempts(levelId?: string): { attempt_id: string; level_id?: string; attempt_number?: number; event_count: number; started_at: number }[] {
  const byId = new Map<string, LoggedEvent[]>();
  for (const e of fullLog) {
    if (!e.attempt_id) continue;
    if (levelId && e.level_id !== levelId) continue;
    if (!byId.has(e.attempt_id)) byId.set(e.attempt_id, []);
    byId.get(e.attempt_id)!.push(e);
  }
  return [...byId.entries()]
    .map(([attempt_id, events]) => ({
      attempt_id,
      level_id: events[0]?.level_id,
      attempt_number: events[0]?.attempt_number,
      event_count: events.length,
      started_at: Math.min(...events.map((e) => e.ts)),
    }))
    .sort((a, b) => a.started_at - b.started_at);
}

export function getFullLog(): LoggedEvent[] {
  return fullLog;
}

export function clearLog() {
  fullLog.length = 0;
  lastEventTs = null;
  lastEventTsByType.clear();
  lastPayloadByType.clear();
  try {
    localStorage.removeItem(LOCAL_STORAGE_LOG_KEY);
  } catch {
    // ignore
  }
}

export function getCurrentAttemptId(): string | undefined {
  return currentAttemptId;
}

export function downloadLog(filename?: string) {
  const sorted = [...fullLog].sort((a, b) => a.ts - b.ts);
  const blob = new Blob([JSON.stringify(sorted, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `telemetry_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  a.click();
  URL.revokeObjectURL(url);
}