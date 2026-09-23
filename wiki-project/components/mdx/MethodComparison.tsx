import React from 'react';
import {
  PERSONAL_UTILITY_TABLE,
  SOCIETAL_UTILITY_TABLE,
  DIRECT_SOCIETAL_UTILITY_TABLE,
  societalUtility,
  directSocietalUtility,
} from '../../lib/utility';
import { GROUPS } from './PolicyImpactExample';

/* Static components for /wiki/when-methods-disagree.
 * "Gambles" = the curves already used throughout the wiki (lib/utility.ts).
 * "Asking directly" = DIRECT_SOCIETAL_UTILITY_TABLE (societal only; the
 * direct method did not measure Personal Utility). */

const GAMBLE_COLOR = '#f472b6';
const DIRECT_COLOR = '#38bdf8';
const PERSONAL_COLOR = '#a78bfa';

// ---------- Chart ----------

const WIDTH = 640;
const HEIGHT = 320;
const PAD = { top: 20, right: 20, bottom: 40, left: 50 };
const innerW = WIDTH - PAD.left - PAD.right;
const innerH = HEIGHT - PAD.top - PAD.bottom;
const scaleX = (x: number) => PAD.left + ((x - 2) / 8) * innerW;
const scaleY = (y: number) => PAD.top + innerH - y * innerH;
const X_TICKS = [2, 4, 6, 8, 10];
const Y_TICKS = [0, 0.25, 0.5, 0.75, 1.0];

const seriesPath = (table: Readonly<Record<number, number>>) =>
  Object.entries(table)
    .map(([ls, u], i) => `${i === 0 ? 'M' : 'L'} ${scaleX(Number(ls))} ${scaleY(u)}`)
    .join(' ');

export function MethodComparisonChart() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 my-8 shadow-xl flex flex-col">
      <div className="mb-2 flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-pink-500">
          Societal Utility: Two Methods
        </span>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5" style={{ color: GAMBLE_COLOR }}>
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: GAMBLE_COLOR }} /> Gambles
          </span>
          <span className="flex items-center gap-1.5" style={{ color: DIRECT_COLOR }}>
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: DIRECT_COLOR }} /> Asking directly
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto" role="img"
        aria-label="Two Societal Utility curves. The gamble curve rises steeply to about 0.72 by a score of 4 and then flattens. The direct-asking curve rises almost in a straight line.">
        {Y_TICKS.map((t) => (
          <line key={`gy-${t}`} x1={PAD.left} x2={WIDTH - PAD.right} y1={scaleY(t)} y2={scaleY(t)} stroke="#3f3f46" strokeWidth={1} />
        ))}
        <line x1={PAD.left} x2={WIDTH - PAD.right} y1={HEIGHT - PAD.bottom} y2={HEIGHT - PAD.bottom} stroke="#71717a" strokeWidth={2} />
        <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={HEIGHT - PAD.bottom} stroke="#71717a" strokeWidth={2} />
        {X_TICKS.map((t) => (
          <text key={`xt-${t}`} x={scaleX(t)} y={HEIGHT - PAD.bottom + 18} textAnchor="middle" fontSize={11} fontWeight={600} fill="#d4d4d8">{t}</text>
        ))}
        {Y_TICKS.map((t) => (
          <text key={`yt-${t}`} x={PAD.left - 8} y={scaleY(t) + 4} textAnchor="end" fontSize={11} fontWeight={600} fill="#d4d4d8">{t.toFixed(2)}</text>
        ))}
        <text x={(WIDTH + PAD.left - PAD.right) / 2} y={HEIGHT - 4} textAnchor="middle" fontSize={12} fontWeight={700} fill="#e4e4e7">
          Life Satisfaction
        </text>
        <text x={14} y={(HEIGHT - PAD.bottom + PAD.top) / 2} textAnchor="middle" fontSize={12} fontWeight={700} fill="#e4e4e7"
          transform={`rotate(-90 14 ${(HEIGHT - PAD.bottom + PAD.top) / 2})`}>
          Utility
        </text>

        <path d={seriesPath(SOCIETAL_UTILITY_TABLE)} fill="none" stroke={GAMBLE_COLOR} strokeWidth={2.5} />
        <path d={seriesPath(DIRECT_SOCIETAL_UTILITY_TABLE)} fill="none" stroke={DIRECT_COLOR} strokeWidth={2.5} strokeDasharray="7 4" />
        {Object.entries(SOCIETAL_UTILITY_TABLE).map(([ls, u]) => (
          <circle key={`g-${ls}`} cx={scaleX(Number(ls))} cy={scaleY(u)} r={4.5} fill={GAMBLE_COLOR} stroke="#18181b" strokeWidth={1} />
        ))}
        {Object.entries(DIRECT_SOCIETAL_UTILITY_TABLE).map(([ls, u]) => (
          <circle key={`d-${ls}`} cx={scaleX(Number(ls))} cy={scaleY(u)} r={4.5} fill={DIRECT_COLOR} stroke="#18181b" strokeWidth={1} />
        ))}
      </svg>

      <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
        Both curves start at 0 and end at 1. The gamble curve (pink) shoots up between 2 and 4 and is
        almost flat after that. The direct-asking curve (blue, dashed) climbs much more evenly, close
        to a straight line.
      </p>
    </div>
  );
}

