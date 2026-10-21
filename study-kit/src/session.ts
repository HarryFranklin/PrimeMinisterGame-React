'use client';
// ============================================================================
// Study session + saving. Shared by the game and the wiki.
//
// Who the participant is (pid + secret token from the worker's /start), which
// stage they're at, and everything they've answered/done, kept in
// localStorage so a refresh resumes where they were, and synced to the
// worker's /sync. Each of the five data cells (pis, consent, pretest,
// activity, posttest) carries its own version number `_v`; only cells that
// changed since the last sync are sent, and the worker ignores anything older
// than what it already has. One sync = one database row written.
//
// Safety nets (a refresh must never put someone back to an older point):
//  - on every load the saved copy is checked against the server's (/state)
//    and the newer one is kept;
//  - if the study is opened in a second tab, the older tab stops saving and
//    says so (only one tab can write);
//  - writes to browser storage never throw; if storage is full, throwaway
//    data is cleared and the write retried;
//  - during the game/reading, refreshing or closing asks "Leave site?".
// ============================================================================
import { WORKER_URL } from './config';
import type { StudyMode } from './content/infoAndConsent';
import type { Condition } from './content/questions';

export type Stage = 'pis' | 'consent' | 'pretest' | 'activity' | 'posttest' | 'done' | 'declined';
export type CellName = 'pis' | 'consent' | 'pretest' | 'activity' | 'posttest';
export type Cell = { _v: number } & Record<string, unknown>;

export interface StudySession {
  pid: string;
  t: string;
  mode: StudyMode;
  condition: Condition;
}

export interface StudyState {
  session: StudySession | null;
  stage: Stage;
  cells: Partial<Record<CellName, Cell>>;
  dirty: CellName[];
  metaDirty: boolean;
  consentStatus: 'signed' | 'declined' | null;
  completed: boolean;
  finalOutcome: string | null;
}

export type InitResult =
  | { status: 'ready' }
  | { status: 'redirecting' }
  | { status: 'no-session' }
  | { status: 'wrong-app'; url: string | null }
  | { status: 'error'; message: string };

const STORAGE_KEY = 'study_state_v1';
const CELL_NAMES: CellName[] = ['pis', 'consent', 'pretest', 'activity', 'posttest'];
const STAGE_ORDER: Record<Stage, number> = { pis: 0, consent: 1, pretest: 2, activity: 3, posttest: 4, done: 5, declined: 5 };
/** Browser-storage keys that are only local copies/dev logs and safe to delete
 * when storage is full (the data itself is on the server). */
const EXPENDABLE_PREFIXES = ['telemetry_attempt:', 'telemetry_dev_log'];
/** fetch keepalive and sendBeacon both refuse bodies over 64 KB. */
const KEEPALIVE_LIMIT = 60 * 1024;

const EMPTY: StudyState = {
  session: null,
  stage: 'pis',
  cells: {},
  dirty: [],
  metaDirty: false,
  consentStatus: null,
  completed: false,
  finalOutcome: null,
};

let state: StudyState = EMPTY;
let appVersion = 'dev';
let listenersInstalled = false;
const subscribers = new Set<() => void>();
/** True once a newer tab has taken over: this tab must not write anything. */
let suspended = false;
/** What the server had newer than this browser on load (test-mode notice). */
let restoredFromServer: string[] = [];
/** A save to browser storage failed even after clearing throwaway data. */
let storageFailed = false;

// ---------------------------------------------------------------------------
// Store plumbing
// ---------------------------------------------------------------------------
function load(): StudyState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    /* corrupt or unavailable – start fresh */
  }
  return EMPTY;
}

/** Deletes local-only copies (dev logs, per-attempt telemetry copies) to free
 * browser storage. Returns how many keys were removed. */
export function freeBrowserStorage(): number {
  let removed = 0;
  try {
    for (const key of Object.keys(localStorage)) {
      if (EXPENDABLE_PREFIXES.some((p) => key.startsWith(p))) {
        localStorage.removeItem(key);
        removed++;
      }
    }
  } catch {
    /* storage unavailable */
  }
  return removed;
}

/** localStorage.setItem that never throws: if storage is full it frees
 * throwaway data and tries once more. Returns false if it still failed. */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    freeBrowserStorage();
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
}

