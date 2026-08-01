export interface Env {
  DB: D1Database;
}

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return (
    // Matches primary domain AND any Cloudflare Pages preview subdomains (e.g. b6d647d7.prime-minister-game.pages.dev)
    /^https:\/\/([a-z0-9-]+\.)?prime-minister-game\.pages\.dev$/.test(origin) ||
    // Local development fallback
    /^http:\/\/localhost(:\d+)?$/.test(origin) ||
    /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)
  );
}

const COMPLETION_EVENT = "final_debrief_closed";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    const allowed = isAllowedOrigin(origin);

    const corsHeaders: Record<string, string> = {
      "Access-Control-Allow-Origin": allowed && origin ? origin : "",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    const { events } = await request.json<{ events: any[] }>();
    if (!Array.isArray(events) || events.length === 0) {
      return Response.json({ ok: true, inserted: 0 }, { headers: corsHeaders });
    }

    const first = events[0];
    const participantKey = first.prolific_pid || first.user_id;
    if (!participantKey) {
      return Response.json({ ok: false, error: "missing participant identity" }, { status: 400, headers: corsHeaders });
    }

    const now = Date.now();

    await env.DB.prepare(`
      INSERT INTO participants (participant_key, user_id, session_id, prolific_pid, study_id, prolific_session_id, app_version, first_seen_at, last_seen_at, event_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(participant_key) DO UPDATE SET
        last_seen_at = excluded.last_seen_at,
        session_id = excluded.session_id,
        app_version = excluded.app_version,
        event_count = event_count + excluded.event_count
    `).bind(
      participantKey, first.user_id ?? null, first.session_id ?? null,
      first.prolific_pid ?? null, first.study_id ?? null, first.prolific_session_id ?? null,
      first.app_version ?? null, now, now, events.length
    ).run();

    const participantRow = await env.DB
      .prepare(`SELECT id FROM participants WHERE participant_key = ?`)
      .bind(participantKey)
      .first<{ id: number }>();

    if (!participantRow) {
      return Response.json({ ok: false, error: "participant lookup failed" }, { status: 500, headers: corsHeaders });
    }
    const participantId = participantRow.id;

    if (events.some((e) => e.event === COMPLETION_EVENT)) {
      await env.DB.prepare(`UPDATE participants SET completed = 1 WHERE id = ?`).bind(participantId).run();
    }

    const stmt = env.DB.prepare(`
      INSERT INTO events (
        participant_id, event, layer, ts, level_id, attempt_id, attempt_number, turn,
        payload, ms_since_last_event, ms_since_last_same_event, received_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `);

    const batch = events.map((e: any) =>
      stmt.bind(
        participantId, e.event, e.layer, e.ts,
        e.level_id ?? null, e.attempt_id ?? null, e.attempt_number ?? null, e.turn ?? null,
        JSON.stringify(e.payload ?? {}),
        e.ms_since_last_event ?? null, e.ms_since_last_same_event ?? null, now
      )
    );

    await env.DB.batch(batch);
    return Response.json({ ok: true, inserted: batch.length, participant_id: participantId }, { headers: corsHeaders });
  },
};