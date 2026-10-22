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
// The marking itself lives in study-kit/scoring.mjs (shared with the worker's /results).
import { markItem, itemMax, chartAnswer as sharedChartAnswer } from '../../study-kit/scoring.mjs';

const kit = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'study-kit');
export const KEY = JSON.parse(readFileSync(join(kit, 'answer-key.json'), 'utf8'));
const CHARTS = JSON.parse(readFileSync(join(kit, 'src', 'content', 'charts.json'), 'utf8'));

/** The option whose society has the largest value of the measure (null if tied/missing). */
export function chartAnswer(options, m) {
  return sharedChartAnswer(CHARTS, options, m);
}

/** Score one phase's answers → { score_<item>[_row]: 0/1, <section>: total, … } */
export function scorePhase(phase, answers) {
  const cols = {};
  if (!answers) return cols;
  for (const [section, items] of Object.entries(KEY[phase] ?? {})) {
    let total = '';
    for (const [id, spec] of Object.entries(items)) {
      for (const [suffix, v] of Object.entries(markItem(spec, answers[id], CHARTS).marks)) {
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
      max[`${phase}_${section}`] = Object.values(items).reduce((s, spec) => s + itemMax(spec), 0);
  max.post_total = max.post_lo2 + max.post_lo3 + max.post_lo4;
  return max;
}