// ---------- Two-point step table ----------

const STEPS: [number, number][] = [[2, 4], [4, 6], [6, 8], [8, 10]];

/** Value of each 2-point step, scaled so the 2 → 4 step = 100. */
const relativeSteps = (table: Readonly<Record<number, number>>) => {
  const base = table[4] - table[2];
  return STEPS.map(([a, b]) => Math.round(((table[b] - table[a]) / base) * 100));
};

export function MethodStepTable() {
  const gP = relativeSteps(PERSONAL_UTILITY_TABLE);
  const gS = relativeSteps(SOCIETAL_UTILITY_TABLE);
  const dS = relativeSteps(DIRECT_SOCIETAL_UTILITY_TABLE);
  const th = 'border-b-2 border-zinc-300 dark:border-zinc-700 px-3 py-2 font-bold text-zinc-900 dark:text-zinc-100';
  const td = 'border-b border-zinc-200 dark:border-zinc-800 px-3 py-2 text-zinc-700 dark:text-zinc-300 tabular-nums';

  return (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr>
            <th className={th}>Step</th>
            <th className={th}><span style={{ color: PERSONAL_COLOR }}>Gambles:</span> Personal</th>
            <th className={th}><span style={{ color: GAMBLE_COLOR }}>Gambles:</span> Societal</th>
            <th className={th}><span style={{ color: DIRECT_COLOR }}>Asking directly:</span> Societal</th>
          </tr>
        </thead>
        <tbody>
          {STEPS.map(([a, b], i) => (
            <tr key={a}>
              <td className={`${td} font-semibold`}>{a} → {b}</td>
              <td className={td}>{gP[i]}</td>
              <td className={td}>{gS[i]}</td>
              <td className={td}>{dS[i]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Same policy, two curves ----------

function Delta({ v }: { v: number }) {
  const color = v > 0 ? 'text-emerald-500' : v < 0 ? 'text-red-500' : 'text-zinc-400';
  return <span className={`font-bold ${color}`}>{v > 0 ? '+' : ''}{v.toFixed(3)}</span>;
}

export function MethodPolicyExample() {
  const rows = GROUPS.map((g) => ({
    ...g,
    gamble: societalUtility(g.after) - societalUtility(g.before),
    direct: directSocietalUtility(g.after) - directSocietalUtility(g.before),
  }));
  const gTotal = rows.reduce((s, r) => s + r.share * r.gamble, 0);
  const dTotal = rows.reduce((s, r) => s + r.share * r.direct, 0);
  const th = 'border-b-2 border-zinc-300 dark:border-zinc-700 px-3 py-2 font-bold text-zinc-900 dark:text-zinc-100';
  const td = 'border-b border-zinc-200 dark:border-zinc-800 px-3 py-2 text-zinc-700 dark:text-zinc-300';

  return (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr>
            <th className={th}>Group</th>
            <th className={th}>Share</th>
            <th className={th}>LS Change</th>
            <th className={th}>Societal Utility (gambles)</th>
            <th className={th}>Societal Utility (asking directly)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td className={`${td} font-semibold`}>{r.name}</td>
              <td className={td}>{Math.round(r.share * 100)}%</td>
              <td className={td}>{r.before} → {r.after}</td>
              <td className={td}><Delta v={r.gamble} /></td>
              <td className={td}><Delta v={r.direct} /></td>
            </tr>
          ))}
          <tr>
            <td className="px-3 py-2 font-bold text-zinc-900 dark:text-zinc-100" colSpan={3}>Population-weighted total</td>
            <td className="px-3 py-2"><Delta v={gTotal} /></td>
            <td className="px-3 py-2"><Delta v={dTotal} /></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}