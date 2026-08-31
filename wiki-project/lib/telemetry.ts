// lib/telemetry.ts

export const WORKER_URL = process.env.NEXT_PUBLIC_TELEMETRY_WORKER_URL || 'https://wiki-telemetry-worker.franklinh.workers.dev';

export interface ParticipantSession {
  userId: string;
  prolificPid: string;
  sessionId: string;
  studyId: string | null;
  appVersion: string;
}

const STORAGE_KEY_SESSION = 'wiki_study_session';
const STORAGE_KEY_VIEW_INDEX = 'wiki_view_index';

/** Retrieves the active participant session from localStorage if present. */
export function getStoredSession(): ParticipantSession | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY_SESSION);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Persists participant session to localStorage. */
export function storeSession(session: ParticipantSession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
}

/** Gets and increments the sequential page view counter for this session. */
export function getNextViewIndex(): number {
  if (typeof window === 'undefined') return 1;
  const current = parseInt(localStorage.getItem(STORAGE_KEY_VIEW_INDEX) || '0', 10);
  const next = current + 1;
  localStorage.setItem(STORAGE_KEY_VIEW_INDEX, next.toString());
  return next;
}

/** Sends an upsert request for the participant to the telemetry worker. */
export async function registerParticipant(session: ParticipantSession): Promise<number | null> {
  try {
    const res = await fetch(`${WORKER_URL}/participant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: session.userId,
        prolific_pid: session.prolificPid,
        session_id: session.sessionId,
        study_id: session.studyId,
        app_version: session.appVersion,
      }),
    });
    const data = await res.json();
    return data.participant_id ?? null;
  } catch (err) {
    console.error('Failed to register participant:', err);
    return null;
  }
}

/** Logs a discrete interaction event (e.g. internal link click). */
export function trackWikiEvent(
  session: ParticipantSession,
  pageSlug: string,
  eventType: string,
  eventData: unknown
): void {
  fetch(`${WORKER_URL}/wiki-event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: session.userId,
      prolific_pid: session.prolificPid,
      session_id: session.sessionId,
      study_id: session.studyId,
      page_slug: pageSlug,
      event_type: eventType,
      event_data: eventData,
      occurred_at: Date.now(),
    }),
    keepalive: true,
  }).catch(console.error);
}