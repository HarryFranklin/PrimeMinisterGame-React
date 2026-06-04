import React from 'react';
import { ElectionCycle, Policy } from '../utils/types';

interface DPMCardProps {
  currentCycle: ElectionCycle;
  currentTurn: number;
  isAgendaUnlocked: boolean;
  setIsAgendaUnlocked: (unlocked: boolean) => void;
  selectedPolicy: Policy | null;
}

export default function DPMCard({ currentCycle, currentTurn, isAgendaUnlocked, setIsAgendaUnlocked, selectedPolicy }: DPMCardProps) {
  
  const getDPMDialogue = () => {
    if (!isAgendaUnlocked) {
      switch (currentCycle) {
        case ElectionCycle.Benthamite:
          // Added \n\n for the paragraph break
          return "Prime Minister, our objective is simple: maximise total societal happiness.\n\nReview the distribution and find a policy that pushes the largest mass of citizens to the right.";
        case ElectionCycle.Rawlsian:
          return "The overall average is irrelevant if our most vulnerable are suffering.\n\nLook closely at the left side of the distribution. Your mandate is to raise that floor.";
        case ElectionCycle.PersonalUtility:
          return "We are now measuring Personal Utility.\n\nCitizens are no longer evaluating raw wellbeing; they are subjectively valuing their circumstances. We must navigate their individual priorities.";
        case ElectionCycle.SocietalUtility:
          return "Citizens are now evaluating policies through a lens of empathy and fairness.\n\nThey are looking at the whole distribution, not just their own pockets. Consensus will be difficult.";
        default:
          return "Awaiting instructions.";
      }
    } else {
      if (selectedPolicy) {
        // Added \n\n for the paragraph break
        return `You have drafted the ${selectedPolicy.policyName} bill.\n\nReview the projected impact on the graphs to ensure it aligns with our current framework.`;
      }
      switch (currentCycle) {
        case ElectionCycle.Benthamite:
          return "Standing Order: Maximise the average Life Satisfaction of the electorate.";
        case ElectionCycle.Rawlsian:
          return "Standing Order: Identify the citizens with the lowest Life Satisfaction and pull them up.";
        case ElectionCycle.PersonalUtility:
          return "Standing Order: Target groups whose personal utility yields the highest return.";
        case ElectionCycle.SocietalUtility:
          return "Standing Order: Balance objective wellbeing with the electorate's demand for fairness.";
        default:
          return "Awaiting instructions.";
      }
    }
  };

  if (isAgendaUnlocked) {
    return (
      <div className={`flex-1 rounded-xl border-2 transition-all flex flex-col shrink-0 min-h-0 overflow-hidden shadow-sm border-zinc-200 bg-white`}>
        {/* STANDARDISED DPM HEADER */}
        <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center gap-3 shrink-0">
          <span className="text-3xl bg-white border border-zinc-200 w-12 h-12 flex items-center justify-center rounded-full shadow-sm shrink-0">🧑‍💼</span>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-zinc-400 leading-tight">
              Deputy Prime Minister
            </p>
            <p className="text-sm md:text-base font-bold text-zinc-800 mt-0.5">
              Turn {currentTurn} Guidance
            </p>
          </div>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto flex items-center">
          <p className="text-sm md:text-base leading-relaxed italic text-zinc-500 whitespace-pre-wrap">
            "{getDPMDialogue()}"
          </p>
        </div>
      </div>
    );
  }

  // Locked/Briefing State
  return (
    <div className="flex-1 rounded-xl border-2 border-pink-300 bg-pink-50 flex flex-col shrink-0 min-h-0 overflow-hidden shadow-md">
      {/* STANDARDISED DPM HEADER */}
      <div className="p-4 border-b border-pink-200/50 bg-white/50 flex items-center gap-3 shrink-0">
        <span className="text-3xl bg-white border border-pink-200 w-12 h-12 flex items-center justify-center rounded-full shadow-sm shrink-0">🧑‍💼</span>
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-pink-600 leading-tight">
            Deputy Prime Minister
          </p>
          <p className="text-sm md:text-base font-bold text-zinc-800 mt-0.5">
            Confidential Briefing
          </p>
        </div>
      </div>
      
      <div className="p-4 flex-1 overflow-y-auto flex items-center">
        <p className="text-sm md:text-base leading-relaxed italic text-zinc-700 whitespace-pre-wrap">
          "{getDPMDialogue()}"
        </p>
      </div>
      
      <div className="p-3 bg-white/50 border-t border-pink-200/50 shrink-0">
        <button 
          onClick={() => setIsAgendaUnlocked(true)}
          className="w-full py-3 bg-zinc-900 text-white text-sm font-bold uppercase tracking-widest rounded-lg hover:bg-black transition-all shadow-md animate-pulse cursor-pointer"
        >
          Acknowledge & Unlock Agenda
        </button>
      </div>
    </div>
  );
}