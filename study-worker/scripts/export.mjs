// Export the study database to CSV files for analysis.
//
//   node scripts/export.mjs            → reads the live (remote) database
//   node scripts/export.mjs --local    → reads your local test database
//
// Writes to ./exports/<date-time>/ (git-ignored):
//   participants.csv   one row per participant: status, timings, consent,
//                      SCORES (pre_numeracy, pre_lo1, post_lo1…post_lo4,
//                      post_total + one score_ column per item), then every
//                      baseline (pre_*) and post-test (post_*) answer
//   game_attempts.csv  one row per game term attempt, in the order played
//                      (attempt_seq), incl. one still in progress (complete=false):
//                      outcome, path_label, per-screen timings, best-option roll-ups
//   game_turns.csv     one row per turn within each attempt (picks, timings,
//                      option effects, best option / rank, approval)
//   game_events.csv    every deliberate action in the game, one row each: inside
//                      term attempts (scope=attempt) and outside them (scope=session:
//                      intro, level select, LS screen, elicitation, final debrief)
//   wiki_views.csv     one row per wiki page visit
//   raw.json           everything, exactly as stored (back-up/reference)
//
// Every file has `pid`, `mode` (live/pilot/test) and `condition`, so you can
// filter out pilot/test rows and join the files together.
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { scorePhase, maxScores, KEY } from './score.mjs';

const remote = !process.argv.includes('--local');
const cmd = `npx wrangler d1 execute policy-sim-telemetry ${remote ? '--remote' : '--local'} --json --command "SELECT * FROM participants ORDER BY id"`;
console.log(`Reading ${remote ? 'REMOTE' : 'local'} database…`);
const out = execSync(cmd, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 512, stdio: ['ignore', 'pipe', 'inherit'] });
const rows = JSON.parse(out.slice(out.indexOf('[')))[0].results;

const parse = (s) => { try { return s ? JSON.parse(s) : null; } catch { return null; } };
const iso = (ms) => (typeof ms === 'number' ? new Date(ms).toISOString() : '');
const flat = (v) => (v === null || v === undefined ? '' : Array.isArray(v) ? v.join('|') : typeof v === 'object' ? JSON.stringify(v) : v);

/** Multi-select answers seen, e.g. 'pre_gaming_types' → its 1/0 columns are filled in below. */
const MULTI = new Set();

/** Questionnaire answers → columns: grids become one column per row (q_row); multi-selects are a|b
 * plus one 1/0 column per option (q__option, e.g. pre_gaming_types__puzzle). */
function answerCols(prefix, cell) {
  const cols = {};
  for (const [id, v] of Object.entries(cell?.answers ?? {})) {
    if (v && typeof v === 'object' && !Array.isArray(v)) for (const [row, rv] of Object.entries(v)) cols[`${prefix}${id}_${row}`] = rv;
    else cols[`${prefix}${id}`] = flat(v);
    if (Array.isArray(v)) {
      MULTI.add(`${prefix}${id}`);
      for (const o of v) cols[`${prefix}${id}__${o}`] = 1;
    }
  }
  for (const [page, m] of Object.entries(cell?.pages ?? {})) cols[`${prefix}page_${page}_ms`] = m?.dwell_ms ?? '';
  return cols;
}

