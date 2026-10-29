// Subscale scores for the experience questionnaire (questionnaire q-0.6+).
// Used by study-worker/scripts/export.mjs. Row ids in questions.ts name the
// subscale (fa1, pu2, ie3, …), so the scoring lives in one place here.
//
// A subscale score is the mean of its items after reverse-scoring, and is left
// blank unless every item in it was answered.
//
//   UES-SF (O'Brien, Cairns & Hall 2018), 1–5:  ues_fa, ues_pu, ues_ae, ues_rw, ues_total
//   IMI subsets, 1–7:                            imi_ie, imi_pc, imi_vu
//   Self-rated understanding, 1–5 (pre + post): conf_mean (+ conf_change_* in the export)
//   Paas effort (`effort`) and miniPXI (`pxi_*`, single items) need no scoring.

export const SCALES = {
  ues: {
    min: 1, max: 5,
    reverse: ['pu1', 'pu2', 'pu3'],
    subscales: { fa: ['fa1', 'fa2', 'fa3'], pu: ['pu1', 'pu2', 'pu3'], ae: ['ae1', 'ae2', 'ae3'], rw: ['rw1', 'rw2', 'rw3'] },
    total: true,
  },
  imi: {
    min: 1, max: 7,
    reverse: ['ie3', 'pc3'],
    subscales: { ie: ['ie1', 'ie2', 'ie3', 'ie4'], pc: ['pc1', 'pc2', 'pc3'], vu: ['vu1', 'vu2', 'vu3'] },
  },
  conf: {
    min: 1, max: 5,
    reverse: [],
    subscales: { mean: ['lo1', 'lo2', 'lo3', 'lo4'] },
  },
};

const mean = (xs) => (xs.length ? Number((xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(3)) : '');

/** Item value after reverse-scoring, or null if not answered. */
function itemScore(scale, answers, row) {
  const v = Number(answers?.[row]);
  if (answers?.[row] === undefined || Number.isNaN(v)) return null;
  return scale.reverse.includes(row) ? scale.min + scale.max - v : v;
}

/** { pre_conf_mean, post_ues_fa, … } for one phase's answers. */
export function scoreScales(phase, answers) {
  const out = {};
  for (const [id, scale] of Object.entries(SCALES)) {
    const a = answers?.[id];
    if (!a || typeof a !== 'object') continue;
    const all = [];
    for (const [name, rows] of Object.entries(scale.subscales)) {
      const vals = rows.map((r) => itemScore(scale, a, r));
      const complete = vals.every((v) => v !== null);
      out[`${phase}_${id}_${name}`] = complete ? mean(vals) : '';
      if (complete) all.push(...vals);
    }
    if (scale.total) {
      const n = Object.values(scale.subscales).flat().length;
      out[`${phase}_${id}_total`] = all.length === n ? mean(all) : '';
    }
  }
  return out;
}
