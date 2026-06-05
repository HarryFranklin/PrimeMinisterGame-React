import React from 'react';
import { ElectionCycle, Policy } from '../utils/types';
import { FRAMEWORK_RULES } from '../utils/frameworkRules';

interface DPMCardProps {
  currentCycle: ElectionCycle;
  currentTurn: number;
  isParliamentDissolved: boolean;
  selectedPolicy: Policy | null;
  cycleMAO: number;
}

export default function DPMCard({ currentCycle, currentTurn, isParliamentDissolved, selectedPolicy, cycleMAO }: DPMCardProps) {
  const rule = FRAMEWORK_RULES[currentCycle];
  const targetScore = (cycleMAO * rule.winThresholdScalar).toFixed(2);

  if (isParliamentDissolved) {
    return (
      <div className="flex-1 rounded-xl border-2 border-rose-400 bg-rose-50 flex flex-col shrink-0 min-h-0 overflow-hidden shadow-md animate-pulse">
        <div className="p-4 border-b border-rose-200/50 bg-white/50 flex items-center gap-3 shrink-0">
          <span className="text-3xl bg-white border border-rose-200 w-12 h-12 flex items-center justify-center rounded-full shadow-sm shrink-0">🚨</span>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-rose-600 leading-tight">
              Deputy Prime Minister
            </p>
            <p className="text-sm md:text-base font-bold text-zinc-800 mt-0.5">
              Term Concluded
            </p>
          </div>
        </div>
        
        <div className="p-4 flex-1 flex flex-col justify-center items-center text-center">
          <p className="text-lg md:text-xl font-black text-rose-900 mb-2">Parliament is Dissolved.</p>
          <p className="text-sm text-rose-700 font-medium">The public are heading to the polls to deliver their verdict.</p>
        </div>
      </div>
    );
  }

  const getFocus = () => {
    switch (currentCycle) {
      case ElectionCycle.Benthamite: return "Maximise overall utility across the entire distribution.";
      case ElectionCycle.Rawlsian: return "Lift the most vulnerable citizens to raise the minimum standard of living.";
      case ElectionCycle.PersonalUtility: return "Target groups whose personal utility yields the highest return.";
      case ElectionCycle.SocietalUtility: return "Balance objective wellbeing with the electorate's demand for fairness.";
      default: return "Awaiting instructions.";
    }
  };

  return (
    <div className="flex-1 rounded-xl border-2 border-zinc-200 bg-white flex flex-col shrink-0 min-h-0 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center gap-3 shrink-0">
        <span className="text-3xl bg-white border border-zinc-200 w-12 h-12 flex items-center justify-center rounded-full shadow-sm shrink-0">💼</span>
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-zinc-400 leading-tight">
            Deputy Prime Minister
          </p>
          <p className="text-sm md:text-base font-bold text-zinc-800 mt-0.5">
            Official Mandate
          </p>
        </div>
      </div>
      
      <div className="p-4 flex-1 flex flex-col justify-center gap-3">
        <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-lg">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">The Metric</span>
          <span className="text-sm font-bold text-zinc-800">Target {rule.targetMetricName}: {targetScore}</span>
        </div>
        <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-lg">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">The Focus</span>
          <span className="text-sm font-medium text-zinc-700">{getFocus()}</span>
        </div>
      </div>
    </div>
  );
}