const participants = [], attempts = [], turns = [], views = [], events = [];
for (const r of rows) {
  const pis = parse(r.pis), consent = parse(r.consent), pre = parse(r.pretest), post = parse(r.posttest), act = parse(r.activity);
  const base = { pid: r.pid, mode: r.mode, condition: r.condition };
  participants.push({
    ...base,
    created: iso(r.created_at), last_seen: iso(r.last_seen_at), stage: r.stage,
    consent_status: r.consent_status, consent_signed: iso(r.consent_signed_at), completed: iso(r.completed_at),
    total_minutes: r.completed_at ? ((r.completed_at - r.created_at) / 60000).toFixed(1) : '',
    app_version: r.app_version, origin: r.origin, sync_count: r.sync_count,
    pis_version: pis?.version ?? '', pis_ms: pis?.dwell_ms ?? '', pis_reached_end: flat(pis?.reached_end), pis_downloaded: flat(pis?.downloaded),
    consent_version: consent?.version ?? '', consent_unticks: consent?.untick_count ?? '',
    questionnaire_version: pre?.version ?? post?.version ?? '',
    pre_minutes: pre?.completed_at && pre?.started_at ? ((pre.completed_at - pre.started_at) / 60000).toFixed(1) : '',
    post_minutes: post?.completed_at && post?.started_at ? ((post.completed_at - post.started_at) / 60000).toFixed(1) : '',
    ls_intro_ms: act?.ls?.dwell_ms ?? act?.ls_intro?.dwell_ms ?? '',
    game_attempts: r.condition === 'game' ? (act?.attempts?.length ?? 0) : '',
    wiki_pages_completed: r.condition === 'wiki' ? Object.keys(act?.completed_pages ?? {}).length : '',
    wiki_finish: r.condition === 'wiki' ? (act?.completion?.outcome ?? '') : '',
    last_event: act?.last?.event ?? '',
    answer_key: KEY.version,
    ...scorePhase('pre', pre?.answers),
    ...scorePhase('post', post?.answers),
    ...answerCols('pre_', pre),
    ...answerCols('post_', post),
  });

  if (r.condition === 'game') {
    const el = act?.elicitation ?? {};
    const p = participants[participants.length - 1];
    for (const block of ['social', 'personal']) {
      for (const [ls, u] of Object.entries(el[block]?.utilities ?? {})) p[`elic_${block}_u${ls}`] = u;
      for (const [pt, risk] of Object.entries(el[block]?.loss_risks ?? {})) p[`elic_${block}_risk${pt}`] = risk;
      p[`elic_${block}_ms`] = el[block]?.dwell_ms ?? '';
    }
    // Difficulty per term (random-walk calibration) and the player's path.
    p.difficulty_seed = act?.setup?.difficulty_seed ?? '';
    for (const [term, d] of Object.entries(act?.setup?.difficulty ?? {})) {
      p[`diff_${term}_scalar`] = d?.scalar ?? '';
      p[`diff_${term}_sim_win_rate`] = d?.simulated_win_rate ?? '';
      p[`diff_${term}_max_score`] = d?.max_score ?? '';
      p[`diff_${term}_threshold`] = d?.threshold ?? '';
    }
    const all = [...(act?.attempts ?? []), ...(act?.open_attempt ? [{ ...act.open_attempt, complete: false }] : [])];
    p.game_path = all.map((a) => a.path_label ?? `${a.cycle}_${a.player_won === true ? 'won' : a.player_won === false ? 'fail' : 'incomplete'}`).join(' > ');
    p.game_terms_won = new Set(all.filter((a) => a.won ?? a.player_won).map((a) => a.cycle)).size;
    p.game_attempts_incl_unfinished = all.length;
    for (const term of ['Benthamite', 'Rawlsian', 'SocietalUtility', 'PersonalUtility']) {
      p[`game_${term}_attempts`] = all.filter((a) => a.cycle === term).length;
    }
    p.game_page_loads = act?.loads?.length ?? '';
    p.game_minutes = all.length ? ((Math.max(...all.map((a) => a.ended_at ?? 0)) - Math.min(...all.map((a) => a.started_at ?? Infinity))) / 60000).toFixed(1) : '';

    all.forEach((a, i) => {
      const { turns: t, screens, timeline, ...rest } = a;
      const row = { ...base, attempt_seq: i + 1 };
      for (const [k, v] of Object.entries(rest)) row[k] = flat(v);
      for (const [k, v] of Object.entries(screens ?? {})) row[k] = flat(v);
      row.started = iso(a.started_at);
      attempts.push(row);
      const ctx = { attempt_seq: i + 1, attempt_id: a.attempt_id, cycle: a.cycle, attempt_number: a.attempt_number };
      for (const turn of t ?? []) {
        const tr = { ...base, ...ctx };
        for (const [k, v] of Object.entries(turn)) tr[k] = flat(v);
        turns.push(tr);
      }
      for (const [dt, event, turn, payload] of timeline ?? []) {
        const ts = (a.started_at ?? 0) + dt;
        events.push({ ...base, scope: 'attempt', ...ctx, ts_ms: ts, time: iso(ts), t_in_attempt_ms: dt, turn: turn ?? '', event, payload: payload ? JSON.stringify(payload) : '' });
      }
    });
    for (const [ts, event, payload] of act?.session ?? []) {
      events.push({ ...base, scope: 'session', ts_ms: ts, time: iso(ts), event, payload: payload ? JSON.stringify(payload) : '' });
    }
  } else if (r.condition === 'wiki') {
    for (const v of act?.views ?? []) {
      views.push({ ...base, ...v, entered: iso(v.entered_at), words: act?.totals?.[v.slug]?.words ?? '', completed_at: iso(act?.completed_pages?.[v.slug]) });
    }
  }
}

// Multi-select 1/0 columns: 0 for anyone who answered the question but didn't tick that option
// (blank if they never reached it). Only options someone ticked get a column.
for (const base of MULTI) {
  const optCols = [...new Set(participants.flatMap((p) => Object.keys(p).filter((k) => k.startsWith(`${base}__`))))];
  for (const p of participants) if (p[base] !== undefined) for (const c of optCols) p[c] ??= 0;
}

const dir = join('exports', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19));
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'participants.csv'), toCsv(participants));
writeFileSync(join(dir, 'game_attempts.csv'), toCsv(attempts));
writeFileSync(join(dir, 'game_turns.csv'), toCsv(turns));
writeFileSync(join(dir, 'game_events.csv'), toCsv(events.sort((x, y) => (x.pid < y.pid ? -1 : x.pid > y.pid ? 1 : x.ts_ms - y.ts_ms))));
writeFileSync(join(dir, 'wiki_views.csv'), toCsv(views));
writeFileSync(join(dir, 'raw.json'), JSON.stringify(rows, null, 2));
writeFileSync(join(dir, 'max_scores.json'), JSON.stringify({ answer_key: KEY.version, ...maxScores() }, null, 2));
console.log(`${rows.length} participants, ${attempts.length} game attempts, ${turns.length} turns, ${events.length} game events, ${views.length} wiki views → ${dir}`);
