import React, { useEffect, useMemo, useState } from 'react';
import { ElectionCycle, Respondent, AxisVariable } from '../../../utils/types';
import { FRAMEWORK_RULES } from '../../../utils/frameworkRules';
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
  finalPopulation,
  yAxisMax,
  onReady,
  onDefinitionToggle
}: StageTermSummaryProps) {
  const rule = FRAMEWORK_RULES[currentCycle];
  
  // State for animation
  const [activeTurn, setActiveTurn] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // 1. Reconstruct the LS distribution and metric score for every turn
  const timelineData = useMemo(() => {
    if (!finalPopulation || finalPopulation.length === 0) return [];
    
    // Use the first citizen's ledger to determine the number of turns
    const ledger = finalPopulation[0].historicalLedger.find(l => l.cycle === currentCycle);
    if (!ledger || ledger.turns.length === 0) return [];

    return ledger.turns.map((turnInfo, t) => {
      // Calculate the histogram for this specific turn
      const hist = Array.from({ length: 11 }, (_, i) => ({
        name: i,
        count: finalPopulation.filter(p => {
          const pLedger = p.historicalLedger.find(l => l.cycle === currentCycle);
          return pLedger && Math.round(pLedger.turns[t].ls) === i;
        }).length,
      }));

      // Calculate the specific framework metric for this turn
      let score = 0;
      if (currentCycle === ElectionCycle.Benthamite) {
        score = finalPopulation.reduce((s, p) => s + p.historicalLedger.find(l => l.cycle === currentCycle)!.turns[t].ls, 0) / finalPopulation.length;
      } else if (currentCycle === ElectionCycle.Rawlsian) {
        score = Math.min(...finalPopulation.map(p => p.historicalLedger.find(l => l.cycle === currentCycle)!.turns[t].ls));
      } else if (currentCycle === ElectionCycle.PersonalUtility) {
        score = finalPopulation.reduce((s, p) => s + p.historicalLedger.find(l => l.cycle === currentCycle)!.turns[t].personalUtility, 0) / finalPopulation.length;
      } else if (currentCycle === ElectionCycle.SocietalUtility) {
        score = finalPopulation.reduce((s, p) => s + p.historicalLedger.find(l => l.cycle === currentCycle)!.turns[t].societalUtility, 0) / finalPopulation.length;
      }

      return {
        turn: t,
        policyName: turnInfo.policyName || (t === 0 ? 'Took Office' : 'Unknown Policy'),
        histogram: hist,
        score
      };
    });
  }, [finalPopulation, currentCycle]);

  // 2. Ensure Y-Axis remains static across all animation frames so the graph doesn't jump
  const safeYAxisMax = useMemo(() => {
    let maxCount = 0;
    timelineData.forEach(td => {
      const turnMax = Math.max(...td.histogram.map(h => h.count));
      if (turnMax > maxCount) maxCount = turnMax;
    });
    return Math.ceil(Math.max(maxCount, yAxisMax) / 10) * 10;
  }, [timelineData, yAxisMax]);

  const startMetric = timelineData[0]?.score || 0;
  const endMetric = timelineData[timelineData.length - 1]?.score || 0;
  const diff = endMetric - startMetric;

  const rawMessage = ANALYSIS_MESSAGES[currentCycle](startMetric, endMetric, diff) + "\nWatch the timeline below to see how your agenda shifted the population.";

  // Tell the parent modal it can enable the "Next" button
  useEffect(() => {
    const timer = setTimeout(() => onReady(), 1000);
    return () => clearTimeout(timer);
  }, [onReady]);

  // Handle the playback animation interval (1500ms allows the 1200ms D3 transition to complete)
  useEffect(() => {
    if (!isPlaying) return;
    
    if (activeTurn >= timelineData.length - 1) {
      setIsPlaying(false);
      return;
    }

    const timer = setTimeout(() => {
      setActiveTurn(prev => prev + 1);
    }, 1500);

    return () => clearTimeout(timer);
  }, [isPlaying, activeTurn, timelineData.length]);

  const activeData = timelineData[activeTurn];
  if (!activeData) return null;

  const currentMarker = [{ 
    value: activeData.score, 
    label: `${MARKER_LABELS[currentCycle]}: ${activeData.score.toFixed(2)}`, 
    color: rule.graphColor, 
    dashed: false 
  }];

  const handlePlayPause = () => {
    if (activeTurn >= timelineData.length - 1) {
      setActiveTurn(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in w-full whitespace-pre-wrap">
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

      <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-5 flex flex-col w-full">
        {/* Dynamic Header */}
        <div className="flex justify-between items-start md:items-end mb-4 gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              {activeTurn === 0 ? 'Start of Term' : `Turn ${activeTurn}`}
            </p>
            <h3 className="text-xl font-black text-zinc-900 leading-tight">
              {activeData.policyName}
            </h3>
          </div>
          <div className="text-right shrink-0">
            <p 
              className="text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-colors duration-300 whitespace-nowrap" 
              style={{ color: rule.graphColor }}
            >
              {rule.targetMetricName}
            </p>
            <p className="text-2xl sm:text-3xl font-black text-zinc-900 tabular-nums leading-none mt-1">
              {activeData.score.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Animated Graph */}
        <div className="h-[200px] w-full mb-4">
          <D3Chart
            plotType="1D"
            chartData={[]}
            histogramData={activeData.histogram}
            xAxisType={AxisVariable.LifeSatisfaction}
            yAxisType={rule.yAxisType}
            color="#d4d4d8"
            visualStyle="faces"
            faceCols={2}
            yAxisMax={safeYAxisMax}
            markers={currentMarker}
          />
        </div>

        {/* Playback Controls & Timeline */}
        <div className="flex items-center gap-3 pt-3 border-t border-zinc-200 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={handlePlayPause}
            className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-full transition-colors ${isPlaying ? 'bg-pink-100 text-pink-600' : 'bg-zinc-900 text-white hover:bg-black'}`}
          >
            {isPlaying ? '⏸' : activeTurn >= timelineData.length - 1 ? '↺' : '▶'}
          </button>
          
          <div className="flex items-center gap-2">
            {timelineData.map((d, i) => (
              <React.Fragment key={i}>
                <button
                  onClick={() => { setIsPlaying(false); setActiveTurn(i); }}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    activeTurn === i 
                      ? 'bg-pink-600 text-white shadow-md' 
                      : activeTurn > i 
                        ? 'bg-zinc-200 text-zinc-500 hover:bg-zinc-300'
                        : 'bg-white border border-zinc-200 text-zinc-400 hover:border-zinc-300'
                  }`}
                >
                  {i === 0 ? 'Start' : `T${i}`}
                </button>
                {i < timelineData.length - 1 && (
                  <span className={`w-4 h-[2px] rounded-full ${activeTurn > i ? 'bg-zinc-300' : 'bg-zinc-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}