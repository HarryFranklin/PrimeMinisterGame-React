'use client';

import React from 'react';
import { PERSONAL_UTILITY_TABLE, SOCIETAL_UTILITY_TABLE } from '../../lib/utility';

const WIDTH = 640;
const HEIGHT = 320;
const PAD = { top: 20, right: 20, bottom: 40, left: 50 };

const X_DOMAIN: [number, number] = [2, 10];
const Y_DOMAIN: [number, number] = [0, 1];

const innerW = WIDTH - PAD.left - PAD.right;
const innerH = HEIGHT - PAD.top - PAD.bottom;

const scaleX = (x: number) => PAD.left + ((x - X_DOMAIN[0]) / (X_DOMAIN[1] - X_DOMAIN[0])) * innerW;
const scaleY = (y: number) => PAD.top + innerH - ((y - Y_DOMAIN[0]) / (Y_DOMAIN[1] - Y_DOMAIN[0])) * innerH;

const seriesPath = (table: Readonly<Record<number, number>>) =>
  Object.entries(table)
    .map(([ls, u], i) => `${i === 0 ? 'M' : 'L'} ${scaleX(Number(ls))} ${scaleY(u)}`)
    .join(' ');

const X_TICKS = [2, 3, 4, 5, 6, 7, 8, 9, 10];
const Y_TICKS = [0, 0.25, 0.5, 0.75, 1.0];

/** Plots the real Personal Utility and Societal Utility curves from
 * lib/utility.ts together, so the gap between them (and where it closes)
 * is visible directly rather than inferred from a table. */
export default function UtilityComparisonChart() {
  const personalEntries = Object.entries(PERSONAL_UTILITY_TABLE);
  const societalEntries = Object.entries(SOCIETAL_UTILITY_TABLE);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 my-8 shadow-xl flex flex-col">
      <div className="mb-2 flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-pink-500">
          Personal Utility vs Societal Utility
        </span>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-violet-400">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-400 inline-block" /> Personal
          </span>
          <span className="flex items-center gap-1.5 text-pink-400">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-400 inline-block" /> Societal
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto">
        {Y_TICKS.map((t) => (
          <line
            key={`gy-${t}`}
            x1={PAD.left} x2={WIDTH - PAD.right}
            y1={scaleY(t)} y2={scaleY(t)}
            stroke="#3f3f46" strokeWidth={1}
          />
        ))}

        <line x1={PAD.left} x2={WIDTH - PAD.right} y1={HEIGHT - PAD.bottom} y2={HEIGHT - PAD.bottom} stroke="#71717a" strokeWidth={2} />
        <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={HEIGHT - PAD.bottom} stroke="#71717a" strokeWidth={2} />

        {X_TICKS.map((t) => (
          <text key={`xt-${t}`} x={scaleX(t)} y={HEIGHT - PAD.bottom + 18} textAnchor="middle" fontSize={11} fontWeight={600} fill="#d4d4d8">
            {t}
          </text>
        ))}
        {Y_TICKS.map((t) => (
          <text key={`yt-${t}`} x={PAD.left - 8} y={scaleY(t) + 4} textAnchor="end" fontSize={11} fontWeight={600} fill="#d4d4d8">
            {t.toFixed(2)}
          </text>
        ))}

        <text x={(WIDTH + PAD.left - PAD.right) / 2} y={HEIGHT - 4} textAnchor="middle" fontSize={12} fontWeight={700} fill="#e4e4e7">
          Life Satisfaction
        </text>
        <text
          x={14} y={(HEIGHT - PAD.bottom + PAD.top) / 2}
          textAnchor="middle" fontSize={12} fontWeight={700} fill="#e4e4e7"
          transform={`rotate(-90 14 ${(HEIGHT - PAD.bottom + PAD.top) / 2})`}
        >
          Utility
        </text>

        <path d={seriesPath(PERSONAL_UTILITY_TABLE)} fill="none" stroke="#a78bfa" strokeWidth={2.5} />
        <path d={seriesPath(SOCIETAL_UTILITY_TABLE)} fill="none" stroke="#f472b6" strokeWidth={2.5} />

        {personalEntries.map(([ls, u]) => (
          <circle key={`p-${ls}`} cx={scaleX(Number(ls))} cy={scaleY(u)} r={4.5} fill="#a78bfa" stroke="#18181b" strokeWidth={1} />
        ))}
        {societalEntries.map(([ls, u]) => (
          <circle key={`s-${ls}`} cx={scaleX(Number(ls))} cy={scaleY(u)} r={4.5} fill="#f472b6" stroke="#18181b" strokeWidth={1} />
        ))}
      </svg>

      <p className="mt-3 text-sm text-zinc-400 leading-relaxed shrink-0">
        Both curves start at 0 and end at 1, but the Societal Utility line (pink) sits above
        Personal Utility (purple) at every score in between — it credits low Life
        Satisfaction scores with more utility, sooner. The two lines converge again near the
        top: further gains for people who are already comfortable are valued almost the same
        either way.
      </p>
    </div>
  );
}