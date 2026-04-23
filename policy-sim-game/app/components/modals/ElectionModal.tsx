import React from 'react';
import { ElectionCycle } from '../../utils/types';
import { FRAMEWORK_RULES } from '../../utils/frameworkRules';

interface ElectionModalProps {
  currentMetricScore: number;
  currentCycle: ElectionCycle;
  approvalRating: number;
  onNextCycle: () => void;
  onReset: () => void;
  onFinish?: () => void;
}

export default function ElectionModal({ currentMetricScore, currentCycle, approvalRating, onNextCycle, onReset, onFinish }: ElectionModalProps) {

  const rule = FRAMEWORK_RULES[currentCycle];
  const won = approvalRating >= 51.0; 
  
  let nextCycleName = "";
  let isFinalCycle = false;
  let debriefText = "";
  let canProceed = true; // Determines if the player is allowed to move to the next cycle

  // Map out the logic according to the Study Plan's Game Flow Logic
  if (currentCycle === ElectionCycle.Benthamite) {
    nextCycleName = "Proceed to Next Cycle"; 
    // Logic on Loss: Restart (Tutorial phase)
    if (won) {
      debriefText = "“You successfully raised the average Life Satisfaction, but look at the effect it had on inequality and the societal floor. This is the primary limitation of a strictly Benthamite approach to policy aggregation.”";
      canProceed = true;
    } else {
      debriefText = "You failed to secure a majority. Try again to achieve the goal of increasing average Life Satisfaction.";
      canProceed = false; 
    }
  } else if (currentCycle === ElectionCycle.Rawlsian) {
    nextCycleName = "Proceed to Next Cycle"; 
    isFinalCycle = false;
    // Logic on Loss: Proceed (Intentional "impossible" difficulty to prompt utility frameworks)
    debriefText = "“While you prioritised pulling up the societal floor, the intense compromise required suggests that raw Life Satisfaction scores might not capture the full reality of individual happiness. Are all citizens at 'LS 2' experiencing the same level of utility?”";
    canProceed = true;
  } else if (currentCycle === ElectionCycle.PersonalUtility) {
    nextCycleName = "Proceed to Next Cycle"; 
    isFinalCycle = false;
    // Logic on Loss: Proceed (Failure is a valid research outcome demonstrating the "Status Quo Trap")
    debriefText = "“You’ve encountered the 'status quo trap'; because citizens prioritised personal risk and loss aversion, meaningful redistribution became impossible.”";
    canProceed = true;
  } else {
    isFinalCycle = true;
    canProceed = true;
    // Logic on Loss: Outcome (Measures if the player recognises societal utilities)
    if (won) {
      debriefText = "“By applying the Wellbeing-Equity Trade-off Model, you achieved a win state by prioritising collective fairness and inequality aversion.”";
    } else {
      debriefText = "“You failed to reach the 51% threshold. This framework measures whether you recognise that focusing on societal utilities and fairness can be an effective way to govern.”";
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-md transition-all">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-10 border border-zinc-200 animate-in zoom-in duration-300">
        
        <div className="text-center mb-8">
          <h2 className="text-4xl font-black tracking-tight text-zinc-900 mb-2">
            {won ? "Re-elected" : "Term in Opposition"}
          </h2>
          <p className={`text-sm font-bold uppercase tracking-widest ${won ? 'text-emerald-600' : 'text-rose-600'}`}>
            {rule.frameworkTitle}
          </p>
        </div>

        <div className={`p-8 rounded-2xl border-2 mb-8 text-center ${
          won ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
        }`}>
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
            Final Approval Rating
          </p>
          <div className="flex items-baseline justify-center gap-2 mb-2">
             <p className={`text-6xl font-black ${won ? 'text-emerald-600' : 'text-rose-600'}`}>
               {approvalRating.toFixed(1)}%
             </p>
             <p className="text-zinc-400 font-bold text-lg">/ 51.0% Required</p>
          </div>
          <p className="text-sm text-zinc-400 font-bold mt-2 uppercase tracking-widest">
             True {rule.targetMetricName}: {currentMetricScore.toFixed(2)}
          </p>
        </div>

        {/* Debrief text is now always shown to ensure educational delivery */}
        <div className="mb-8 p-6 bg-zinc-50 rounded-xl border border-zinc-200 italic text-zinc-600 text-sm leading-relaxed">
          <span className="font-bold text-zinc-800 not-italic block mb-1">Ministerial Debrief:</span>
          {debriefText}
        </div>

        <div className="flex gap-4">
          {/* Secondary Button: Always allow retry, but style it prominently only if it's the mandatory action */}
          <button 
            onClick={onReset} 
            className={`py-4 font-bold rounded-xl transition-all border ${
              !canProceed 
                ? "flex-1 bg-zinc-900 text-white hover:bg-black border-transparent shadow-lg" // Primary style if they MUST retry
                : "flex-1 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border-zinc-300" // Secondary style if they are allowed to proceed
            }`}
          >
            {won ? "Restart Cycle" : "Try Again"}
          </button>
          
          {/* Primary Button: Proceed to Next / Finish */}
          {canProceed && !isFinalCycle && (
            <button onClick={onNextCycle} className="flex-1 py-4 bg-zinc-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-lg">
              {nextCycleName}
            </button>
          )}

          {canProceed && isFinalCycle && onFinish && (
            <button onClick={onFinish} className="flex-1 py-4 bg-pink-600 text-white font-bold rounded-xl hover:bg-pink-700 transition-all shadow-lg">
              Finish Simulation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}