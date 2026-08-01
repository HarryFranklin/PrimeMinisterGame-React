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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    const allowed = isAllowedOrigin(origin);

    const corsHeaders = {
      // Dynamically echo back the exact requesting origin if it matches the pattern
      "Access-Control-Allow-Origin": allowed && origin ? origin : "",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin", // Prevents browsers/CDNs from caching CORS responses for different subdomains
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

    const stmt = env.DB.prepare(`
      INSERT INTO events (
        event, layer, ts, user_id, session_id, prolific_pid, study_id,
        prolific_session_id, level_id, attempt_id, attempt_number, turn,
        app_version, payload, ms_since_last_event, ms_since_last_same_event, received_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `);

    const receivedAt = Date.now();
    const batch = events.map((e: any) =>
      stmt.bind(
        e.event, e.layer, e.ts, e.user_id, e.session_id,
        e.prolific_pid ?? null, e.study_id ?? null, e.prolific_session_id ?? null,
        e.level_id ?? null, e.attempt_id ?? null, e.attempt_number ?? null, e.turn ?? null,
        e.app_version ?? null, JSON.stringify(e.payload ?? {}),
        e.ms_since_last_event ?? null, e.ms_since_last_same_event ?? null, receivedAt
      )
    );

    await env.DB.batch(batch);
    return Response.json({ ok: true, inserted: batch.length }, { headers: corsHeaders });
  },
};