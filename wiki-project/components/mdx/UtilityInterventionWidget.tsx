import React from 'react';
import { personalUtility } from '../../lib/utility';
import UtilityCurveChart, { CurveStep } from './UtilityCurveChart';

const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

const getDetails = (ls: number) => {
  if (ls <= 3) return { emoji: '😭', label: 'Massive Impact', desc: 'Heating their home, paying rent, or affording three meals a day.' };
  if (ls <= 4) return { emoji: '🙁', label: 'High Impact', desc: 'Paying off urgent debt or affording new clothes for their family.' };
  if (ls <= 6) return { emoji: '😐', label: 'Moderate Impact', desc: 'Going on a modest family holiday or eating out occasionally.' };
  if (ls <= 8) return { emoji: '🙂', label: 'Low Impact', desc: 'Upgrading to a slightly nicer car or adding to their savings.' };
  return { emoji: '😁', label: 'Minimal Impact', desc: 'Adding marginally to an already overflowing luxury savings account.' };
};

const getFaceColor = (ls: number) => {
  const t = ls / 10;
  if (t < 0.5) {
    const f = t * 2;
    return `rgb(${Math.round(lerp(244, 234, f))}, ${Math.round(lerp(63, 179, f))}, ${Math.round(lerp(94, 8, f))})`;
  }
  const f = (t - 0.5) * 2;
  return `rgb(${Math.round(lerp(234, 34, f))}, ${Math.round(lerp(179, 197, f))}, ${Math.round(lerp(8, 94, f))})`;
};

const getImpactColor = (ls: number) => {
  const t = ls / 10;
  return `rgb(${Math.round(lerp(236, 113, t))}, ${Math.round(lerp(72, 113, t))}, ${Math.round(lerp(153, 122, t))})`;
};

// Fixed starting points replace the old slider (control group: no interaction).
const STARTS = [2, 4, 6, 8];
const MAX_GAIN = personalUtility(3) - personalUtility(2);

export default function UtilityInterventionWidget() {
  const rows = STARTS.map((ls) => {
    const gain = personalUtility(ls + 1) - personalUtility(ls);
    return {
      ls,
      gain,
      pctOfMax: Math.max(0, (gain / MAX_GAIN) * 100),
      details: getDetails(ls),
      faceColor: getFaceColor(ls),
      impactColor: getImpactColor(ls),
    };
  });

  const steps: CurveStep[] = rows.map((r) => ({
    from: r.ls,
    to: r.ls + 1,
    color: r.impactColor,
    riseLabel: `+${r.gain.toFixed(2)}`,
  }));

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl p-6 md:p-8 flex flex-col gap-6 my-8 text-zinc-200 font-sans">
      <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Value of a +1 Boost, by Starting Point</span>

      <div className="flex flex-col gap-4">
        {rows.map((r) => (
          <div key={r.ls} className="flex flex-col md:flex-row md:items-center gap-4 border-b border-zinc-800 pb-4 last:border-b-0 last:pb-0">
            <div className="flex items-center gap-3 shrink-0 md:w-40">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-3xl border-4"
                style={{ borderColor: r.faceColor, backgroundColor: r.faceColor.replace('rgb', 'rgba').replace(')', ', 0.15)') }}
              >
                {r.details.emoji}
              </div>
              <span className="text-lg font-black text-white tabular-nums whitespace-nowrap">
                {r.ls} → {r.ls + 1}
              </span>
            </div>

            <div className="flex-1 flex flex-col gap-2">
              <div className="flex justify-between items-end">
                <span className="text-sm font-black uppercase tracking-widest" style={{ color: r.impactColor }}>
                  {r.details.label}
                </span>
                <span className="text-sm font-bold tabular-nums text-zinc-300">+{r.gain.toFixed(2)} utility</span>
              </div>
              <div className="w-full h-4 bg-zinc-950 rounded-full overflow-hidden relative border border-zinc-800">
                <div
                  className="absolute top-0 left-0 bottom-0 rounded-full"
                  style={{ width: `${r.pctOfMax}%`, backgroundColor: r.impactColor }}
                />
              </div>
              <p className="text-sm text-zinc-400 leading-snug">
                <span className="font-bold text-zinc-300">Meaning: </span>{r.details.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="w-full max-w-2xl mx-auto flex flex-col gap-2 pt-4 border-t border-zinc-800">
        <UtilityCurveChart
          steps={steps}
          ariaLabel="The Personal Utility curve, with the +1 step highlighted from starting points of 2, 4, 6 and 8"
        />
        <p className="text-xs text-zinc-500 text-center leading-snug">
          The same curve as the diagram above. Each highlighted step shows what a +1 boost adds from that starting point.
        </p>
      </div>
    </div>
  );
}