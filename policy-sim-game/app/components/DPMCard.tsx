import React from 'react';
import { ElectionCycle, Policy } from '../utils/types';
import { FRAMEWORK_RULES } from '../utils/frameworkRules';

interface DPMCardProps {
  currentCycle: ElectionCycle;
  currentTurn: number;
  isParliamentDissolved: boolean;
  selectedPolicy: Policy | null;
  cycleMAO: number;
  currentMetricScore: number;
}

export default function DPMCard({ currentCycle, currentTurn, isParliamentDissolved, selectedPolicy, cycleMAO, currentMetricScore }: DPMCardProps) {
  const rule = FRAMEWORK_RULES[currentCycle];
  const targetScore = (cycleMAO * rule.winThresholdScalar).toFixed(2);

  if (isParliamentDissolved) {
    return (
      <div className="flex-1 rounded-xl border-2 border-rose-400 bg-rose-50 flex flex-col shrink-0 min-h-0 overflow-hidden shadow-md">
        <div className="p-3 border-b border-rose-200/50 bg-white/50 flex items-center gap-3 shrink-0">
          <span className="text-2xl bg-white border border-rose-200 w-10 h-10 flex items-center justify-center rounded-full shadow-sm shrink-0"> </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 leading-tight">
              Deputy Prime Minister
            </p>
            <p className="text-sm font-bold text-zinc-800 mt-0.5">
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

  const getAdvisory = (): string => {
    const target = cycleMAO * rule.winThresholdScalar;
    const progressRatio = target > 0 ? Math.min(currentMetricScore / target, 1) : 0;
    const isBehind = progressRatio < 0.7;
    const isLate = currentTurn >= 4;

    if (selectedPolicy) {
      switch (currentCycle) {
        case ElectionCycle.SocietalUtility:
          return "You have two ways to read this. The details panel tells you who this policy affects and whether it widens or narrows the gap. A forecast will show you the score impact   run a forecast if you are unsure.";
        case ElectionCycle.PersonalUtility:
          return "You have two ways to read this. Open the details panel to see who this policy targets. Run a forecast to see how much your score will actually move.";
        default:
          return "Review the policy's impact before enacting it.";
      }
    }

    switch (currentCycle) {
      case ElectionCycle.Benthamite:
        return "We need to boost the national average. Prioritise policies that deliver widespread gains, as total numbers are all that matter right now.";
      case ElectionCycle.Rawlsian:
        return "The public is watching how we treat the most vulnerable. Focus your political capital entirely on raising the baseline for those worst-off.";
      case ElectionCycle.SocietalUtility: {
        if (currentTurn <= 2) return "Citizens are not just evaluating their own score here   they are evaluating the shape of the entire distribution. A rising average that widens inequality will cost you votes. Compression matters as much as growth.";
        if (isBehind && !isLate) return "We are behind. The score is dragged down when citizens observe a widening gap. Prioritise policies that either raise the floor or reduce the spread   even modest gains at the bottom count double here.";
        if (isBehind && isLate) return "We are running out of time. Enact policies that visibly compress the distribution. Citizens with inequality-averse preferences   the majority   will not forgive a rising tide that lifts only some boats.";
        return "We are on track. But beware of complacency   any policy that concentrates gains at the top can undo progress quickly. The societal score is sensitive to visible inequality.";
      }
      case ElectionCycle.PersonalUtility: {
        if (currentTurn <= 2) return "Personal utility is not linear. A citizen already at LS 8 gains almost nothing from another point upward   their curve has flattened. The real score gains come from lifting those in the LS 3-6 range, where the curve is steepest. Look at the Avg Utility row.";
        if (isBehind && !isLate) return "We are behind target. Focus on the columns with the highest Avg Utility in the table   those are the high-yield zones. Moving citizens into those columns is worth more than spreading gains evenly.";
        if (isBehind && isLate) return "Time is short and we are behind. Every remaining policy must target citizens in the steepest part of the utility curve. Gains at the top end are almost worthless   gains in the middle are not.";
        return "We are on track. Stay disciplined   avoid policies that look good for LS averages but push people into flat parts of the utility curve. The table tells you what actually counts.";
      }
      default:
        return "";
    }
  };

  return (
    <div className="flex-1 rounded-xl border border-zinc-200 bg-white flex flex-col shrink-0 min-h-0 overflow-hidden shadow-sm relative z-0">
      
      <div className="p-3 border-b border-zinc-200 bg-zinc-100 flex items-center gap-3 shrink-0 relative z-10">
        <span className="text-2xl bg-white border border-zinc-200 w-10 h-10 flex items-center justify-center rounded-full shadow-sm shrink-0">⚖️</span>
        <div>
          <p className="text-[12px] font-black uppercase tracking-widest text-zinc-500 leading-tight">
            Deputy Prime Minister
          </p>
          <h3 className="text-xl font-bold text-zinc-900 tracking-tight">What is your decision, Prime Minister?</h3>
        </div>
      </div>

      <div className="p-3 flex-1 flex flex-col gap-3 overflow-hidden">
        <div className="grid grid-cols-2 gap-3 shrink-0">
          <div className="bg-white border-l-4 border-l-pink-500 border-y border-r border-zinc-200 p-3 rounded-r-xl shadow-sm flex flex-col justify-center">
            <span className="text-[12px] font-black uppercase tracking-widest text-pink-600 block mb-0.5">Current Score</span>
            <span className="block text-2xl font-black text-zinc-900">{currentMetricScore.toFixed(2)}</span>
          </div>
          <div className="bg-white border-l-4 border-l-zinc-500 border-y border-r border-zinc-200 p-3 rounded-r-xl shadow-sm opacity-90 flex flex-col justify-center">
            <span className="text-[12px] font-black uppercase tracking-widest text-zinc-500 block mb-0.5">Target Score</span>
            <span className="block text-2xl font-black text-zinc-700">{targetScore}</span>
          </div>
        </div>
        
        <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-xl shadow-sm flex-1 flex flex-col min-h-0">
          <div className="mb-2 shrink-0">
            <span className="text-base font-bold text-zinc-900 block mb-1">
              {rule.targetMetricName} <span className="text-zinc-500 font-black ml-1">({rule.targetMetricAbbreviation})</span>
            </span>
            <p className="text-sm text-zinc-600 leading-relaxed line-clamp-3 2xl:line-clamp-none">
              {rule.targetMetricDescription}
            </p>
          </div>
          <div className="border-t border-zinc-200 pt-2 flex-1 flex flex-col min-h-0">
            <span className="text-base font-bold tracking-widest text-pink-600 block mb-1 shrink-0">Advisory Note</span>
            <div className="flex-1 overflow-y-auto pr-1">
              <p className="text-sm text-zinc-700 italic leading-relaxed">"{getAdvisory()}"</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}