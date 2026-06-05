import React from 'react';
import { ElectionCycle } from '../../utils/types';
import { FRAMEWORK_RULES } from '../../utils/frameworkRules';
import { ModalOverlay, ModalContent, ModalHeader, DPMMessage, ModalActionBtn } from './SharedModalComponents';

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
    <ModalOverlay>
      <ModalContent maxWidth="max-w-xl">
        <ModalHeader title={won ? "Re-elected" : "Term in Opposition"} subtitle={rule.frameworkTitle} />

        <div className={`p-6 rounded-xl border-2 mb-2 text-center shrink-0 ${
          won ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
        }`}>
          <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
            Final Approval Rating
          </p>
          <div className="flex items-baseline justify-center gap-2 mb-2">
             <p className={`text-5xl font-black ${won ? 'text-emerald-600' : 'text-rose-600'}`}>
               {approvalRating.toFixed(1)}%
             </p>
             <p className="text-zinc-400 font-bold text-sm md:text-base">/ 51.0% Required</p>
          </div>
          <p className="text-xs text-zinc-400 font-bold mt-2 uppercase tracking-widest">
             True {rule.targetMetricName}: {currentMetricScore.toFixed(2)}
          </p>
        </div>

        <DPMMessage title="End of Term Debrief" className="mb-2">
          "{debriefText}"
        </DPMMessage>

        <div className="flex flex-col sm:flex-row gap-3">
          <ModalActionBtn onClick={onReset} variant={!canProceed ? "primary" : "secondary"}>
            {won ? "Restart Cycle" : "Try Again"}
          </ModalActionBtn>
          
          {canProceed && !isFinalCycle && (
            <ModalActionBtn onClick={onNextCycle}>{nextCycleName}</ModalActionBtn>
          )}
          
          {canProceed && isFinalCycle && onFinish && (
            <ModalActionBtn onClick={onFinish} variant="accent">Finish Simulation</ModalActionBtn>
          )}
        </div>
      </ModalContent>
    </ModalOverlay>
  );
}