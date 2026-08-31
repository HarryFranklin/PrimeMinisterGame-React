// Wiki telemetry worker.
//
// Mirrors the game's telemetry-worker: a small standalone Worker with a D1
// binding, hit directly from the client via fetch()/sendBeacon(). It writes
// into the SAME participants table the game uses (tagged condition='wiki'),
// plus two wiki-only tables: wiki_page_views and wiki_events.
//
// Routes:
//   POST /participant       - upsert participant identity (idempotent)
//   POST /wiki-page-view    - upsert a page view by view_id (start, then end)
//   POST /wiki-event        - insert a generic interaction event

export interface Env {
  DB: D1Database;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}

interface ParticipantBody {
  user_id: string;
  session_id?: string;
  prolific_pid?: string | null;
  study_id?: string | null;
  prolific_session_id?: string | null;
  app_version?: string | null;
  completed?: boolean;
  final_outcome?: string | null;
  last_event?: string | null;
  last_progress_at?: number | null;
}

/** Finds-or-creates the participant row for this browser/Prolific ID and
 * returns its numeric id. Called on every write so "last_seen_at" and
 * "event_count" stay current without a separate heartbeat. Rows are
 * namespaced with a "wiki:" prefix on participant_key so they can never
 * collide with the game's own key scheme in the same shared table. */
async function upsertParticipant(db: D1Database, body: ParticipantBody): Promise<number> {
  const participantKey = `wiki:${body.prolific_pid ?? body.user_id}`;
  const now = Date.now();

  const existing = await db
    .prepare("SELECT id FROM participants WHERE participant_key = ?")
    .bind(participantKey)
    .first<{ id: number }>();

  if (existing) {
    await db
      .prepare(
        `UPDATE participants SET
           last_seen_at = ?,
           event_count = event_count + 1,
           completed = COALESCE(?, completed),
           final_outcome = COALESCE(?, final_outcome),
           last_event = COALESCE(?, last_event),
           last_progress_at = COALESCE(?, last_progress_at)
         WHERE id = ?`
      )
      .bind(
        now,
        body.completed === undefined ? null : body.completed ? 1 : 0,
        body.final_outcome ?? null,
        body.last_event ?? null,
        body.last_progress_at ?? null,
        existing.id
      )
      .run();
    return existing.id;
  }

  const result = await db
    .prepare(
      `INSERT INTO participants
         (participant_key, user_id, session_id, prolific_pid, study_id, prolific_session_id,
          app_version, first_seen_at, last_seen_at, completed, event_count, condition)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'wiki')`
    )
    .bind(
      participantKey,
      body.user_id,
      body.session_id ?? null,
      body.prolific_pid ?? null,
      body.study_id ?? null,
      body.prolific_session_id ?? null,
      body.app_version ?? null,
      now,
      now,
      body.completed ? 1 : 0
    )
    .run();

  return result.meta.last_row_id as number;
}

interface PageViewBody {
  view_id: string;
  page_slug: string;
  page_title?: string;
  view_index?: number;
  entered_at?: number;
  word_count?: number;
  expected_reading_seconds?: number;
  left_at?: number;
  duration_ms?: number;
  active_duration_ms?: number;
  max_scroll_pct?: number;
  met_minimum_reading_time?: boolean;
}

/** The client calls this endpoint twice per visit: once on arrival (has
 * page_slug/view_index/word_count, no left_at yet) and once on
 * leave/unmount (has left_at/duration_ms/max_scroll_pct). Both calls carry
 * the same view_id, so the second call is an UPDATE, not a second row. */
async function upsertPageView(db: D1Database, participantId: number, body: PageViewBody): Promise<void> {
  const now = Date.now();
  const existing = await db
    .prepare("SELECT id FROM wiki_page_views WHERE view_id = ?")
    .bind(body.view_id)
    .first<{ id: number }>();

  if (existing) {
    await db
      .prepare(
        `UPDATE wiki_page_views SET
           left_at = COALESCE(?, left_at),
           duration_ms = COALESCE(?, duration_ms),
           active_duration_ms = COALESCE(?, active_duration_ms),
           max_scroll_pct = COALESCE(?, max_scroll_pct),
           met_minimum_reading_time = COALESCE(?, met_minimum_reading_time),
           received_at = ?
         WHERE id = ?`
      )
      .bind(
        body.left_at ?? null,
        body.duration_ms ?? null,
        body.active_duration_ms ?? null,
        body.max_scroll_pct ?? null,
        body.met_minimum_reading_time === undefined ? null : body.met_minimum_reading_time ? 1 : 0,
        now,
        existing.id
      )
      .run();
    return;
  }

  await db
    .prepare(
      `INSERT INTO wiki_page_views
         (participant_id, view_id, page_slug, page_title, view_index, entered_at,
          word_count, expected_reading_seconds, received_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      participantId,
      body.view_id,
      body.page_slug,
      body.page_title ?? null,
      body.view_index ?? 0,
      body.entered_at ?? now,
      body.word_count ?? null,
      body.expected_reading_seconds ?? null,
      now
    )
    .run();
}

interface EventBody {
  page_slug?: string;
  event_type: string;
  event_data?: unknown;
  occurred_at?: number;
}

async function insertEvent(db: D1Database, participantId: number, body: EventBody): Promise<void> {
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO wiki_events (participant_id, page_slug, event_type, event_data, occurred_at, received_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(
      participantId,
      body.page_slug ?? null,
      body.event_type,
      body.event_data ? JSON.stringify(body.event_data) : null,
      body.occurred_at ?? now,
      now
    )
    .run();
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (request.method !== "POST") {
      return json({ error: "method not allowed" }, 405);
    }

    const { pathname } = new URL(request.url);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid json" }, 400);
    }

    try {
      if (pathname === "/participant") {
        const id = await upsertParticipant(env.DB, body as unknown as ParticipantBody);
        return json({ ok: true, participant_id: id });
      }

      if (pathname === "/wiki-page-view") {
        const participantId = await upsertParticipant(env.DB, body as unknown as ParticipantBody);
        await upsertPageView(env.DB, participantId, body as unknown as PageViewBody);
        return json({ ok: true });
      }

      if (pathname === "/wiki-event") {
        const participantId = await upsertParticipant(env.DB, body as unknown as ParticipantBody);
        await insertEvent(env.DB, participantId, body as unknown as EventBody);
        return json({ ok: true });
      }

      return json({ error: "not found" }, 404);
    } catch (err) {
      return json({ error: "server error", detail: String(err) }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
