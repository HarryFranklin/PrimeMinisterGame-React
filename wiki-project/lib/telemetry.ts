// Wiki telemetry: one JSON payload per participant.
//
// Everything a participant does is kept in a single payload object in
// localStorage and synced to the worker as a whole, overwriting the previous
// copy. The worker stores it in participants.wiki_payload, so each sync costs
// ONE database row written, no matter how much happened since the last sync.
//
// Syncs happen only when needed:
//   - when the participant enters their Prolific ID (creates their row)
//   - when the tab is hidden or closed (covers leaving, switching, closing)
//   - when they take the 5-minute extension, and when they finish
//   - a heartbeat every few minutes, but only if something has changed
// Moving between pages, scrolling and marking pages complete are recorded
// locally and go up with the next sync.

export const WORKER_URL = process.env.NEXT_PUBLIC_TELEMETRY_WORKER_URL || 'https://wiki-telemetry-worker.franklinh.workers.dev';

export interface ParticipantSession {
  userId: string;
  prolificPid: string;
  sessionId: string;
  prolificSessionId: string | null;
  studyId: string | null;
  appVersion: string;
}

const STORAGE_KEY_SESSION = 'wiki_study_session';
const STORAGE_KEY_PAYLOAD = 'wiki_payload';

/** Only sync on a heartbeat if something changed, and at most this often. */
export const HEARTBEAT_MS = 5 * 60 * 1000;
/** A hidden-tab sync is skipped if nothing changed and we synced this recently. */
const MIN_IDLE_SYNC_GAP_MS = 10 * 1000;
/** Views shorter than this are dropped (e.g. React dev-mode double mounts). */
const MIN_VIEW_MS = 250;
/** fetch keepalive refuses bodies over 64 KB. */
const KEEPALIVE_LIMIT = 60 * 1024;

// ---------------------------------------------------------------------------
// Payload shape (this is exactly what ends up in participants.wiki_payload)
// ---------------------------------------------------------------------------

/** How the participant got to a page. */
export type NavSource = 'direct' | 'sidebar' | 'content' | 'history';

export interface PageView {
  index: number;              // 1, 2, 3 ... in the order pages were opened
  slug: string;
  via: NavSource;
  entered_at: number;         // epoch ms
  left_at: number | null;     // null while the page is still open
  ms: number;                 // time on the page
  active_ms: number;          // time on the page with the tab visible
  max_scroll_pct: number;
}

export interface PageTotal {
  visits: number;
  ms: number;
  active_ms: number;
  max_scroll_pct: number;
  words: number;
}

export type CompletionOutcome = 'chose_finish' | 'finished_during_extension' | 'auto_finished_timeout';

export interface WikiPayload {
  v: 1;
  seq: number;                              // bumped on every sync; the worker ignores older copies
  started_at: number;
  last_synced_at: number | null;
  views: PageView[];                        // every page opened, in order (repeats included)
  totals: Record<string, PageTotal>;        // per page, summed across all visits
  completed_pages: Record<string, number>;  // slug -> when "Mark as Complete" was clicked
  completion: {
    modal_shown_at: number | null;
    extended_at: number | null;
    extend_deadline: number | null;
    outcome: CompletionOutcome | null;
    finished_at: number | null;
  };
}

function freshPayload(now = Date.now()): WikiPayload {
  return {
    v: 1,
    seq: 0,
    started_at: now,
    last_synced_at: null,
    views: [],
    totals: {},
    completed_pages: {},
    completion: { modal_shown_at: null, extended_at: null, extend_deadline: null, outcome: null, finished_at: null },
  };
}

// ---------------------------------------------------------------------------
// Local storage
// ---------------------------------------------------------------------------

export function getStoredSession(): ParticipantSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeSession(session: ParticipantSession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
}

function loadPayload(): WikiPayload {
  if (typeof window === 'undefined') return freshPayload();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PAYLOAD);
    if (raw) return JSON.parse(raw);
  } catch {
    /* fall through to a fresh payload */
  }
  const p = freshPayload();
  savePayload(p);
  return p;
}

function savePayload(p: WikiPayload): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_PAYLOAD, JSON.stringify(p));
}

/** Starts a brand-new payload. Called when a participant enters their ID. */
export function resetPayload(): void {
  savePayload(freshPayload());
  current = null;
  dirty = true;
}

// --- DEV_TOOLS ---------------------------------------------------------
export function clearAllLocalState(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY_SESSION);
  localStorage.removeItem(STORAGE_KEY_PAYLOAD);
  localStorage.removeItem('wiki_view_index'); // left over from the old telemetry
  localStorage.removeItem('wiki_visited_pages');
  localStorage.removeItem('wiki_completed_pages');
  localStorage.removeItem('wiki_completion_decision');
}
// --- END DEV_TOOLS ------------------------------------------------------

// ---------------------------------------------------------------------------
// The page currently on screen
// ---------------------------------------------------------------------------

interface OpenView {
  enteredAt: number;
  activeMs: number;            // visible time banked so far
  visibleSince: number | null; // null while the tab is hidden
  maxScrollPct: number;
}

let current: OpenView | null = null;
let pendingVia: NavSource | null = null;
let dirty = false;
let lastSyncAt = 0;

/** Remember how the next page was reached (set just before navigation). */
export function noteNavigation(via: NavSource): void {
  pendingVia = via;
}

