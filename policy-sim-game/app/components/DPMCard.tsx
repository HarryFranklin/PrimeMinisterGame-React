import React from 'react';
import { ElectionCycle, Policy } from '../utils/types';
import { FRAMEWORK_RULES } from '../utils/frameworkRules';
import { StatBlock } from './ui';
import { CYCLE_TEXT_COLOR_CLASS } from '../utils/uiHelpers';
import LensCompare from './LensCompare';
import { dpmAdvisory } from '../utils/dpmAdvisory';

interface DPMCardProps {
  currentCycle: ElectionCycle;
  currentTurn: number;
  isParliamentDissolved: boolean;
  selectedPolicy: Policy | null;
  cycleMAO: number;
  currentMetricScore: number;
}

const CYCLE_BORDER_COLOR_CLASS: Record<ElectionCycle, string> = {
  [ElectionCycle.Benthamite]: 'border-l-pink-500',
  [ElectionCycle.Rawlsian]: 'border-l-blue-500',
  [ElectionCycle.SocietalUtility]: 'border-l-emerald-500',
  [ElectionCycle.PersonalUtility]: 'border-l-purple-500',
};

export default function DPMCard({ currentCycle, currentTurn, isParliamentDissolved, selectedPolicy, cycleMAO, currentMetricScore }: DPMCardProps) {
  const rule = FRAMEWORK_RULES[currentCycle];
  const targetScore = (cycleMAO * rule.winThresholdScalar).toFixed(2);
  const activeTextColor = CYCLE_TEXT_COLOR_CLASS[currentCycle];
  const activeBorderColor = CYCLE_BORDER_COLOR_CLASS[currentCycle];

  if (isParliamentDissolved) {
    return (
      <div className="flex-1 rounded-xl border-2 border-rose-400 bg-rose-50 flex flex-col shrink-0 min-h-0 overflow-hidden shadow-md">
        <div className="p-3 border-b border-rose-200/50 bg-white/50 flex items-center gap-3 shrink-0">
          <span className="text-2xl bg-white border border-rose-200 w-10 h-10 flex items-center justify-center rounded-full shadow-sm shrink-0">🧑‍💼</span>
          <div>
            <p className="text-xl font-bold text-zinc-800 mt-0.5">
              Term Concluded
            </p>
          </div>
        </div>
        <div className="p-4 flex-1 flex flex-col justify-center items-center text-center">
          <p className="text-lg font-black text-rose-900 mb-1">Parliament is Dissolved.</p>
          <p className="text-sm text-rose-700 font-medium">The public are heading to the polls to deliver their verdict.</p>
        </div>
      </div>
    );
  }

  const getAdvisory = (): string =>
    dpmAdvisory({ currentCycle, currentTurn, selectedPolicy: !!selectedPolicy, cycleMAO, currentMetricScore });

  return (
    <div className="flex-1 rounded-xl border border-zinc-200 bg-white flex flex-col shrink-0 min-h-0 overflow-hidden shadow-sm relative z-0">
      <div className="p-3 border-b border-zinc-200 bg-zinc-100 flex items-center gap-3 shrink-0 relative z-10">
        <span className="text-2xl bg-white border border-zinc-200 w-10 h-10 flex items-center justify-center rounded-full shadow-sm shrink-0">🧑‍💼</span>
        <div>
          <h3 className="text-xl font-bold text-zinc-900 tracking-tight">What is your decision, Prime Minister?</h3>
        </div>
      </div>

      <div className="p-3 flex-1 flex flex-col gap-3 overflow-hidden">
        <div className="grid grid-cols-2 gap-3 shrink-0">
          <StatBlock 
            label="Current Score" 
            value={currentMetricScore.toFixed(2)} 
            accentClassName={activeBorderColor} 
            labelClassName={activeTextColor} 
          />
          <StatBlock 
            label="Target Score" 
            value={targetScore} 
            accentClassName="border-l-zinc-500" 
            labelClassName="text-zinc-500" 
            valueClassName="text-zinc-700" 
            muted 
          />
        </div>

        <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-xl shadow-sm flex-1 flex flex-col min-h-0">
          <div className="mb-2 shrink-0 pb-2 border-b border-zinc-200">
            <span className="text-base font-bold text-zinc-900 block">
              Aim: Increase {rule.targetMetricName} <span className="text-zinc-500 font-black ml-1">({rule.targetMetricAbbreviation})</span>
            </span>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <span className={`text-base font-black uppercase tracking-widest block mb-1 shrink-0 ${activeTextColor}`}>
              Advisory Note
            </span>
            <div className="flex-1 overflow-y-auto pr-1">
              <p className="text-sm text-zinc-700 italic leading-relaxed">"{getAdvisory()}"</p>
              {currentCycle === ElectionCycle.PersonalUtility && <LensCompare />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}