'use client';

import React from 'react';
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

/** Static (control group) version: the table and the chart are both shown,
 * one after the other, instead of behind a Table/Chart toggle. */
export default function UtilityExplorer({ variant }: UtilityExplorerProps) {
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

  const th = 'border-b-2 border-zinc-300 dark:border-zinc-700 px-3 py-2 font-bold text-zinc-900 dark:text-zinc-100';
  const td = 'border-b border-zinc-200 dark:border-zinc-800 px-3 py-2';

  return (
    <div className="mb-4 flex flex-col gap-6">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className={th}>Life Satisfaction</th>
              <th className={th}>{columnLabel}</th>
              <th className={th}>+1 Point Is Worth</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => {
              const m = marginals[i];
              return (
                <tr key={e.ls}>
                  <td className={`${td} text-zinc-700 dark:text-zinc-300`}>{e.ls}</td>
                  <td className={`${td} text-zinc-700 dark:text-zinc-300`}>{e.utility.toFixed(2)}</td>
                  <td className={td}>
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
    </div>
  );
}