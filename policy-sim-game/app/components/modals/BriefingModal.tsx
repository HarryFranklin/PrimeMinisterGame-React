import React from 'react';
import { ElectionCycle } from '../../utils/types';
import { FRAMEWORK_RULES } from '../../utils/frameworkRules';
import { ModalOverlay, ModalContent, ModalHeader, InteractiveDPMEmail } from './SharedModalComponents';

interface BriefingModalProps {
  currentCycle: ElectionCycle;
  onAcknowledge: () => void;
}

export default function BriefingModal({ currentCycle, onAcknowledge }: BriefingModalProps) {
  const rule = FRAMEWORK_RULES[currentCycle];

  const getBriefingText = () => {
    switch (currentCycle) {
      case ElectionCycle.Benthamite:
        return "Prime Minister, our objective is simple: maximise total life satisfaction.\n\nReview the distribution and find policies that increase the life satisfaction of the largest mass of citizens.";
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
    <ModalContent maxWidth="max-w-xl">
      <ModalHeader title="Term Briefing" subtitle={rule.frameworkTitle} />
      
      <div className="p-4 md:p-6 flex flex-col gap-6 bg-zinc-50/50 rounded-xl mt-4 border border-zinc-100">
        <InteractiveDPMEmail 
          title="Strategic Objective"
          message={getBriefingText()}
          onAcknowledge={onAcknowledge}
          typeSpeed={25}
        />
      </div>
    </ModalContent>
  );
}