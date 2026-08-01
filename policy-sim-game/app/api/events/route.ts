// Cloudflare Pages Function (via next-on-pages) writing telemetry batches
// into D1. Bind a D1 database named "DB" to this Pages project in the
// Cloudflare dashboard (Settings → Functions → D1 database bindings).

import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  const { events } = await req.json();
  if (!Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0 });
  }

  const db = (process.env as any).DB;

  const stmt = db.prepare(`
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

  await db.batch(batch);
  return NextResponse.json({ ok: true, inserted: batch.length });
}