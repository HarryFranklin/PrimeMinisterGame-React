// components/modals/BriefingModal.tsx
import React from 'react';
import { ElectionCycle } from '../../utils/types';
import { FRAMEWORK_RULES } from '../../utils/frameworkRules';

interface BriefingModalProps {
  currentCycle: ElectionCycle;
  onAcknowledge: () => void;
}

export default function BriefingModal({ currentCycle, onAcknowledge }: BriefingModalProps) {
  const rule = FRAMEWORK_RULES[currentCycle];

  const getBriefingText = () => {
    switch (currentCycle) {
      case ElectionCycle.Benthamite:
        return "Prime Minister, our objective is simple: maximise total societal happiness.\n\nReview the distribution and find policies that push the largest mass of citizens to the right.";
      case ElectionCycle.Rawlsian:
        return "The overall average is irrelevant if our most vulnerable are suffering.\n\nLook closely at the left side of the distribution. Your mandate is to raise that floor.";
      case ElectionCycle.PersonalUtility:
        return "We are now measuring Personal Utility.\n\nCitizens are no longer evaluating raw wellbeing; they are subjectively valuing their circumstances. We must navigate their individual priorities and loss aversion.";
      case ElectionCycle.SocietalUtility:
        return "Citizens are now evaluating policies through a lens of empathy and fairness.\n\nThey are looking at the whole distribution, not just their own pockets. Consensus will be difficult.";
      default:
        return "Awaiting instructions.";
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm transition-all animate-in fade-in p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl flex flex-col border border-zinc-300 animate-in zoom-in duration-300 overflow-hidden relative">
        
        {/* Stark black header bar for an official document look */}
        <div className="absolute top-0 left-0 right-0 h-3 bg-zinc-900" />
        
        <div className="pt-8 p-6 md:p-8 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-zinc-900 leading-tight">Cycle Briefing</h2>
            <p className="text-[12px] font-bold uppercase tracking-widest text-zinc-500 mt-1 font-mono">{rule.frameworkTitle}</p>
          </div>
          <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center border border-zinc-200 shrink-0">
            <span className="text-xl">📁</span>
          </div>
        </div>

        <div className="p-6 md:p-8 flex flex-col gap-6 bg-zinc-50/50">
          <div className="bg-white p-5 rounded-lg border border-zinc-200 shadow-sm relative">
            <span className="text-[12px] font-black uppercase tracking-widest text-zinc-400 leading-tight block mb-4 font-mono border-b border-zinc-100 pb-2">
              MESSAGE FROM: DEPUTY PRIME MINISTER
            </span>
            <div className="text-zinc-700 text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium font-black">
              "{getBriefingText()}"
            </div>
          </div>
          
          <button 
            onClick={onAcknowledge} 
            className="w-full py-4 bg-zinc-900 text-white text-sm font-bold uppercase tracking-widest rounded-xl hover:bg-black transition-all shadow-md shrink-0"
          >
            Acknowledge & Unlock Agenda
          </button>
        </div>
      </div>
    </div>
  );
}