function save() {
  if (suspended) return;
  // If this fails the data still reaches the server on sync, and the next
  // load takes the server's copy.
  if (!safeSetItem(STORAGE_KEY, JSON.stringify(state))) {
    if (!storageFailed) console.warn('Study: could not save to browser storage (full?)');
    storageFailed = true;
  }
}

function set(next: StudyState) {
  state = next;
  save();
  subscribers.forEach((fn) => fn());
}

export function subscribeStudy(fn: () => void): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function getStudyState(): StudyState {
  return state;
}

/** True if the study has been opened in another (newer) tab. */
export function isStudySuspended(): boolean {
  return suspended;
}

/** For the test-mode notice: what was restored from the server on load, and
 * whether browser storage is failing. */
export function getStorageHealth(): { restoredFromServer: string[]; storageFailed: boolean } {
  return { restoredFromServer, storageFailed };
}

// ---------------------------------------------------------------------------
// Start-up: work out who this is.
// ---------------------------------------------------------------------------
async function callStart(params: Record<string, string>): Promise<{ pid: string; token: string; mode: StudyMode; condition: Condition; url: string }> {
  const q = new URLSearchParams({ ...params, format: 'json' });
  const res = await fetch(`${WORKER_URL}/start?${q}`);
  if (!res.ok) throw new Error(`start failed (${res.status})`);
  return res.json();
}

function stripIdentityFromUrl() {
  const url = new URL(window.location.href);
  ['pid', 't', 'mode', 'new', 'skip', 'PROLIFIC_PID', 'STUDY_ID', 'SESSION_ID'].forEach((k) => url.searchParams.delete(k));
  window.history.replaceState(null, '', url.toString());
}

/** Keeps whichever copy is newer, cell by cell: this browser's or the
 * server's. Protects against a refresh loading an out-of-date browser copy
 * (e.g. after a save failed or another tab overwrote it). If the server can't
 * be reached, carries on with the browser's copy. */
async function reconcileWithServer(): Promise<void> {
  const s = state.session;
  if (!s) return;
  let server: {
    stage: Stage | null;
    consent_status: string | null;
    completed: boolean;
    final_outcome: string | null;
    cells: Partial<Record<CellName, Cell>>;
  };
  try {
    const res = await fetch(`${WORKER_URL}/state?${new URLSearchParams({ pid: s.pid, t: s.t })}`, { cache: 'no-store' });
    if (!res.ok) return; // e.g. a deleted test row – the next sync handles it
    server = await res.json();
  } catch {
    return;
  }
  if (state.session?.pid !== s.pid) return;

  const restored: string[] = [];
  const cells = { ...state.cells };
  let dirty = [...state.dirty];
  for (const name of CELL_NAMES) {
    const sv = server.cells?.[name];
    const lv = cells[name];
    if (sv && typeof sv._v === 'number' && (!lv || sv._v > lv._v)) {
      cells[name] = sv;
      dirty = dirty.filter((d) => d !== name);
      restored.push(name);
    } else if (lv && (!sv || lv._v > sv._v) && !dirty.includes(name)) {
      dirty.push(name); // this browser is ahead (not yet sent): send it
    }
  }
  let { stage, metaDirty } = state;
  if (server.stage && STAGE_ORDER[server.stage] > STAGE_ORDER[stage]) {
    stage = server.stage;
    restored.push(`stage (${server.stage})`);
  } else if (!server.stage || STAGE_ORDER[stage] > STAGE_ORDER[server.stage]) {
    metaDirty = true;
  }
  const consentStatus =
    state.consentStatus ?? (server.consent_status === 'signed' || server.consent_status === 'declined' ? server.consent_status : null);
  set({
    ...state,
    cells,
    dirty,
    metaDirty,
    stage,
    consentStatus,
    completed: state.completed || !!server.completed,
    finalOutcome: state.finalOutcome ?? server.final_outcome ?? null,
  });
  restoredFromServer = restored;
  if (restored.length) console.warn('Study: this browser was behind the server; restored', restored.join(', '));
  if (dirty.length || metaDirty) syncStudy();
}

function begin(session: StudySession) {
  // A different participant on this device: start from a clean slate.
  if (!state.session || state.session.pid !== session.pid) set({ ...EMPTY, session });
  else set({ ...state, session });
}

/**
 * Call once when the app loads. `condition` is which app this is.
 * Entry routes, in order:
 *   ?pid=…&t=…&mode=…   – from the worker's /start redirect (normal route)
 *   ?PROLIFIC_PID=…      – someone used the app's own URL from Prolific
 *   ?mode=pilot|test     – opened directly for piloting/testing (&new=1 forces a fresh participant;
 *                          &skip=1 with mode=test jumps straight to the game/reading)
 *   nothing              – resume the participant stored on this device, if any
 */