function recomputeTotals(p: WikiPayload): void {
  const words: Record<string, number> = {};
  for (const [slug, t] of Object.entries(p.totals)) words[slug] = t.words;
  const totals: Record<string, PageTotal> = {};
  for (const v of p.views) {
    const t = (totals[v.slug] ??= { visits: 0, ms: 0, active_ms: 0, max_scroll_pct: 0, words: words[v.slug] ?? 0 });
    t.visits += 1;
    t.ms += v.ms;
    t.active_ms += v.active_ms;
    t.max_scroll_pct = Math.max(t.max_scroll_pct, v.max_scroll_pct);
  }
  p.totals = totals;
}

/** Writes the open page's time so far into the last view. With final=true
 * the view is closed (left_at set) and, if trivially short, dropped. */
function snapshotCurrent(final: boolean): void {
  if (!current) return;
  const p = loadPayload();
  const view = p.views[p.views.length - 1];
  if (!view || view.left_at !== null) {
    current = null;
    return;
  }
  const now = Date.now();
  view.ms = now - current.enteredAt;
  view.active_ms = current.activeMs + (current.visibleSince !== null ? now - current.visibleSince : 0);
  view.max_scroll_pct = current.maxScrollPct;

  if (final) {
    view.left_at = now;
    if (view.ms < MIN_VIEW_MS) p.views.pop();
    current = null;
    dirty = true;
  }
  recomputeTotals(p);
  savePayload(p);
}

export function startView(slug: string, words: number): void {
  snapshotCurrent(true); // close anything left open
  const p = loadPayload();
  const now = Date.now();
  const visible = typeof document === 'undefined' || !document.hidden;

  // A view still open from before a refresh or reopened tab: close it at
  // the last time we know about.
  const last = p.views[p.views.length - 1];
  if (last && last.left_at === null) last.left_at = last.entered_at + last.ms;

  p.views.push({
    index: p.views.length + 1,
    slug,
    via: pendingVia ?? 'direct',
    entered_at: now,
    left_at: null,
    ms: 0,
    active_ms: 0,
    max_scroll_pct: 0,
  });
  pendingVia = null;
  p.totals[slug] ??= { visits: 0, ms: 0, active_ms: 0, max_scroll_pct: 0, words };
  p.totals[slug].words = words;
  recomputeTotals(p);
  savePayload(p);

  current = { enteredAt: now, activeMs: 0, visibleSince: visible ? now : null, maxScrollPct: 0 };
  dirty = true;
}

export function endView(): void {
  snapshotCurrent(true);
}

export function setVisible(visible: boolean): void {
  if (!current) return;
  const now = Date.now();
  if (!visible && current.visibleSince !== null) {
    current.activeMs += now - current.visibleSince;
    current.visibleSince = null;
  } else if (visible && current.visibleSince === null) {
    current.visibleSince = now;
  }
}

export function recordScroll(pct: number): void {
  if (current && pct > current.maxScrollPct) current.maxScrollPct = Math.round(pct);
}

// ---------------------------------------------------------------------------
// Completion events
// ---------------------------------------------------------------------------

export function recordPageComplete(slug: string): void {
  const p = loadPayload();
  if (p.completed_pages[slug]) return;
  p.completed_pages[slug] = Date.now();
  savePayload(p);
  dirty = true;
}

export function recordModalShown(): void {
  const p = loadPayload();
  p.completion.modal_shown_at ??= Date.now();
  savePayload(p);
  dirty = true;
}

export function recordExtend(deadline: number): void {
  const p = loadPayload();
  p.completion.extended_at = Date.now();
  p.completion.extend_deadline = deadline;
  savePayload(p);
  dirty = true;
}

export function recordFinish(outcome: CompletionOutcome): void {
  snapshotCurrent(true);
  const p = loadPayload();
  p.completion.outcome = outcome;
  p.completion.finished_at = Date.now();
  savePayload(p);
  dirty = true;
}

// ---------------------------------------------------------------------------
// Syncing
// ---------------------------------------------------------------------------

interface SyncOptions {
  /** Use sendBeacon (for tab hide/close, where fetch may be cancelled). */
  beacon?: boolean;
  /** Marks the participant as finished with this outcome. */
  finalOutcome?: CompletionOutcome;
}

/** Sends the whole payload. Each call = one row written in D1. */
export function syncPayload(session: ParticipantSession, opts: SyncOptions = {}): Promise<void> {
  snapshotCurrent(false);
  const p = loadPayload();
  const now = Date.now();
  p.seq += 1;
  p.last_synced_at = now;
  savePayload(p);
  dirty = false;
  lastSyncAt = now;

  const body = JSON.stringify({
    user_id: session.userId,
    prolific_pid: session.prolificPid,
    session_id: session.sessionId,
    prolific_session_id: session.prolificSessionId,
    study_id: session.studyId,
    app_version: session.appVersion,
    payload: p,
    ...(opts.finalOutcome ? { completed: true, final_outcome: `wiki_${opts.finalOutcome}` } : {}),
  });

  // text/plain keeps this a "simple" cross-origin request: no CORS preflight
  // (one fewer worker call) and sendBeacon accepts it in every browser.
  const url = `${WORKER_URL}/wiki-sync`;
  if (opts.beacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
    if (navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' }))) return Promise.resolve();
  }
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body,
    keepalive: body.length < KEEPALIVE_LIMIT,
  })
    .then(() => undefined)
    .catch((err) => console.error('Wiki sync failed:', err));
}

/** For tab hide/close and the heartbeat: sync only if there's something new. */
export function syncIfNeeded(session: ParticipantSession, opts: SyncOptions = {}): void {
  const openAndStale = current !== null && Date.now() - lastSyncAt >= MIN_IDLE_SYNC_GAP_MS;
  if (dirty || openAndStale) syncPayload(session, opts);
}

/** Heartbeat: only when something discrete changed (not just time passing). */
export function syncIfDirty(session: ParticipantSession): void {
  if (dirty) syncPayload(session);
}