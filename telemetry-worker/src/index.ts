export interface Env {
  DB: D1Database;
}

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return (
    /^https:\/\/([a-z0-9-]+\.)?prime-minister-game\.pages\.dev$/.test(origin) ||
    /^http:\/\/localhost(:\d+)?$/.test(origin) ||
    /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)
  );
}

function corsHeadersFor(origin: string | null): Record<string, string> {
  const allowed = isAllowedOrigin(origin);
  return {
    "Access-Control-Allow-Origin": allowed && origin ? origin : "",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
}

async function upsertParticipant(env: Env, body: any, now: number) {
  const participantKey = body.prolific_pid || body.user_id;
  if (!participantKey) return { ok: false as const, error: "missing participant identity" };

  await env.DB.prepare(`
    INSERT INTO participants (
      participant_key, user_id, session_id, prolific_pid, study_id, prolific_session_id,
      app_version, first_seen_at, last_seen_at, completed, final_outcome,
      last_event, last_cycle, last_attempt_number, last_turn, last_progress_at,
      difficulty_seed, win_threshold_scalars
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(participant_key) DO UPDATE SET
      last_seen_at = excluded.last_seen_at,
      session_id = excluded.session_id,
      app_version = excluded.app_version,
      completed = MAX(participants.completed, excluded.completed),
      final_outcome = COALESCE(excluded.final_outcome, participants.final_outcome),
      last_event = COALESCE(excluded.last_event, participants.last_event),
      last_cycle = COALESCE(excluded.last_cycle, participants.last_cycle),
      last_attempt_number = COALESCE(excluded.last_attempt_number, participants.last_attempt_number),
      last_turn = COALESCE(excluded.last_turn, participants.last_turn),
      last_progress_at = COALESCE(excluded.last_progress_at, participants.last_progress_at),
      difficulty_seed = COALESCE(excluded.difficulty_seed, participants.difficulty_seed),
      win_threshold_scalars = COALESCE(excluded.win_threshold_scalars, participants.win_threshold_scalars)
  `).bind(
    participantKey, body.user_id ?? null, body.session_id ?? null,
    body.prolific_pid ?? null, body.study_id ?? null, body.prolific_session_id ?? null,
    body.app_version ?? null, now, now, body.completed ? 1 : 0, body.final_outcome ?? null,
    body.last_event ?? null, body.last_cycle ?? null, body.last_attempt_number ?? null,
    body.last_turn ?? null, body.last_progress_at ?? null,
    body.difficulty_seed ?? null, 
    body.win_threshold_scalars ? JSON.stringify(body.win_threshold_scalars) : null
  ).run();

  return { ok: true as const, participantKey };
}

async function getParticipantId(env: Env, participantKey: string): Promise<number | null> {
  const row = await env.DB.prepare(`SELECT id FROM participants WHERE participant_key = ?`)
    .bind(participantKey).first<{ id: number }>();
  return row?.id ?? null;
}

async function insertCycleAttempt(env: Env, participantId: number, body: any, now: number) {
  await env.DB.prepare(`
    INSERT INTO cycle_attempts (
      participant_id, attempt_id, cycle, attempt_number, outcome, player_won, app_version,
      starting_score, final_score, score_delta, turns_played,
      time_on_briefing_ms, time_on_term_summary_ms, time_on_verdict_ms,
      time_on_wellbeing_changes_ms, time_on_electorate_feedback_ms, time_on_academic_debrief_ms,
      voter_quotes_clicked, player_viewed_enacted_history, player_viewed_animated_histogram,
      press_conf_q1_correct, press_conf_q2_correct, press_conf_non_chosen_policy_chosen,
      pct_policy_options_previewed, pct_policy_options_view_details_opened,
      total_cycle_duration_ms, turns, received_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(attempt_id) DO NOTHING
  `).bind(
    participantId, body.attempt_id, body.cycle ?? null, body.attempt_number ?? null,
    body.outcome ?? null, body.player_won === null || body.player_won === undefined ? null : (body.player_won ? 1 : 0),
    body.starting_score ?? null, body.final_score ?? null, body.score_delta ?? null, body.turns_played ?? null,
    body.time_on_briefing_ms ?? null, body.time_on_term_summary_ms ?? null, body.time_on_verdict_ms ?? null,
    body.time_on_wellbeing_changes_ms ?? null, body.time_on_electorate_feedback_ms ?? null, body.time_on_academic_debrief_ms ?? null,
    body.voter_quotes_clicked ?? 0,
    body.player_viewed_enacted_history ? 1 : 0, body.player_viewed_animated_histogram ? 1 : 0,
    body.press_conf_q1_correct === null || body.press_conf_q1_correct === undefined ? null : (body.press_conf_q1_correct ? 1 : 0),
    body.press_conf_q2_correct === null || body.press_conf_q2_correct === undefined ? null : (body.press_conf_q2_correct ? 1 : 0),
    body.press_conf_non_chosen_policy_chosen === null || body.press_conf_non_chosen_policy_chosen === undefined ? null : (body.press_conf_non_chosen_policy_chosen ? 1 : 0),
    body.pct_policy_options_previewed ?? null, body.pct_policy_options_view_details_opened ?? null,
    body.total_cycle_duration_ms ?? null, typeof body.turns !== "undefined" ? JSON.stringify(body.turns) : "[]", now
  ).run();
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    const corsHeaders = corsHeadersFor(origin);

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

    // Wrapping EVERYTHING in a try/catch guarantees we always return CORS headers
    try {
      const url = new URL(request.url);
      const now = Date.now();
      const body = await request.json<any>();

      if (url.pathname === "/participant") {
        const result = await upsertParticipant(env, body, now);
        return Response.json(result, { status: result.ok ? 200 : 400, headers: corsHeaders });
      }

      if (url.pathname === "/cycle-attempt") {
        // Re-declare participantKey here so the endpoint can use it
        const participantKey = body.prolific_pid || body.user_id;
        
        if (!participantKey || !body.attempt_id) {
          return Response.json({ ok: false, error: "missing participant identity or attempt_id" }, { status: 400, headers: corsHeaders });
        }
        
        await upsertParticipant(env, body, now);
        const participantId = await getParticipantId(env, participantKey);
        
        if (!participantId) {
          return Response.json({ ok: false, error: "participant lookup failed" }, { status: 500, headers: corsHeaders });
        }
        
        await insertCycleAttempt(env, participantId, body, now);
        return Response.json({ ok: true, participant_id: participantId }, { headers: corsHeaders });
      }

      return Response.json({ ok: false, error: "unknown route" }, { status: 404, headers: corsHeaders });
      
    } catch (err: any) {
      console.error("Worker error:", err);
      // Even if the DB fails, this catch block ensures the frontend receives the error correctly
      return Response.json({ ok: false, error: String(err?.message ?? err) }, { status: 500, headers: corsHeaders });
    }
  },
};