// Marking – ONE implementation, used by:
//   - study-worker/scripts/score.mjs  (the export's score columns)
//   - study-worker/src/index.ts       (GET /results – the participant's "See my answers" page)
// Kept OUTSIDE study-kit/src (like answer-key.json) so answers are never shipped
// to participants' browsers.
//
// key    = answer-key.json            charts = src/content/charts.json

/** mean / floor (lowest score present) / spread (standard deviation) of a chart. */
export function measure(charts, id, m) {
  const c = charts[id]?.counts;
  if (!c) return null;
  const n = c.reduce((a, b) => a + b, 0);
  const mean = c.reduce((s, k, i) => s + k * i, 0) / n;
  if (m === 'mean') return mean;
  if (m === 'floor') return c.findIndex((k) => k > 0);
  if (m === 'spread') return Math.sqrt(c.reduce((s, k, i) => s + k * (i - mean) ** 2, 0) / n);
  return null;
}

/** The option whose society has the largest value of the measure (null if tied/missing). */
export function chartAnswer(charts, options, m) {
  const vals = Object.entries(options).map(([opt, id]) => [opt, measure(charts, id, m)]);
  if (vals.some(([, v]) => v === null)) return null;
  vals.sort((a, b) => b[1] - a[1]);
  return vals.length > 1 && Math.abs(vals[0][1] - vals[1][1]) < 1e-9 ? null : vals[0][0];
}

/**
 * Marks one item.
 * Returns { marks: { '' | '_row' | '_partial': 0 | 1 | number | '' }, correct } where `correct`
 * is the right answer (a value, a list for multi-selects, or { row: value } for grids).
 * '' = not answered / can't be marked.
 */
export function markItem(spec, ans, charts) {
  const marks = {};
  let correct = null;
  switch (spec.type) {
    case 'single':
      correct = spec.correct;
      marks[''] = ans === undefined ? '' : ans === spec.correct ? 1 : 0;
      break;
    case 'number':
      correct = spec.correct;
      marks[''] = ans === undefined ? '' : Number(ans) === spec.correct ? 1 : 0;
      break;
    case 'chart':
      correct = chartAnswer(charts, spec.options, spec.measure);
      marks[''] = ans === undefined || correct === null ? '' : ans === correct ? 1 : 0;
      break;
    case 'grid':
      correct = spec.correct;
      for (const [row, c] of Object.entries(spec.correct)) marks[`_${row}`] = ans?.[row] === undefined ? '' : ans[row] === c ? 1 : 0;
      break;
    case 'chart_grid':
      correct = {};
      for (const [row, m] of Object.entries(spec.rows)) {
        const c = chartAnswer(charts, spec.options, m);
        correct[row] = c;
        marks[`_${row}`] = ans?.[row] === undefined || c === null ? '' : ans[row] === c ? 1 : 0;
      }
      break;
    case 'multi': {
      correct = spec.correct;
      if (ans === undefined) {
        marks[''] = '';
        marks['_partial'] = '';
        break;
      }
      const picked = new Set(Array.isArray(ans) ? ans : String(ans).split('|').filter(Boolean));
      const right = new Set(spec.correct);
      const ok = spec.options.filter((o) => picked.has(o) === right.has(o)).length;
      marks[''] = ok === spec.options.length ? 1 : 0;
      marks['_partial'] = +(ok / spec.options.length).toFixed(2);
      break;
    }
  }
  return { marks, correct };
}

/** How many marks an item is worth. */
export function itemMax(spec) {
  if (spec.type === 'grid') return Object.keys(spec.correct).length;
  if (spec.type === 'chart_grid') return Object.keys(spec.rows).length;
  return 1;
}

/** Sum of an item's marks ('' counts as 0; the multi-select partial score is not counted). */
export function itemScore(marks) {
  return Object.entries(marks).reduce((s, [k, v]) => (k === '_partial' || v === '' ? s : s + v), 0);
}
