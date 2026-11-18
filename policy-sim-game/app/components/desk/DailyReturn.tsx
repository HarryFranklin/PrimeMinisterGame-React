import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  /** A bill is open: the chart shows the country if it were signed. */
  previewing: boolean;
  /** Previewing: the counts after moving the people in columns 0..k-1 (k = 0..11),
   * so the preview can play column by column from LS 0 upwards. */
  flowSteps: HistogramBin[][] | null;
  /** Previewing: show today's country with the arrivals/leavers overlaid instead. */
  compare: boolean;
  onCompareChange: (on: boolean) => void;
}

/** Time before the first move, and between moves (column by column only). A step
 * is a little longer than D3Chart's block flight (FLY), so each move lands
 * before the next sets off. */
const FLOW_START_MS = 250;
/** Fitting a bill's rule strips (see below): each step is [strip density, the
 * chart's share of the panel's height]. Strips and chart take turns giving up
 * space, so bars stay readable and the chart keeps most of its height. */
const FIT_STEPS: [number, string][] = [
  [0, '54%'], [1, '54%'], [1, '48%'], [2, '48%'], [2, '43%'], [3, '43%'], [3, '38%'], [3, '33%'],
];
const FLOW_STEP_MS = 600;

/**
 * The country, clipped to the left flap of the folder: one face per group of
 * citizens on cream graph paper, the measure marked on it, the open bill's
 * effect ghosted over it, and its rules lined up underneath.
 */
