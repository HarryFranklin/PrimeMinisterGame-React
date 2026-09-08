import React from 'react';
import { PERSONAL_UTILITY_TABLE, SOCIETAL_UTILITY_TABLE } from '../../lib/utility';

interface UtilityTableProps {
  variant: 'personal' | 'societal';
}

/** Renders the real PU or SU lookup table from lib/utility.ts — single column,
 * so the Personal Utility page only ever shows Personal Utility values and the
 * Societal Utility page only ever shows Societal Utility values. */
export default function UtilityTable({ variant }: UtilityTableProps) {
  const table = variant === 'personal' ? PERSONAL_UTILITY_TABLE : SOCIETAL_UTILITY_TABLE;
  const columnLabel = variant === 'personal' ? 'Personal Utility' : 'Societal Utility';

  return (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr>
            <th className="border-b-2 border-zinc-300 dark:border-zinc-700 px-3 py-2 font-bold text-zinc-900 dark:text-zinc-100">
              Life Satisfaction
            </th>
            <th className="border-b-2 border-zinc-300 dark:border-zinc-700 px-3 py-2 font-bold text-zinc-900 dark:text-zinc-100">
              {columnLabel}
            </th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(table).map(([ls, utility]) => (
            <tr key={ls}>
              <td className="border-b border-zinc-200 dark:border-zinc-800 px-3 py-2 text-zinc-700 dark:text-zinc-300">
                {ls}
              </td>
              <td className="border-b border-zinc-200 dark:border-zinc-800 px-3 py-2 text-zinc-700 dark:text-zinc-300">
                {utility.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}