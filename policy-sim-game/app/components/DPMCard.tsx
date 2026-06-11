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
      case ElectionCycle.Benthamite: 
        return "We need to boost the national average. Prioritise policies that deliver widespread benefits to the majority.";
      case ElectionCycle.Rawlsian: 
        return "The public is watching how we treat the most vulnerable. Focus on delivering for those who are less well-off.";
      case ElectionCycle.PersonalUtility: 
        return "Voters are incredibly protective of their own finances right now. If a policy costs them anything personally, they will be unhappy..";
      case ElectionCycle.SocietalUtility: 
        return "The public demands a fairer country. If we only enrich the wealthy while leaving others behind, they will turn on us regardless of economic growth.";
      default: 
        return "";
    }
  };

  return (
    <div className="flex-1 rounded-xl border border-zinc-200 bg-white flex flex-col shrink-0 min-h-0 overflow-hidden shadow-sm relative z-0">
      <div className="p-5 border-b border-zinc-100 bg-zinc-50/80 flex items-center gap-4 shrink-0 relative z-10">
        <span className="text-4xl bg-white border border-zinc-200 w-14 h-14 flex items-center justify-center rounded-full shadow-sm shrink-0">👱‍♂️</span>
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-zinc-400 leading-tight">
            Deputy Prime Minister
          </p>
          <h3 className="text-xl font-bold text-zinc-900 tracking-tight">What is your decision, Prime Minister?</h3>
        </div>
      </div>
      
      <div className="p-6 flex-1 flex flex-col gap-6 overflow-y-auto">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border-l-4 border-l-pink-500 border-y border-r border-zinc-200 p-4 rounded-r-xl shadow-sm">
            <span className="text-xs font-black uppercase tracking-widest text-pink-600 block mb-1">Current Score</span>
            <span className="block text-3xl font-black text-zinc-900">{currentMetricScore.toFixed(2)}</span>
          </div>
          <div className="bg-white border-l-4 border-l-zinc-500 border-y border-r border-zinc-200 p-4 rounded-r-xl shadow-sm opacity-90">
            <span className="text-xs font-black uppercase tracking-widest text-zinc-500 block mb-1">Target Score</span>
            <span className="block text-3xl font-black text-zinc-700">{targetScore}</span>
          </div>
        </div>
        
        <div className="bg-zinc-50 border border-zinc-200 p-5 rounded-xl shadow-sm">
          <span className="text-xs font-black uppercase tracking-widest text-zinc-500 block mb-2">Strategic Focus: {rule.targetMetricName}</span>
          <span className="text-base font-medium text-zinc-800 leading-relaxed block mb-4">{getFocus()}</span>
          
          <div className="border-t border-zinc-200 pt-4 mt-2">
            <span className="text-[12px] font-black uppercase tracking-widest text-pink-600 block mb-2">Advisory Note</span>
            <p className="text-sm text-zinc-700 italic">"{getAdvisory()}"</p>
          </div>
        </div>
      </div>
    </div>
  );
}