let initPromise: Promise<InitResult> | null = null;

export function initStudy(condition: Condition, version: string): Promise<InitResult> {
  // Runs once per page load, even if React mounts the gate twice (dev mode),
  // so we never create two participants.
  if (!initPromise) initPromise = runInit(condition, version);
  return initPromise;
}

async function runInit(condition: Condition, version: string): Promise<InitResult> {
  appVersion = version || 'dev';
  state = load();
  installListeners();
  const q = new URLSearchParams(window.location.search);

  try {
    const pid = q.get('pid');
    const t = q.get('t');
    const mode = q.get('mode');
    const prolificPid = q.get('PROLIFIC_PID');

    if (pid && t) {
      const m: StudyMode = mode === 'pilot' || mode === 'test' ? mode : 'live';
      begin({ pid, t, mode: m, condition });
    } else if (prolificPid) {
      const r = await callStart({
        PROLIFIC_PID: prolificPid,
        STUDY_ID: q.get('STUDY_ID') ?? '',
        SESSION_ID: q.get('SESSION_ID') ?? '',
      });
      if (r.condition !== condition) {
        window.location.replace(r.url);
        return { status: 'redirecting' };
      }
      begin({ pid: r.pid, t: r.token, mode: r.mode, condition: r.condition });
    } else if (mode === 'pilot' || mode === 'test') {
      const reuse = state.session && state.session.mode === mode && state.session.condition === condition && q.get('new') !== '1';
      if (!reuse) {
        const r = await callStart({ mode, condition });
        begin({ pid: r.pid, t: r.token, mode: r.mode, condition: r.condition });
      }
    }
  } catch (err) {
    return { status: 'error', message: String(err) };
  }

  // Testing shortcut: ?mode=test&skip=1 skips the information sheet, consent and
  // baseline questions. Test participants only – never live or pilot.
  if (q.get('skip') === '1' && state.session?.mode === 'test' && ['pis', 'consent', 'pretest'].includes(state.stage)) {
    set({ ...state, stage: 'activity', metaDirty: true });
  }

  stripIdentityFromUrl();
  if (!state.session) return { status: 'no-session' };
  if (state.session.condition === condition) await reconcileWithServer();
  if (state.session.condition !== condition) return { status: 'wrong-app', url: null };
  return { status: 'ready' };
}

// ---------------------------------------------------------------------------
// Updating data
// ---------------------------------------------------------------------------
/** Replace a cell's contents (its version number is bumped automatically). */
export function setCell(name: CellName, data: Record<string, unknown>) {
  const prev = state.cells[name];
  const cell: Cell = { ...data, _v: (prev?._v ?? 0) + 1 };
  const dirty = state.dirty.includes(name) ? state.dirty : [...state.dirty, name];
  set({ ...state, cells: { ...state.cells, [name]: cell }, dirty });
}

export function getCell<T = Record<string, unknown>>(name: CellName): (T & { _v: number }) | undefined {
  return state.cells[name] as (T & { _v: number }) | undefined;
}

/** Move to a stage and save straight away. */
export function setStage(stage: Stage, extra: Partial<Pick<StudyState, 'consentStatus' | 'completed' | 'finalOutcome'>> = {}) {
  set({ ...state, ...extra, stage, metaDirty: true });
  syncStudy();
}

/** For the apps: store the whole activity record (game turns / wiki views). */
export function setActivity(data: Record<string, unknown>, opts: { sync?: boolean; beacon?: boolean } = {}) {
  setCell('activity', data);
  if (opts.sync) syncStudy({ beacon: opts.beacon });
}

/** For the apps: the game or reading is finished – go to the post-test. */
export function finishActivity() {
  if (state.stage === 'activity') setStage('posttest');
}

/** The participant's baseline life satisfaction, for the LS intro screens. */
export function getBaselineLS(): { status: 'answered'; ls: number } | { status: 'prefer_not' } | { status: 'missing' } {
  const answers = (state.cells.pretest as { answers?: Record<string, unknown> } | undefined)?.answers;
  const v = answers?.ls;
  if (typeof v === 'number') return { status: 'answered', ls: v };
  if (v === 'prefer_not') return { status: 'prefer_not' };
  return { status: 'missing' };
}

