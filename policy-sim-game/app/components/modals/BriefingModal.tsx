import React from 'react';
import { ElectionCycle } from '../../utils/types';
import { FRAMEWORK_RULES } from '../../utils/frameworkRules';
import { ModalOverlay, ModalContent, ModalHeader, DPMMessage, ModalActionBtn } from './SharedModalComponents';

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
    <ModalOverlay>
      <ModalContent maxWidth="max-w-xl">
        <ModalHeader title="Cycle Briefing" subtitle={rule.frameworkTitle} />
        <DPMMessage title="Confidential Mandate" className="mb-6">
          {getBriefingText()}
        </DPMMessage>
        <ModalActionBtn onClick={onAcknowledge} variant="accent">
          Acknowledge & Unlock Agenda
        </ModalActionBtn>
      </ModalContent>
    </ModalOverlay>
  );
}