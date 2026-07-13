import React, { useEffect, useMemo } from 'react';
import { ElectionCycle, Respondent, AxisVariable } from '../../../utils/types';
import { FRAMEWORK_RULES } from '../../../utils/frameworkRules';
import { WelfareMetrics } from '../../../utils/WelfareMetrics';
import D3Chart from '../../D3Chart';
import { DPMMessage, HighlightText } from '../SharedModalComponents';

interface StageTermSummaryProps {
  currentCycle: ElectionCycle;
  initialPopulation: Respondent[];
  finalPopulation: Respondent[];
  yAxisMax: number;
  onReady: () => void;
  onDefinitionToggle: (title: string, desc: string) => void;
}

const generateHistogramData = (pop: Respondent[]) =>
  Array.from({ length: 11 }, (_, i) => ({
    name: i,
    count: pop.filter(r => Math.round(r.currentLS) === i).length,
  }));

function computeMetric(population: Respondent[], cycle: ElectionCycle): number {
  if (!population || population.length === 0) return 0;
  switch (cycle) {
    case ElectionCycle.Benthamite:
      return population.reduce((s, p) => s + p.currentLS, 0) / population.length;
    case ElectionCycle.Rawlsian:
      return Math.min(...population.map(p => p.currentLS));
    case ElectionCycle.PersonalUtility:
      return (
        population.reduce((s, p) => s + WelfareMetrics.getUtilityForPerson(p.currentLS, p.personalUtilities), 0) /
        population.length
      );
    default: {
      const allLS = population.map(p => p.currentLS);
      return (
        population.reduce((s, p) => s + WelfareMetrics.evaluateDistribution(allLS, p.societalUtilities), 0) /
        population.length
      );
    }
  }
}

const MARKER_LABELS: Record<ElectionCycle, string> = {
  [ElectionCycle.Benthamite]: 'Average',
  [ElectionCycle.Rawlsian]: 'Baseline',
  [ElectionCycle.PersonalUtility]: 'Satisfaction',
  [ElectionCycle.SocietalUtility]: 'Fairness',
};

const ANALYSIS_MESSAGES: Record<ElectionCycle, (start: number, end: number, diff: number) => string> = {
  [ElectionCycle.Benthamite]: (s, e, d) =>
    `The National Average Happiness has ${d >= 0 ? 'increased' : 'decreased'} from ${s.toFixed(2)} to ${e.toFixed(2)}, a net ${d >= 0 ? 'gain' : 'loss'} of ${Math.abs(d).toFixed(2)} points.`,
  [ElectionCycle.Rawlsian]: (s, e, d) =>
    `The Minimum Wellbeing Baseline for the poorest citizens has ${d >= 0 ? 'increased' : 'decreased'} from ${s.toFixed(2)} to ${e.toFixed(2)}.`,
  [ElectionCycle.PersonalUtility]: (s, e, d) =>
    `The National Personal Satisfaction has ${d >= 0 ? 'increased' : 'decreased'} from ${s.toFixed(2)} to ${e.toFixed(2)}.`,
  [ElectionCycle.SocietalUtility]: (s, e, d) =>
    `The National Fairness Index has ${d >= 0 ? 'increased' : 'decreased'} from ${s.toFixed(2)} to ${e.toFixed(2)}, reflecting shifting views on equality.`,
};

export default function StageTermSummary({
  currentCycle,
  initialPopulation,
  finalPopulation,
  yAxisMax,
  onReady,
  onDefinitionToggle
}: StageTermSummaryProps) {
  const rule = FRAMEWORK_RULES[currentCycle];
  const initialHist = useMemo(() => generateHistogramData(initialPopulation), [initialPopulation]);
  const finalHist = useMemo(() => generateHistogramData(finalPopulation), [finalPopulation]);

  const safeYAxisMax = useMemo(() => {
    const maxInitial = Math.max(...initialHist.map(d => d.count), 0);
    const maxFinal = Math.max(...finalHist.map(d => d.count), 0);
    return Math.ceil(Math.max(maxInitial, maxFinal, yAxisMax) / 10) * 10;
  }, [initialHist, finalHist, yAxisMax]);

  const startMetric = useMemo(() => computeMetric(initialPopulation, currentCycle), [initialPopulation, currentCycle]);
  const endMetric = useMemo(() => computeMetric(finalPopulation, currentCycle), [finalPopulation, currentCycle]);
  const markerLabel = MARKER_LABELS[currentCycle];
  const diff = endMetric - startMetric;

  const initialMarkers = [{ value: startMetric, label: `${markerLabel}: ${startMetric.toFixed(2)}`, color: '#a1a1aa', dashed: true }];
  const finalMarkers = [{ value: endMetric, label: `${markerLabel}: ${endMetric.toFixed(2)}`, color: rule.graphColor, dashed: false }];

  useEffect(() => {
    const timer = setTimeout(() => onReady(), 2500);
    return () => clearTimeout(timer);
  }, [onReady]);

  const rawMessage = ANALYSIS_MESSAGES[currentCycle](startMetric, endMetric, diff);

  return (
    <div className="flex flex-col gap-4 animate-in fade-in w-full">
      <DPMMessage title="Term Summary">
        <HighlightText 
          text={rawMessage} 
          highlights={[
            { 
              word: rule.targetMetricName, 
              onClick: () => onDefinitionToggle(rule.targetMetricName, rule.targetMetricDescription) 
            }
          ]} 
        />
      </DPMMessage>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-5 flex flex-col w-full">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 text-center">Start of Term</h3>
          <div className="h-[240px] md:h-[260px] w-full">
            <D3Chart
              plotType="1D"
              chartData={[]}
              histogramData={initialHist}
              xAxisType={AxisVariable.LifeSatisfaction}
              yAxisType={rule.yAxisType}
              color="#d4d4d8"
              visualStyle="faces"
              faceCols={1}
              yAxisMax={safeYAxisMax}
              markers={initialMarkers}
            />
          </div>
        </div>

        <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-5 flex flex-col w-full">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-800 mb-2 text-center">End of Term</h3>
          <div className="h-[240px] md:h-[260px] w-full">
            <D3Chart
              plotType="1D"
              chartData={[]}
              histogramData={finalHist}
              xAxisType={AxisVariable.LifeSatisfaction}
              yAxisType={rule.yAxisType}
              color={rule.graphColor}
              visualStyle="faces"
              faceCols={1}
              yAxisMax={safeYAxisMax}
              markers={finalMarkers}
            />
          </div>
        </div>
      </div>
    </div>
  );
}