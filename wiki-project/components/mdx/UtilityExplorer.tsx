'use client';

import React, { useState } from 'react';
import D3Chart from '../D3Chart';
import { AxisVariable } from '../../utils/types';
import { PERSONAL_UTILITY_TABLE, SOCIETAL_UTILITY_TABLE } from '../../lib/utility';

interface UtilityExplorerProps {
  variant: 'personal' | 'societal';
}

/** Interpolates red (low) -> green (high) for the marginal-gain column. */
function marginalColor(t: number) {
  const r = Math.round(239 + (34 - 239) * t);
  const g = Math.round(68 + (197 - 68) * t);
  const b = Math.round(68 + (94 - 68) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

/** Table/chart toggle for a single utility curve (PU or SU), including a
 * colour-coded "+1 point is worth" marginal column, all driven from the
 * real values in lib/utility.ts. */
export default function UtilityExplorer({ variant }: UtilityExplorerProps) {
  const [view, setView] = useState<'table' | 'chart'>('table');
  const table = variant === 'personal' ? PERSONAL_UTILITY_TABLE : SOCIETAL_UTILITY_TABLE;
  const columnLabel = variant === 'personal' ? 'Personal Utility' : 'Societal Utility';
  const color = variant === 'personal' ? '#8b5cf6' : '#ec4899';

  const entries = Object.entries(table).map(([ls, utility]) => ({ ls: Number(ls), utility }));
  const marginals: (number | null)[] = entries.map((e, i) =>
    i === 0 ? null : e.utility - entries[i - 1].utility
  );
  const validMarginals = marginals.filter((m): m is number => m !== null);
  const maxM = Math.max(...validMarginals);
  const minM = Math.min(...validMarginals);

  const tabClass = (active: boolean) =>
    `text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full transition-colors ${
      active
        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
    }`;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => setView('table')} className={tabClass(view === 'table')}>Table</button>
        <button onClick={() => setView('chart')} className={tabClass(view === 'chart')}>Chart</button>
      </div>

      {view === 'table' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="border-b-2 border-zinc-300 dark:border-zinc-700 px-3 py-2 font-bold text-zinc-900 dark:text-zinc-100">
                  Life Satisfaction
                </th>
                <th className="border-b-2 border-zinc-300 dark:border-zinc-700 px-3 py-2 font-bold text-zinc-900 dark:text-zinc-100">
                  {columnLabel}
                </th>
                <th className="border-b-2 border-zinc-300 dark:border-zinc-700 px-3 py-2 font-bold text-zinc-900 dark:text-zinc-100">
                  +1 Point Is Worth
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const m = marginals[i];
                return (
                  <tr key={e.ls}>
                    <td className="border-b border-zinc-200 dark:border-zinc-800 px-3 py-2 text-zinc-700 dark:text-zinc-300">
                      {e.ls}
                    </td>
                    <td className="border-b border-zinc-200 dark:border-zinc-800 px-3 py-2 text-zinc-700 dark:text-zinc-300">
                      {e.utility.toFixed(2)}
                    </td>
                    <td className="border-b border-zinc-200 dark:border-zinc-800 px-3 py-2">
                      {m === null ? (
                        <span className="text-zinc-400">—</span>
                      ) : (
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: marginalColor((m - minM) / (maxM - minM || 1)) }}
                        >
                          +{m.toFixed(2)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-xl">
          <div className="h-72 w-full">
            <D3Chart
              plotType="2D"
              chartData={entries.map((e, i) => ({ id: i + 1, x: e.ls, y: e.utility }))}
              xAxisType={AxisVariable.LifeSatisfaction}
              yAxisType={variant === 'personal' ? AxisVariable.PersonalUtility : AxisVariable.SocietalFairness}
              color={color}
              theme="dark"
            />
          </div>
        </div>
      )}
    </div>
  );
}