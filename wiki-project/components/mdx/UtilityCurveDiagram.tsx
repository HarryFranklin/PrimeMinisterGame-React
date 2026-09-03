'use client';

import React from 'react';
import D3Chart from '../D3Chart';
import { AxisVariable } from '../../utils/types';

export default function UtilityCurveDiagram() {
  const curveData = [
    { id: 1, x: 2, y: 0.0 },
    { id: 2, x: 3, y: 0.28 },
    { id: 3, x: 4, y: 0.55 },
    { id: 4, x: 5, y: 0.66 },
    { id: 5, x: 6, y: 0.77 },
    { id: 6, x: 7, y: 0.84 },
    { id: 7, x: 8, y: 0.90 },
    { id: 8, x: 9, y: 0.95 },
    { id: 9, x: 10, y: 1.0 }
  ];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 my-8 shadow-xl flex flex-col">
      <div className="mb-2 shrink-0">
        <span className="text-xs font-bold uppercase tracking-widest text-pink-500">
          Why Each Extra Point of Satisfaction Matters Less
        </span>
      </div>
      <div className="h-80 w-full min-h-0 relative">
        <D3Chart 
          plotType="2D"
          chartData={curveData}
          xAxisType={AxisVariable.LifeSatisfaction}
          yAxisType={AxisVariable.PersonalUtility}
          color="#8b5cf6" 
          theme="dark"
        />
      </div>
      <p className="mt-3 text-sm text-zinc-400 leading-relaxed shrink-0">
        As life satisfaction rises from 2 to 10, personal utility climbs quickly at first
        but flattens out near the top — each additional point of satisfaction buys less
        utility than the one before it. This is diminishing marginal utility: it's why
        raising someone from a 2 to a 4 does more good, in utility terms, than raising
        someone from an 8 to a 10.
      </p>
    </div>
  );
}