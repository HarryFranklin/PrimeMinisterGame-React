import React from 'react';
import { AxisVariable, ElectionCycle, PolicyRule, Respondent } from '../../utils/types';
import { FrameworkRule } from '../../utils/frameworkRules';
import D3Chart, { ChartMarker } from '../D3Chart';
import PointsStrip from '../PointsStrip';
import type { HistogramBin } from '../../hooks/useDashboardHistograms';
import { PolicyStrips } from './PolicyBars';

/** Matches the p-2 around the chart, so the strips line up with its columns. */
const CHART_PAD = 8;

interface DailyReturnProps {
  cycle: ElectionCycle;
  rule: FrameworkRule;
  title: string;
  histogramData: HistogramBin[];
  ghostHistogramData: HistogramBin[] | null;
  markers: ChartMarker[];
  yAxisMax: number;
  population: Respondent[];
  isUtilityCycle: boolean;
  /** The open bill's rules: strips under the chart (and colours on the +1 bars). */
  activeRules: PolicyRule[] | null;
  emptyHint: string;
}

/**
 * The country, clipped to the left flap of the folder: one face per group of
 * citizens on cream graph paper, the measure marked on it, the open bill's
 * effect ghosted over it, and its rules lined up underneath.
 */
export default function DailyReturn({
  cycle, rule, title, histogramData, ghostHistogramData, markers, yAxisMax,
  population, isUtilityCycle, activeRules, emptyHint,
}: DailyReturnProps) {
  return (
    <div className="desk-graph relative h-full flex flex-col gap-1.5 px-4 pt-3 pb-3 shadow-[0_4px_10px_rgba(60,40,10,.25)] -rotate-[.4deg]">
      {/* Paperclip */}
      <div aria-hidden="true" className="absolute left-3 -top-3.5 w-4 h-12 border-[3px] border-zinc-400 rounded-[9px]" />

      <div className="flex justify-between items-center border-b-2 border-[#3f2a14] pb-1 ml-8">
        <span className="text-[10px] font-extrabold tracking-[.14em] uppercase text-[#5c4214]">Wellbeing Office · daily return</span>
        <span className="text-[10px] font-extrabold tracking-[.14em] uppercase text-[#5c4214]">{rule.graphTitle}</span>
      </div>
      <div className="flex justify-between items-baseline gap-3">
        <span className="font-display font-black text-[clamp(18px,1.7vw,24px)] text-[#2a1f0e]">{title}</span>
        {ghostHistogramData && (
          <span className="text-[11px] text-stone-600 text-right leading-snug">
            Dashed: would arrive · Faded: would leave,{' '}
            <strong className="text-[#1d4ed8]">up →</strong> or <strong className="text-[#b45309]">← down</strong>
          </span>
        )}
      </div>

      {/* Fixed height: the chart never moves, however many rules the open bill has */}
      <div
        className="h-[54%] shrink-0 min-h-[180px] p-2 relative"
        data-telemetry-id="population_graph_current"
        data-telemetry-type="graph"
      >
        <D3Chart
          plotType="1D"
          chartData={[]}
          histogramData={histogramData}
          ghostHistogramData={ghostHistogramData}
          xAxisType={AxisVariable.LifeSatisfaction}
          yAxisType={rule.yAxisType}
          color={rule.graphColor}
          markers={markers}
          hoverTrackId="population_current"
          visualStyle="faces"
          yAxisMax={yAxisMax}
          faceCols={2}
          bands={false}
        />
      </div>

      {isUtilityCycle && (
        <PointsStrip
          cycle={cycle}
          histogramData={histogramData}
          population={population}
          color={rule.graphColor}
          activePolicyRules={activeRules}
        />
      )}

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col pt-1">
        {activeRules ? (
          <PolicyStrips rules={activeRules} padX={CHART_PAD} />
        ) : (
          <div className="flex-1 border-2 border-dashed border-[rgba(92,66,20,.3)] rounded-lg px-4 py-3 text-[13px] text-stone-500 text-center flex items-center justify-center">
            {emptyHint}
          </div>
        )}
      </div>
    </div>
  );
}
