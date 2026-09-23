// Wiki telemetry worker.
//
// One route. The wiki client sends its whole session payload; this worker
// upserts it into the participant's single row in the shared participants
// table (condition = 'wiki'). One sync = one row written.
//
//   POST /wiki-sync   body: identity fields + { payload, completed?, final_outcome? }

export interface Env {
  DB: D1Database;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const MAX_BODY_BYTES = 256 * 1024;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}

interface SyncBody {
  user_id: string;
  prolific_pid?: string | null;
  session_id?: string | null;
  prolific_session_id?: string | null;
  study_id?: string | null;
  app_version?: string | null;
  payload: { seq: number } & Record<string, unknown>;
  completed?: boolean;
  final_outcome?: string | null;
}

/** Inserts the participant on their first sync, and on every later sync
 * replaces wiki_payload — unless the stored copy is newer (higher seq),
 * which can happen if two requests arrive out of order.
 *
 * Row keys are namespaced "wiki:" so they can never collide with the
 * game's own participant_key scheme in the same table. Once a participant
 * is marked completed, it stays completed and keeps its first final_outcome. */
async function syncParticipant(db: D1Database, body: SyncBody): Promise<void> {
  const participantKey = `wiki:${body.prolific_pid || body.user_id}`;
  const now = Date.now();

  await db
    .prepare(
      `INSERT INTO participants
         (participant_key, user_id, session_id, prolific_pid, study_id, prolific_session_id,
          app_version, first_seen_at, last_seen_at, completed, final_outcome, event_count,
          condition, wiki_payload)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'wiki', ?)
       ON CONFLICT(participant_key) DO UPDATE SET
         last_seen_at  = excluded.last_seen_at,
         event_count   = participants.event_count + 1,
         completed     = MAX(participants.completed, excluded.completed),
         final_outcome = COALESCE(participants.final_outcome, excluded.final_outcome),
         wiki_payload  = CASE
           WHEN participants.wiki_payload IS NULL
             OR json_extract(excluded.wiki_payload, '$.seq') >= json_extract(participants.wiki_payload, '$.seq')
           THEN excluded.wiki_payload
           ELSE participants.wiki_payload
         END`
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
      body.completed ? 1 : 0,
      body.final_outcome ?? null,
      JSON.stringify(body.payload)
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
    if (pathname !== "/wiki-sync") {
      return json({ error: "not found" }, 404);
    }

    // Read as text: the client sends text/plain (sendBeacon + no preflight).
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) {
      return json({ error: "payload too large" }, 413);
    }

    let body: SyncBody;
    try {
      body = JSON.parse(text);
    } catch {
      return json({ error: "invalid json" }, 400);
    }

    if (
      typeof body?.user_id !== "string" ||
      typeof body.payload !== "object" ||
      body.payload === null ||
      typeof body.payload.seq !== "number"
    ) {
      return json({ error: "missing user_id or payload" }, 400);
    }

    try {
      await syncParticipant(env.DB, body);
      return json({ ok: true });
    } catch (err) {
      return json({ error: "server error", detail: String(err) }, 500);
    }
  },
} satisfies ExportedHandler<Env>;