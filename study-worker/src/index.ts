// Study worker – the only backend for the study (game + wiki).
//
//   GET  /start   Entry point. Prolific links here. Creates the participant's
//                 row, assigns game or wiki, and redirects to that app.
//   POST /sync    The apps send the participant's progress here. One call =
//                 one row written, however much changed.
//   GET  /state   ?pid=…&t=… → the participant's saved progress. The apps call
//                 it on every page load and keep whichever copy is newer, so a
//                 refresh can never put someone back to an older point.
//   GET  /health  Quick check that the worker and database respond.
//
// /start query parameters
//   Live (Prolific):  ?PROLIFIC_PID=…&STUDY_ID=…&SESSION_ID=…
//   Pilot:            ?mode=pilot[&condition=game|wiki]   (new PILOT_ id each visit)
//   Test:             ?mode=test[&condition=game|wiki]    (new TEST_ id each visit)
//   Add &format=json to get {pid, token, mode, condition, url} back instead of
//   a redirect (the apps use this when opened directly during development).

export interface Env {
  DB: D1Database;
  GAME_URL: string;
  WIKI_URL: string;
  GAME_SHARE: string;
}

type Mode = 'live' | 'pilot' | 'test';
type Condition = 'game' | 'wiki';
const CELLS = ['pis', 'consent', 'pretest', 'activity', 'posttest'] as const;
type Cell = (typeof CELLS)[number];

// The game's activity record carries every term attempt's action timeline
// (the game keeps it under 1.3 MB); D1's limit is 2 MB per row.
const MAX_BODY_BYTES = 1_900_000;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

// ---------------------------------------------------------------------------
// CORS: only our own sites (incl. preview builds) and localhost.
// ---------------------------------------------------------------------------
function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  const ok =
    /^https:\/\/([a-z0-9-]+\.)?prime-minister-game\.pages\.dev$/.test(origin) ||
    /^https:\/\/([a-z0-9-]+\.)?wiki-project\.pages\.dev$/.test(origin) ||
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  return ok ? origin : null;
}

