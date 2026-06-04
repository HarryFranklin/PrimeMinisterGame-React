import React from 'react';
import { ElectionCycle } from '../../utils/types';
import { FRAMEWORK_RULES } from '../../utils/frameworkRules';

interface ElectionModalProps {
  currentMetricScore: number;
  currentCycle: ElectionCycle;
  approvalRating: number;
  cycleAttempts: number;
  onNextCycle: () => void;
  onReset: () => void;
  onFinish?: () => void;
}

export default function ElectionModal({ currentMetricScore, currentCycle, approvalRating, cycleAttempts, onNextCycle, onReset, onFinish }: ElectionModalProps) {
  const rule = FRAMEWORK_RULES[currentCycle];
  const won = approvalRating >= 51.0; 
  
  let nextCycleName = "Proceed to Debrief"; 
  let isFinalCycle = false;
  let debriefText = "";
  let canProceed = true;

  if (currentCycle === ElectionCycle.Benthamite) {
    if (won) {
      debriefText = "Prime Minister, you successfully raised the average Life Satisfaction and secured a majority. The Benthamite goal has been achieved. However, relying purely on averages can be dangerous. Let's proceed to the debrief to examine the underlying societal distribution.";
      canProceed = true;
    } else {
      if (cycleAttempts >= 3) {
        debriefText = "You failed to secure a majority after 3 attempts. Governance is complex, and relying purely on averages can be dangerous. Let's proceed to the debrief to examine the underlying societal distribution and see why this failed.";
        canProceed = true;
      } else {
        debriefText = `You failed to secure a majority. You have ${3 - cycleAttempts} attempts remaining to increase average Life Satisfaction.`;
        canProceed = false;
      }
    }
  } else if (currentCycle === ElectionCycle.Rawlsian) {
    if (won) {
       debriefText = "You successfully pulled up the societal floor, but securing a comfortable majority required intense compromise. This suggests a flaw in our core metrics. Does raw 'Life Satisfaction' truly capture human happiness? Let's investigate in the debrief.";
       canProceed = true;
    } else {
       if (cycleAttempts >= 3) {
         debriefText = "You struggled to reach a majority after 3 attempts. You prioritised the societal floor, but the intense compromise required suggests a flaw in our core metrics. Does raw 'Life Satisfaction' truly capture human happiness? Let's investigate in the debrief.";
         canProceed = true;
       } else {
         debriefText = `You failed to pull up the societal floor while maintaining a majority. You have ${3 - cycleAttempts} attempts remaining.`;
         canProceed = false;
       }
    }
  } else if (currentCycle === ElectionCycle.PersonalUtility) {
    if (won) {
      debriefText = "You achieved a majority using Personal Utility. But because this framework operates entirely on individual rational choice, did it abandon the worst-off? Let's proceed to the debrief to review the data.";
      canProceed = true;
    } else {
      if (cycleAttempts >= 3) {
         debriefText = "We've encountered the 'status quo trap'. Because citizens voted strictly based on personal risk and loss aversion, meaningful redistribution became impossible. But are humans truly this selfish? Let's review the data.";
         canProceed = true;
      } else {
         debriefText = `You failed to secure a majority. Voters are acting defensively on personal utility. You have ${3 - cycleAttempts} attempts remaining.`;
         canProceed = false;
      }
    }
  } else if (currentCycle === ElectionCycle.SocietalUtility) {
    if (won) {
      debriefText = "By applying the Wellbeing-Equity Trade-off Model, you achieved a win state by balancing collective fairness and inequality aversion. But did it solve everything? Let's proceed to the debrief.";
      canProceed = true;
    } else {
      if (cycleAttempts >= 3) {
        debriefText = "You failed to reach the threshold after 3 attempts. Relying on societal utilities is complex, and it still opens the door to inequality when consensus fails. Let's proceed to the debrief.";
        canProceed = true;
      } else {
        debriefText = `You failed to reach the 51% threshold. You have ${3 - cycleAttempts} attempts remaining.`;
        canProceed = false;
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-md transition-all p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-8 md:p-10 border border-zinc-200 animate-in zoom-in duration-300">
        
        <div className="text-center mb-6 md:mb-8">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-zinc-900 mb-2">
            {won ? "Re-elected" : "Term in Opposition"}
          </h2>
          <p className={`text-xs md:text-sm font-bold uppercase tracking-widest ${won ? 'text-emerald-600' : 'text-rose-600'}`}>
            {rule.frameworkTitle}
          </p>
        </div>

        <div className={`p-6 md:p-8 rounded-2xl border-2 mb-6 md:mb-8 text-center ${
          won ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
        }`}>
          <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
            Final Approval Rating
          </p>
          <div className="flex items-baseline justify-center gap-2 mb-2">
             <p className={`text-5xl md:text-6xl font-black ${won ? 'text-emerald-600' : 'text-rose-600'}`}>
               {approvalRating.toFixed(1)}%
             </p>
             <p className="text-zinc-400 font-bold text-sm md:text-lg">/ 51.0% Required</p>
          </div>
          <p className="text-xs md:text-sm text-zinc-400 font-bold mt-2 uppercase tracking-widest">
             True {rule.targetMetricName}: {currentMetricScore.toFixed(2)}
          </p>
        </div>

        {/* STANDARDISED DPM HEADER */}
        <div className="mb-6 md:mb-8 p-5 md:p-6 bg-zinc-50 rounded-xl border border-zinc-200 text-sm md:text-base leading-relaxed">
          <div className="flex items-center gap-3 mb-4 border-b border-zinc-200/60 pb-4">
            <span className="text-3xl bg-white border border-zinc-200 w-12 h-12 flex items-center justify-center rounded-full shadow-sm shrink-0">🧑‍💼</span>
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-pink-600 leading-tight block mb-0.5">Deputy Prime Minister</span>
              <span className="font-bold text-zinc-800 text-sm md:text-base">End of Term Debrief</span>
            </div>
          </div>
          <p className="italic text-zinc-700">"{debriefText}"</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
          <button 
             onClick={onReset} 
             className={`py-3 md:py-4 font-bold rounded-xl transition-all border text-sm md:text-base ${
              !canProceed 
                 ? "flex-1 bg-zinc-900 text-white hover:bg-black border-transparent shadow-lg" 
                 : "flex-1 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border-zinc-300"
             }`}
          >
            {won ? "Restart Cycle" : "Try Again"}
          </button>
          
          {canProceed && !isFinalCycle && (
            <button onClick={onNextCycle} className="flex-1 py-3 md:py-4 bg-zinc-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-lg text-sm md:text-base">
              {nextCycleName}
            </button>
          )}
          
          {canProceed && isFinalCycle && onFinish && (
            <button onClick={onFinish} className="flex-1 py-3 md:py-4 bg-pink-600 text-white font-bold rounded-xl hover:bg-pink-700 transition-all shadow-lg text-sm md:text-base">
              Finish Simulation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}