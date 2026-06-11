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
        <div className="p-4 border-b border-rose-200/50 bg-white/50 flex items-center gap-3 shrink-0">
          <span className="text-3xl bg-white border border-rose-200 w-12 h-12 flex items-center justify-center rounded-full shadow-sm shrink-0">🏛️</span>
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-rose-600 leading-tight">
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
      case ElectionCycle.Benthamite: return "Raise the national average happiness as high as possible.";
      case ElectionCycle.Rawlsian: return "Improve the lives of the most miserable and vulnerable citizens.";
      case ElectionCycle.PersonalUtility: return "Pass policies that benefit the largest number of selfish voters.";
      case ElectionCycle.SocietalUtility: return "Keep the country wealthy, but ensure the wealth is shared fairly.";
      default: return "Awaiting instructions.";
    }
  };

  const getAdvisory = () => {
    if (selectedPolicy) return "Review the likely impact on the Electorate Analysis tab before enacting this policy.";
    switch (currentCycle) {
      case ElectionCycle.Benthamite: return "We need to boost the national average happiness. Focus on the large middle-ground voters; they hold the keys to our success.";
      case ElectionCycle.Rawlsian: return "The public is watching how we treat the poorest. Focus your policies on the left side of the chart—every point gained there is worth two in the polls.";
      case ElectionCycle.PersonalUtility: return "People are incredibly protective of their own finances right now. If a policy costs them anything, they will revolt.";
      case ElectionCycle.SocietalUtility: return "The public wants a fairer country. If we only help the wealthy, they'll turn on us regardless of the growth numbers.";
      default: return "";
    }
  };

  return (
    <div className="flex-1 rounded-xl border border-zinc-200 bg-white flex flex-col shrink-0 min-h-0 overflow-hidden shadow-sm relative z-0">
      
      {/* Subtle Background Watermark */}
      <div className="absolute -right-8 -bottom-4 text-[150px] opacity-[0.03] pointer-events-none select-none z-[-1] grayscale">
        🏛️
      </div>

      <div className="p-4 border-b border-zinc-100 bg-zinc-50/80 flex items-center gap-3 shrink-0 relative z-10">
        <span className="text-3xl bg-white border border-zinc-200 w-12 h-12 flex items-center justify-center rounded-full shadow-sm shrink-0">👱‍♂️</span>
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400 leading-tight">
            Deputy Prime Minister
          </p>
          <p className="text-sm md:text-base font-bold text-zinc-800 mt-0.5">
            What is your decision?
          </p>
        </div>
      </div>
      
      <div className="p-5 flex-1 flex flex-col gap-4 overflow-y-auto relative z-10">
        
        <div className="grid grid-cols-2 gap-3 mb-2">
          <div className="bg-white border-l-4 border-l-pink-500 border-y border-r border-zinc-200 p-3 rounded-r-xl shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-widest text-pink-600 block mb-1">Current Score</span>
            <span className="block text-2xl font-black text-zinc-900">{currentMetricScore.toFixed(2)}</span>
          </div>
          <div className="bg-white border-l-4 border-l-zinc-500 border-y border-r border-zinc-200 p-3 rounded-r-xl shadow-sm opacity-90">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-1">Target Score</span>
            <span className="block text-2xl font-black text-zinc-700">{targetScore}</span>
          </div>
        </div>
        
        <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">Strategic Focus: {rule.targetMetricName}</span>
          <span className="text-sm font-medium text-zinc-700 leading-relaxed block mb-4">{getFocus()}</span>
          
          {/* Static Advisory Note */}
          <div className="border-t border-zinc-200 pt-3 mt-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-pink-600 block mb-1">Advisory Note</span>
            <p className="text-xs text-zinc-600 italic">"{getAdvisory()}"</p>
          </div>
        </div>

      </div>
    </div>
  );
}