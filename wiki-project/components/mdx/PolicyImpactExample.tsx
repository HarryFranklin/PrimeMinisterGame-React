import React from 'react';
import { personalUtility, societalUtility } from '../../lib/utility';

interface Group {
  name: string;
  share: number;
  before: number;
  after: number;
}

const GROUPS: Group[] = [
  { name: 'Struggling', share: 0.10, before: 4, after: 3 },
  { name: 'Moderate', share: 0.45, before: 6, after: 7 },
  { name: 'Comfortable', share: 0.45, before: 8, after: 9 },
];

function DeltaCell({ delta }: { delta: number }) {
  const color = delta > 0 ? 'text-emerald-500' : delta < 0 ? 'text-red-500' : 'text-zinc-400';
  const sign = delta > 0 ? '+' : '';
  return <span className={`font-bold ${color}`}>{sign}{delta.toFixed(3)}</span>;
}

/** Worked policy example computed live from lib/utility.ts, so the "PU says
 * yes, SU says no" claim in the surrounding text is always backed by the
 * real curves rather than hand-typed numbers. */
export default function PolicyImpactExample() {
  const rows = GROUPS.map((g) => ({
    ...g,
    puDelta: personalUtility(g.after) - personalUtility(g.before),
    suDelta: societalUtility(g.after) - societalUtility(g.before),
  }));

  const puTotal = rows.reduce((sum, r) => sum + r.share * r.puDelta, 0);
  const suTotal = rows.reduce((sum, r) => sum + r.share * r.suDelta, 0);

  return (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr>
            <th className="border-b-2 border-zinc-300 dark:border-zinc-700 px-3 py-2 font-bold text-zinc-900 dark:text-zinc-100">Group</th>
            <th className="border-b-2 border-zinc-300 dark:border-zinc-700 px-3 py-2 font-bold text-zinc-900 dark:text-zinc-100">Share</th>
            <th className="border-b-2 border-zinc-300 dark:border-zinc-700 px-3 py-2 font-bold text-zinc-900 dark:text-zinc-100">LS Change</th>
            <th className="border-b-2 border-zinc-300 dark:border-zinc-700 px-3 py-2 font-bold text-zinc-900 dark:text-zinc-100">Personal Utility</th>
            <th className="border-b-2 border-zinc-300 dark:border-zinc-700 px-3 py-2 font-bold text-zinc-900 dark:text-zinc-100">Societal Utility</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td className="border-b border-zinc-200 dark:border-zinc-800 px-3 py-2 text-zinc-700 dark:text-zinc-300 font-semibold">{r.name}</td>
              <td className="border-b border-zinc-200 dark:border-zinc-800 px-3 py-2 text-zinc-700 dark:text-zinc-300">{Math.round(r.share * 100)}%</td>
              <td className="border-b border-zinc-200 dark:border-zinc-800 px-3 py-2 text-zinc-700 dark:text-zinc-300">{r.before} → {r.after}</td>
              <td className="border-b border-zinc-200 dark:border-zinc-800 px-3 py-2"><DeltaCell delta={r.puDelta} /></td>
              <td className="border-b border-zinc-200 dark:border-zinc-800 px-3 py-2"><DeltaCell delta={r.suDelta} /></td>
            </tr>
          ))}
          <tr>
            <td className="px-3 py-2 font-bold text-zinc-900 dark:text-zinc-100" colSpan={3}>Population-weighted total</td>
            <td className="px-3 py-2"><DeltaCell delta={puTotal} /></td>
            <td className="px-3 py-2"><DeltaCell delta={suTotal} /></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}