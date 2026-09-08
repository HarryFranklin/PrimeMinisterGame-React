'use client';

import React from 'react';
import D3Chart from '../D3Chart';
import { AxisVariable } from '../../utils/types';
import { PERSONAL_UTILITY_TABLE } from '../../lib/utility';

export default function UtilityCurveDiagram() {
  const curveData = Object.entries(PERSONAL_UTILITY_TABLE).map(([ls, utility], index) => ({
    id: index + 1,
    x: Number(ls),
    y: utility,
  }));

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
        Utility climbs quickly at low Life Satisfaction scores and flattens out near the
        top — each extra point buys less than the one before it. That's diminishing
        marginal utility: raising someone from 2 to 4 does more good, in utility terms,
        than raising someone from 8 to 10.
      </p>
    </div>
  );
}