export default function DailyReturn({
  cycle, rule, title, histogramData, ghostHistogramData, markers, yAxisMax,
  population, isUtilityCycle, activeRules, emptyHint, previewing, flowSteps, compare, onCompareChange,
}: DailyReturnProps) {
  // Play the preview (all at once, or column by column: set in DashboardTab).
  // The step is tied to the bill it was played for, so a newly opened bill
  // always starts from today's shape instead of flashing the last bill's end.
  const flowKey = flowSteps ? JSON.stringify(flowSteps[flowSteps.length - 1]) : '';
  const [played, setPlayed] = useState({ key: '', step: 0 });
  const step = played.key === flowKey ? played.step : 0;
  const setStep = (k: number) => setPlayed({ key: flowKey, step: k });
  useEffect(() => {
    if (!flowSteps || compare) return;
    const beats: number[] = [];
    for (let k = 0; k < flowSteps.length - 1; k++) {
      if (JSON.stringify(flowSteps[k]) !== JSON.stringify(flowSteps[k + 1])) beats.push(k + 1);
    }
    const last = flowSteps.length - 1;
    const timers = beats.map((k, i) => setTimeout(() => setStep(k), FLOW_START_MS + i * FLOW_STEP_MS));
    timers.push(setTimeout(() => setStep(last), FLOW_START_MS + beats.length * FLOW_STEP_MS));
    return () => {
      timers.forEach(clearTimeout);
      // Reopening the same bill (or unticking Compare) replays from the start
      setPlayed({ key: '', step: 0 });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowKey, compare]);

  // The rule strips fit the space below the chart: if a bill's rules would
  // overflow (Levels 3/4 also show the +1 strip), step to a tighter layout
  // before the browser paints, rather than showing a scroll bar (FIT_STEPS).
  const stripsRef = useRef<HTMLDivElement>(null);
  const rulesKey = activeRules ? activeRules.map((r) => `${r.note}|${r.impact}|${r.minLS}|${r.maxLS}`).join(';') : '';
  const [fit, setFit] = useState({ key: '', level: 0 });
  const level = fit.key === rulesKey ? fit.level : 0;
  const [density, chartHeight] = FIT_STEPS[Math.min(level, FIT_STEPS.length - 1)];
  useLayoutEffect(() => {
    const el = stripsRef.current;
    if (!el || !activeRules || level >= FIT_STEPS.length - 1) return;
    if (el.scrollHeight > el.clientHeight + 2) setFit({ key: rulesKey, level: level + 1 });
  });
  useEffect(() => {
    // A resize can give more (or less) room: fit again from the loosest layout
    const refit = () => setFit({ key: '', level: 0 });
    window.addEventListener('resize', refit);
    return () => window.removeEventListener('resize', refit);
  }, []);

  const animated = previewing && !!flowSteps && !compare;
  const shownHistogram = animated ? flowSteps![Math.min(step, flowSteps!.length - 1)] : histogramData;
  const shownGhost = previewing ? (compare ? ghostHistogramData : null) : ghostHistogramData;

  return (
    <div className="desk-graph relative h-full flex flex-col gap-1.5 px-4 pt-3 pb-3 shadow-[0_4px_10px_rgba(60,40,10,.25)] -rotate-[.4deg]">
      {/* Paperclip */}
      <div aria-hidden="true" className="absolute left-3 -top-3.5 w-4 h-12 border-[3px] border-zinc-400 rounded-[9px]" />

      <div className="flex justify-between items-center border-b-2 border-[#3f2a14] pb-1 ml-8">
        <span className="text-[10px] font-extrabold tracking-[.14em] uppercase text-[#5c4214]">Wellbeing Office · daily return</span>
        <span className="text-[10px] font-extrabold tracking-[.14em] uppercase text-[#5c4214]">{rule.graphTitle}</span>
      </div>
      <div className="flex justify-between items-baseline gap-3">
        {/* Two lines kept for the title ("Previewing:" then the bill's name), so the
            chart doesn't jump down when a bill is opened */}
        <span className="font-display font-black text-[clamp(18px,1.7vw,24px)] leading-tight text-[#2a1f0e] min-w-0 whitespace-pre-line min-h-[2lh]">{title}</span>
        {previewing && (
          <label className="shrink-0 flex items-center gap-1.5 text-[12px] font-bold text-stone-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={compare}
              onChange={(e) => onCompareChange(e.target.checked)}
              className="w-3.5 h-3.5 accent-[#3f2a14] cursor-pointer"
            />
            Compare with today
          </label>
        )}
      </div>
      <div className="flex justify-end -mt-1 min-h-[30px]">
        {animated && (
          <span className="text-[11px] text-stone-600 text-right leading-snug">If you sign it: who moves, and where</span>
        )}
        {shownGhost && (
          <span className="text-[11px] text-stone-600 text-right leading-snug flex flex-col">
            <span>Dashed: would arrive</span>
            <span>
              Faded: would leave, <strong className="text-[#1d4ed8]">up →</strong> or <strong className="text-[#b45309]">← down</strong>
            </span>
          </span>
        )}
      </div>

      {/* Fixed height: the chart never moves, however many rules the open bill has */}
      <div
        className="shrink-0 min-h-[150px] p-2 relative"
        style={{ height: chartHeight }}
        data-telemetry-id="population_graph_current"
        data-telemetry-type="graph"
      >
        <D3Chart
          plotType="1D"
          chartData={[]}
          histogramData={shownHistogram}
          ghostHistogramData={shownGhost}
          xAxisType={AxisVariable.LifeSatisfaction}
          yAxisType={rule.yAxisType}
          color={rule.graphColor}
          markers={markers}
          hoverTrackId="population_current"
          visualStyle="blocks"
          highlightFloor={cycle === ElectionCycle.Rawlsian}
          yAxisMax={yAxisMax}
          bands={false}
          markerLabels="axis"
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

      <div ref={stripsRef} className="flex-1 min-h-0 overflow-hidden flex flex-col pt-1">
        {activeRules ? (
          <PolicyStrips rules={activeRules} padX={CHART_PAD} density={density} />
        ) : (
          <div className="flex-1 border-2 border-dashed border-[rgba(92,66,20,.3)] rounded-lg px-4 py-3 text-[13px] text-stone-500 text-center flex items-center justify-center">
            {emptyHint}
          </div>
        )}
      </div>
    </div>
  );
}