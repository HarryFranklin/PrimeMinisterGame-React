import React from 'react';
import { ElectionCycle, Policy } from '../utils/types';
import { FRAMEWORK_RULES } from '../utils/frameworkRules';
import { InlineDPMMessage } from './modals/SharedModalComponents';

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
      case ElectionCycle.Benthamite: return "Maximise overall utility across the entire distribution.";
      case ElectionCycle.Rawlsian: return "Lift the most vulnerable citizens to raise the minimum standard of living.";
      case ElectionCycle.PersonalUtility: return "Target groups whose personal utility yields the highest return.";
      case ElectionCycle.SocietalUtility: return "Balance objective wellbeing with the electorate's demand for fairness.";
      default: return "Awaiting instructions.";
    }
  };

  const getAdvisory = () => {
    if (selectedPolicy) return "Review the projected impact on the Electorate Analysis tab before enacting this bill.";
    switch (currentCycle) {
      case ElectionCycle.Benthamite: return "Do not let the lowest percentiles distract you if the middle can be boosted more efficiently.";
      case ElectionCycle.Rawlsian: return "While your focus should be on those at the lower percentiles, don't neglect those in the middle, as they could slip down too!";
      case ElectionCycle.PersonalUtility: return "Beware of loss aversion. Citizens will protect their current status fiercely.";
      case ElectionCycle.SocietalUtility: return "Equality matters. An unhappy society will reject policies even if their personal outcomes improve.";
      default: return "";
    }
  };

  // Create a dynamic ID that ignores turns, but tracks policy selection
  const advisoryId = selectedPolicy 
    ? `dashboard_advisory_policy_${currentCycle}_${selectedPolicy.id}`
    : `dashboard_advisory_general_${currentCycle}`;

  return (
    <div className="flex-1 rounded-xl border border-zinc-200 bg-white flex flex-col shrink-0 min-h-0 overflow-hidden shadow-sm relative z-0">

      <div className="p-4 border-b border-zinc-100 bg-zinc-50/80 flex items-center gap-3 shrink-0 relative z-10">
        <span className="text-3xl bg-white border border-zinc-200 w-12 h-12 flex items-center justify-center rounded-full shadow-sm shrink-0">📁</span>
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400 leading-tight">
            Deputy Prime Minister
          </p>
          <p className="text-sm md:text-base font-bold text-zinc-800 mt-0.5">
            Official Mandate
          </p>
        </div>
      </div>
      
      <div className="p-5 flex-1 flex flex-col gap-4 overflow-y-auto relative z-10">
        <div className="bg-white border-l-4 border-l-pink-500 border-y border-r border-zinc-200 p-4 rounded-r-xl shadow-sm">
          <span className="text-[11px] font-black uppercase tracking-widest text-pink-600 block mb-1">Target Metric</span>
          <span className="text-sm font-bold text-zinc-800 leading-tight block mb-1">{rule.targetMetricName}</span>
          <span className="block text-3xl font-black text-zinc-900">{targetScore}</span>
        </div>
        
        <div className="bg-white border border-zinc-200 p-4 rounded-xl shadow-sm">
          <span className="text-[11px] font-black uppercase tracking-widest text-zinc-500 block mb-2">Strategic Focus</span>
          <span className="text-sm font-medium text-zinc-700 leading-relaxed block">{getFocus()}</span>
        </div>

        <div className="mt-auto shrink-0 z-20">
          <InlineDPMMessage 
            persistenceId={advisoryId} // Apply the dynamic ID here
            title="Advisory Note"
            message={getAdvisory()} 
          />
        </div>
      </div>
    </div>
  );
}