function withCors(res: Response, origin: string | null): Response {
  const allowed = allowedOrigin(origin);
  if (!allowed) return res;
  const headers = new Headers(res.headers);
  headers.set('Access-Control-Allow-Origin', allowed);
  headers.set('Access-Control-Allow-Credentials', 'true'); // sendBeacon sends credentials
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  headers.set('Vary', 'Origin');
  return new Response(res.body, { status: res.status, headers });
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

function randomId(bytes: number): string {
  const b = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------
// Group assignment (live participants only).
// Efron's biased coin: when the groups are on target, assign at random using
// the target share; otherwise send the person to the under-filled group with
// probability 2/3. Stays unpredictable but keeps the groups close.
// Counts exclude pilot/test rows and people who declined consent.
// ---------------------------------------------------------------------------
async function assignCondition(env: Env): Promise<Condition> {
  const share = Math.min(1, Math.max(0, Number(env.GAME_SHARE) || 0.5));
  if (share >= 1) return 'game';
  if (share <= 0) return 'wiki';

  const { results } = await env.DB.prepare(
    `SELECT condition, COUNT(*) AS n FROM participants
      WHERE mode = 'live' AND consent_status != 'declined'
      GROUP BY condition`
  ).all<{ condition: Condition; n: number }>();
  const n = { game: 0, wiki: 0 };
  for (const r of results ?? []) n[r.condition] = r.n;

  // How far each group is from its target, in "participants per unit share".
  const gameLoad = n.game / share;
  const wikiLoad = n.wiki / (1 - share);
  const r = Math.random();
  if (Math.abs(gameLoad - wikiLoad) < 1e-9) return r < share ? 'game' : 'wiki';
  const under: Condition = gameLoad < wikiLoad ? 'game' : 'wiki';
  const over: Condition = under === 'game' ? 'wiki' : 'game';
  return r < 2 / 3 ? under : over;
}

function appUrl(env: Env, condition: Condition, pid: string, token: string, mode: Mode): string {
  const url = new URL(condition === 'game' ? env.GAME_URL : env.WIKI_URL);
  url.searchParams.set('pid', pid);
  url.searchParams.set('t', token);
  url.searchParams.set('mode', mode);
  return url.toString();
}

// ---------------------------------------------------------------------------
// GET /start
// ---------------------------------------------------------------------------
async function handleStart(request: Request, env: Env): Promise<Response> {
  const q = new URL(request.url).searchParams;
  const asJson = q.get('format') === 'json';
  const prolificPid = q.get('PROLIFIC_PID');
  const requested = q.get('condition');
  const forced: Condition | null = requested === 'game' || requested === 'wiki' ? requested : null;

  let mode: Mode;
  let pid: string;
  if (prolificPid) {
    if (!ID_PATTERN.test(prolificPid)) return json({ error: 'invalid PROLIFIC_PID' }, 400);
    mode = 'live';
    pid = prolificPid;
  } else if (q.get('mode') === 'pilot' || q.get('mode') === 'test') {
    mode = q.get('mode') as Mode;
    pid = `${mode.toUpperCase()}_${randomId(5)}`;
  } else {
    return json({ error: 'missing PROLIFIC_PID or mode=pilot|test' }, 400);
  }

  // Returning live participant: same row, same group.
  let row = await env.DB.prepare(`SELECT pid, token, mode, condition FROM participants WHERE pid = ?`)
    .bind(pid)
    .first<{ pid: string; token: string; mode: Mode; condition: Condition }>();

  if (!row) {
    // Live: balanced assignment (a `condition` param is ignored so a
    // participant can't pick). Pilot/test: use the requested condition, or 50/50.
    const condition: Condition =
      mode === 'live' ? await assignCondition(env) : forced ?? (Math.random() < 0.5 ? 'game' : 'wiki');
    const token = randomId(16);
    const now = Date.now();
    await env.DB.prepare(
      `INSERT INTO participants
         (pid, token, mode, condition, prolific_pid, study_id, prolific_session_id, created_at, last_seen_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(pid) DO NOTHING`
    )
      .bind(pid, token, mode, condition,
        mode === 'live' ? pid : null, q.get('STUDY_ID'), q.get('SESSION_ID'), now, now)
      .run();
    // Re-read: if two /start calls raced, both get whichever row won.
    row = await env.DB.prepare(`SELECT pid, token, mode, condition FROM participants WHERE pid = ?`)
      .bind(pid)
      .first<{ pid: string; token: string; mode: Mode; condition: Condition }>();
    if (!row) return json({ error: 'could not create participant' }, 500);
  }

  const url = appUrl(env, row.condition, row.pid, row.token, row.mode);
  if (asJson) return json({ pid: row.pid, token: row.token, mode: row.mode, condition: row.condition, url });
  return Response.redirect(url, 302);
}

// ---------------------------------------------------------------------------
// POST /sync
// Body (sent as text/plain so browsers skip the CORS preflight):
//   { pid, t, app_version?, stage?, consent_status?: 'signed'|'declined',
//     completed?: true, final_outcome?, cells?: { pis?, consent?, pretest?, activity?, posttest? } }
// Each cell is a JSON object carrying its own version number `_v`. A cell is
// only replaced if the incoming `_v` is higher than the stored one, so a
// late-arriving older request can never overwrite newer data, and a sync only
// needs to include the cells that changed.
// ---------------------------------------------------------------------------
interface SyncBody {
  pid: string;
  t: string;
  app_version?: string | null;
  stage?: string | null;
  consent_status?: 'signed' | 'declined' | null;
  completed?: boolean;
  final_outcome?: string | null;
  cells?: Partial<Record<Cell, { _v: number } & Record<string, unknown>>>;
}

const STAGES = ['pis', 'consent', 'pretest', 'activity', 'posttest', 'done', 'declined'];
/** SQL for a stage's position in the study (declined counts as finished). */
function stageRank(expr: string): string {
  return `(CASE ${expr} WHEN 'pis' THEN 0 WHEN 'consent' THEN 1 WHEN 'pretest' THEN 2 WHEN 'activity' THEN 3 WHEN 'posttest' THEN 4 WHEN 'done' THEN 5 WHEN 'declined' THEN 5 ELSE -1 END)`;
}

/** GET /state – the participant's saved progress (needs their secret token). */
async function handleState(request: Request, env: Env): Promise<Response> {
  const q = new URL(request.url).searchParams;
  const pid = q.get('pid') ?? '';
  const t = q.get('t') ?? '';
  if (!ID_PATTERN.test(pid) || !t) return json({ error: 'missing pid or token' }, 400);
  const row = await env.DB.prepare(
    `SELECT stage, consent_status, completed_at, final_outcome, ${CELLS.join(', ')} FROM participants WHERE pid = ?1 AND token = ?2`
  )
    .bind(pid, t)
    .first<Record<string, unknown>>();
  if (!row) return json({ error: 'unknown participant or token' }, 404);
  const cells: Record<string, unknown> = {};
  for (const c of CELLS) {
    if (typeof row[c] !== 'string') continue;
    try {
      cells[c] = JSON.parse(row[c] as string);
    } catch {
      /* unreadable cell: leave it out */
    }
  }
  return json({
    stage: STAGES.includes(row.stage as string) ? row.stage : null,
    consent_status: row.consent_status ?? null,
    completed: !!row.completed_at,
    final_outcome: row.final_outcome ?? null,
    cells,
  });
}

async function handleSync(request: Request, env: Env): Promise<Response> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return json({ error: 'payload too large' }, 413);

  let body: SyncBody;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: 'invalid json' }, 400);
  }
  if (typeof body?.pid !== 'string' || typeof body.t !== 'string') {
    return json({ error: 'missing pid or token' }, 400);
  }

  const cellValues: Record<Cell, string | null> = { pis: null, consent: null, pretest: null, activity: null, posttest: null };
  for (const c of CELLS) {
    const v = body.cells?.[c];
    if (v === undefined || v === null) continue;
    if (typeof v !== 'object' || typeof v._v !== 'number') return json({ error: `cell ${c} needs a numeric _v` }, 400);
    cellValues[c] = JSON.stringify(v);
  }
  const consentStatus = body.consent_status === 'signed' || body.consent_status === 'declined' ? body.consent_status : null;
  const now = Date.now();
  const origin = request.headers.get('Origin');

  // ?1 now, ?2 origin, ?3 app_version, ?4 stage, ?5 consent_status,
  // ?6 completed (0/1), ?7 final_outcome, ?8–?12 cells, ?13 pid, ?14 token
  const cellSql = CELLS.map(
    (c, i) => `${c} = CASE WHEN ?${8 + i} IS NOT NULL AND (${c} IS NULL OR
        json_extract(?${8 + i}, '$._v') > COALESCE(json_extract(${c}, '$._v'), -1))
      THEN ?${8 + i} ELSE ${c} END`
  ).join(',\n      ');

  const result = await env.DB.prepare(
    `UPDATE participants SET
      last_seen_at      = ?1,
      sync_count        = sync_count + 1,
      origin            = COALESCE(origin, ?2),
      app_version       = COALESCE(?3, app_version),
      -- the stage only ever moves forward (an out-of-date tab can't move it back)
      stage             = CASE WHEN ?4 IS NOT NULL AND ${stageRank('?4')} >= ${stageRank('stage')} THEN ?4 ELSE stage END,
      consent_status    = CASE WHEN consent_status = 'pending' AND ?5 IS NOT NULL THEN ?5 ELSE consent_status END,
      consent_signed_at = CASE WHEN consent_signed_at IS NULL AND ?5 = 'signed' THEN ?1 ELSE consent_signed_at END,
      completed_at      = CASE WHEN completed_at IS NULL AND ?6 = 1 THEN ?1 ELSE completed_at END,
      final_outcome     = COALESCE(final_outcome, ?7),
      ${cellSql}
    WHERE pid = ?13 AND token = ?14`
  )
    .bind(
      now, origin, body.app_version ?? null, body.stage ?? null, consentStatus,
      body.completed ? 1 : 0, body.final_outcome ?? null,
      cellValues.pis, cellValues.consent, cellValues.pretest, cellValues.activity, cellValues.posttest,
      body.pid, body.t
    )
    .run();

  if (!result.meta.changes) return json({ error: 'unknown participant or token' }, 404);
  return json({ ok: true });
}

// ---------------------------------------------------------------------------
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');
    if (request.method === 'OPTIONS') return withCors(new Response(null, { status: 204 }), origin);

    const { pathname } = new URL(request.url);
    try {
      let res: Response;
      if (pathname === '/start' && request.method === 'GET') res = await handleStart(request, env);
      else if (pathname === '/sync' && request.method === 'POST') res = await handleSync(request, env);
      else if (pathname === '/state' && request.method === 'GET') res = await handleState(request, env);
      else if (pathname === '/health') {
        await env.DB.prepare('SELECT 1').first();
        res = json({ ok: true });
      } else res = json({ error: 'not found' }, 404);
      return withCors(res, origin);
    } catch (err) {
      console.error('study-worker error', err);
      return withCors(json({ error: 'server error' }, 500), origin);
    }
  },
} satisfies ExportedHandler<Env>;