// ---------------------------------------------------------------------------
// Syncing
// ---------------------------------------------------------------------------
/** Send whatever has changed. Safe to call often – does nothing if nothing changed. */
export function syncStudy(opts: { beacon?: boolean } = {}): Promise<void> {
  const s = state;
  if (suspended) return Promise.resolve();
  if (!s.session || (!s.dirty.length && !s.metaDirty)) return Promise.resolve();

  const cells: Partial<Record<CellName, Cell>> = {};
  for (const name of s.dirty) if (s.cells[name]) cells[name] = s.cells[name];
  const sent = s.dirty;
  const body = JSON.stringify({
    pid: s.session.pid,
    t: s.session.t,
    app_version: appVersion,
    stage: s.stage,
    consent_status: s.consentStatus,
    completed: s.completed,
    final_outcome: s.finalOutcome,
    cells,
  });
  set({ ...s, dirty: [], metaDirty: false });

  const url = `${WORKER_URL}/sync`;
  const small = body.length < KEEPALIVE_LIMIT;
  // text/plain = no CORS preflight, and sendBeacon accepts it everywhere.
  if (opts.beacon && small && typeof navigator !== 'undefined' && navigator.sendBeacon) {
    if (navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' }))) return Promise.resolve();
  }
  return fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body, keepalive: small })
    .then((res) => {
      if (res.status === 404) return recoverMissingParticipant();
      if (!res.ok) throw new Error(`sync ${res.status}`);
    })
    .catch((err) => {
      // Put the cells back on the to-send list; the next sync retries them.
      console.warn('Study sync failed, will retry:', err);
      const dirty = Array.from(new Set([...state.dirty, ...sent]));
      set({ ...state, dirty, metaDirty: true });
    });
}

/** The server has no row for this participant (e.g. test rows were deleted
 * while this browser still remembered one). Pilot/test: register a fresh
 * participant and re-send everything done so far. Live participants are never
 * deleted, so for them the data stays on the device and is logged. */
let recovering = false;
async function recoverMissingParticipant(): Promise<void> {
  const s = state.session;
  if (!s || recovering) return;
  if (s.mode === 'live') {
    console.error('Study: participant not found on the server; answers are kept on this device.');
    return;
  }
  recovering = true;
  try {
    const r = await callStart({ mode: s.mode, condition: s.condition });
    const all = Object.keys(state.cells) as CellName[];
    set({ ...state, session: { pid: r.pid, t: r.token, mode: r.mode, condition: r.condition }, dirty: all, metaDirty: true });
    console.warn(`Study: previous ${s.mode} participant ${s.pid} no longer exists; continuing as ${r.pid}.`);
  } catch (err) {
    console.warn('Study: could not re-register participant', err);
    return;
  } finally {
    recovering = false;
  }
  await syncStudy();
}

function installListeners() {
  if (listenersInstalled || typeof document === 'undefined') return;
  listenersInstalled = true;

  // One tab at a time: a newly opened tab announces itself and any older tab
  // stops saving (so it can't overwrite the newer tab's progress).
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel('study_tabs_v1');
    const tabId = Math.random().toString(36).slice(2);
    channel.onmessage = (ev) => {
      if (ev.data?.type === 'opened' && ev.data.id !== tabId && !suspended) {
        suspended = true;
        subscribers.forEach((fn) => fn());
      }
    };
    channel.postMessage({ type: 'opened', id: tabId });
  }

  // During the game/reading only: refreshing or closing asks "Leave site?"
  // (the browser's own wording). Apps can listen for 'study:leave-warning'.
  window.addEventListener('beforeunload', (e) => {
    if (suspended || state.stage !== 'activity') return;
    e.preventDefault();
    e.returnValue = '';
    window.dispatchEvent(new CustomEvent('study:leave-warning'));
  });

  // Leaving/switching tab: last chance to save.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') syncStudy({ beacon: true });
  });
  window.addEventListener('pagehide', () => syncStudy({ beacon: true }));
}

// ---------------------------------------------------------------------------
// Dev/testing helpers
// ---------------------------------------------------------------------------
export function isStudyTestMode(): boolean {
  return state.session?.mode === 'test' || (typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname));
}

/** Forget this participant on this device (test mode only). */
export function resetStudyOnDevice() {
  initPromise = null;
  restoredFromServer = [];
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  state = EMPTY;
  subscribers.forEach((fn) => fn());
}
