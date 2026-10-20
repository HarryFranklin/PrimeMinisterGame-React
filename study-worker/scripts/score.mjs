// Scores the knowledge questions using /study-kit/answer-key.json and the
// chart data in /study-kit/src/content/charts.json. Used by export.mjs.
//
// Scoring rules
//   single / number   1 if correct, else 0 ("I don't know" = 0)
//   grid / chart_grid 1 per correct row (so lo3_2 is out of 3)
//   multi             1 if exactly the correct set is ticked ("exact"); also a
//                     partial score = share of the 4 options classified correctly
//   chart             correct answer = society with the highest mean / highest
//                     floor (lowest score present) / largest spread (SD)
// Totals per section: pre_numeracy, pre_lo1, post_lo1 … post_lo4, post_total
// (post_total = LO2–LO4, the taught content; LO1 is the covariate).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const kit = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'study-kit');
export const KEY = JSON.parse(readFileSync(join(kit, 'answer-key.json'), 'utf8'));
const CHARTS = JSON.parse(readFileSync(join(kit, 'src', 'content', 'charts.json'), 'utf8'));

function measure(id, m) {
  const c = CHARTS[id]?.counts;
  if (!c) return null;
  const n = c.reduce((a, b) => a + b, 0);
  const mean = c.reduce((s, k, i) => s + k * i, 0) / n;
  if (m === 'mean') return mean;
  if (m === 'floor') return c.findIndex((k) => k > 0);
  if (m === 'spread') return Math.sqrt(c.reduce((s, k, i) => s + k * (i - mean) ** 2, 0) / n);
  return null;
}

/** The option whose society has the largest value of the measure (null if tied/missing). */
export function chartAnswer(options, m) {
  const vals = Object.entries(options).map(([opt, id]) => [opt, measure(id, m)]);
  if (vals.some(([, v]) => v === null)) return null;
  vals.sort((a, b) => b[1] - a[1]);
  return vals.length > 1 && Math.abs(vals[0][1] - vals[1][1]) < 1e-9 ? null : vals[0][0];
}

function scoreItem(spec, ans) {
  const out = {};
  switch (spec.type) {
    case 'single':
      out[''] = ans === undefined ? '' : ans === spec.correct ? 1 : 0;
      break;
    case 'number':
      out[''] = ans === undefined ? '' : Number(ans) === spec.correct ? 1 : 0;
      break;
    case 'chart': {
      const correct = chartAnswer(spec.options, spec.measure);
      out[''] = ans === undefined || correct === null ? '' : ans === correct ? 1 : 0;
      break;
    }
    case 'grid':
      for (const [row, correct] of Object.entries(spec.correct)) out[`_${row}`] = ans?.[row] === undefined ? '' : ans[row] === correct ? 1 : 0;
      break;
    case 'chart_grid':
      for (const [row, m] of Object.entries(spec.rows)) {
        const correct = chartAnswer(spec.options, m);
        out[`_${row}`] = ans?.[row] === undefined || correct === null ? '' : ans[row] === correct ? 1 : 0;
      }
      break;
    case 'multi': {
      if (ans === undefined) { out[''] = ''; out['_partial'] = ''; break; }
      const picked = new Set(Array.isArray(ans) ? ans : String(ans).split('|').filter(Boolean));
      const right = new Set(spec.correct);
      const ok = spec.options.filter((o) => picked.has(o) === right.has(o)).length;
      out[''] = ok === spec.options.length ? 1 : 0;
      out['_partial'] = +(ok / spec.options.length).toFixed(2);
      break;
    }
  }
  return out;
}

/** Score one phase's answers → { score_<item>[_row]: 0/1, <section>: total, … } */
export function scorePhase(phase, answers) {
  const cols = {};
  if (!answers) return cols;
  for (const [section, items] of Object.entries(KEY[phase] ?? {})) {
    let total = '';
    for (const [id, spec] of Object.entries(items)) {
      for (const [suffix, v] of Object.entries(scoreItem(spec, answers[id]))) {
        cols[`${phase}_score_${id}${suffix}`] = v;
        if (suffix !== '_partial' && v !== '') total = (total === '' ? 0 : total) + v;
      }
    }
    cols[`${phase}_${section}`] = total;
  }
  if (phase === 'post') {
    const parts = ['lo2', 'lo3', 'lo4'].map((s) => cols[`post_${s}`]);
    cols.post_total = parts.every((p) => p === '') ? '' : parts.reduce((a, b) => a + (b === '' ? 0 : b), 0);
  }
  return cols;
}

/** Maximum possible per section, for reference. */
export function maxScores() {
  const max = {};
  for (const phase of ['pre', 'post'])
    for (const [section, items] of Object.entries(KEY[phase] ?? {}))
      max[`${phase}_${section}`] = Object.values(items).reduce(
        (s, spec) => s + (spec.type === 'grid' ? Object.keys(spec.correct).length : spec.type === 'chart_grid' ? Object.keys(spec.rows).length : 1), 0);
  max.post_total = max.post_lo2 + max.post_lo3 + max.post_lo4;
  return max;
}
