import React from 'react';
import { ElectionCycle } from '../utils/types';

interface ElectionModalProps {
  approvalRating: number;
  currentCycle: ElectionCycle;
  onNextCycle: () => void;
  onReset: () => void;
}

export default function ElectionModal({ approvalRating, currentCycle, onNextCycle, onReset }: ElectionModalProps) {
  const won = approvalRating >= 60;
  const approvalPercentage = approvalRating.toFixed(1);
  
  let cycleName = "";
  let evaluatedMetric = "";
  let nextCycleName = "";
  let adviceText = "";

  // Logic to determine cycle-specific advice for the "Term in Opposition" [cite: 61]
  if (currentCycle === ElectionCycle.Benthamite) {
    cycleName = "Cycle 1: Benthamite";
    evaluatedMetric = "Average Life Satisfaction";
    nextCycleName = "Start Cycle 2: Rawlsian";
    adviceText = "The Benthamite framework requires the greatest good for the greatest number. You may have focused too heavily on niche demographics while neglecting the broad majority.";
  } else if (currentCycle === ElectionCycle.Rawlsian) {
    cycleName = "Cycle 2: Rawlsian";
    evaluatedMetric = "Least Well-Off LS";
    nextCycleName = "Start Cycle 3: Societal";
    adviceText = "The Rawlsian framework is binary: if the bottom demographic suffers, you fail. To succeed, you must raise the 'floor' of society, even at the expense of the wealthy.";
  } else if (currentCycle === ElectionCycle.SocietalUtility) {
    cycleName = "Cycle 3: Societal";
    evaluatedMetric = "Average Societal Utility";
    nextCycleName = "Start Cycle 4: Personal";
    adviceText = "Success here depends on how people believe society should be structured. Focus on policies that reduce perceived unfairness in the distribution of wellbeing.";
  } else {
    cycleName = "Cycle 4: Personal";
    evaluatedMetric = "Average Personal Utility";
    adviceText = "Individuals here care about their subjective gains. Ensure your policies are translating general wellbeing into personal satisfaction for each citizen.";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-md transition-all">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-10 border border-zinc-200 animate-in zoom-in duration-300">
        
        <div className="text-center mb-8">
          <h2 className="text-4xl font-black tracking-tight text-zinc-900 mb-2">
            {won ? "Re-elected" : "Term in Opposition"}
          </h2>
          <p className={`text-sm font-bold uppercase tracking-widest ${won ? 'text-emerald-600' : 'text-rose-600'}`}>
            {cycleName} Framework
          </p>
        </div>

        <div className={`p-8 rounded-2xl border-2 mb-8 text-center ${
          won ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
        }`}>
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
            Final {evaluatedMetric} Score
          </p>
          <div className="flex items-baseline justify-center gap-2 mb-2">
             <p className={`text-6xl font-black ${won ? 'text-emerald-600' : 'text-rose-600'}`}>
               {approvalPercentage}%
             </p>
             <p className="text-zinc-400 font-bold text-lg">/ 60.0% Required</p>
          </div>
        </div>

        {!won && (
          <div className="mb-8 p-6 bg-zinc-50 rounded-xl border border-zinc-200 italic text-zinc-600 text-sm leading-relaxed">
            <span className="font-bold text-zinc-800 not-italic block mb-1">Ministerial Debrief:</span>
            "{adviceText}" 
          </div>
        )}

        <div className="flex gap-4">
          <button 
            onClick={onReset}
            className="flex-1 py-4 bg-zinc-100 text-zinc-700 font-bold rounded-xl hover:bg-zinc-200 transition-all border border-zinc-300"
          >
            {won ? "Restart Cycle" : "Try Again"}
          </button>
          {won && currentCycle !== ElectionCycle.PersonalUtility && (
            <button 
              onClick={onNextCycle}
              className="flex-1 py-4 bg-zinc-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-lg"
            >
              {nextCycleName}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}