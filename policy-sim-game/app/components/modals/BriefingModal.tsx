import React from 'react';
import { motion } from 'framer-motion';
import { ElectionCycle } from '../../utils/types';
import { FRAMEWORK_RULES } from '../../utils/frameworkRules';
import { ModalContent, ModalHeader, InteractiveDPMEmail } from './SharedModalComponents';

interface BriefingModalProps {
  currentCycle: ElectionCycle;
  onAcknowledge: () => void;
}

export default function BriefingModal({ currentCycle, onAcknowledge }: BriefingModalProps) {
  const rule = FRAMEWORK_RULES[currentCycle];

  // The narrative injection to explain the board resets!
  const getDiegeticContext = () => {
    switch(currentCycle) {
      case ElectionCycle.Benthamite: return "Welcome to Number 10, Prime Minister. The country is looking to you for leadership.";
      case ElectionCycle.Rawlsian: return "Following your re-election, a severe global economic shock has wiped out our previous gains. The national baseline has reset, and we are back to square one.";
      case ElectionCycle.PersonalUtility: return "A devastating cost-of-living crisis has leveled the playing field once again. The electorate is anxious and hyper-focused on their own survival.";
      case ElectionCycle.SocietalUtility: return "Another term, another crisis. Global supply chain collapses have reset the economy. The public is demanding not just recovery, but a fundamentally fairer society.";
      default: return "";
    }
  };

  const getBriefingMessage = () => {
    let msg = `PRIME MINISTER'S MANDATE: TERM ${currentCycle + 1}\n\n`;
    msg += `PHILOSOPHY: ${rule.frameworkTitle}\n\n`;
    msg += `THE SITUATION:\n${getDiegeticContext()}\n\n`;
    msg += `YOUR DIRECTIVE:\n${rule.briefingText}\n\n`;
    msg += `THE METRIC:\nCitizens will evaluate your success based on ${rule.targetMetricName}. `;
    
    if (currentCycle === ElectionCycle.Benthamite) msg += `You must raise the overall average.`;
    if (currentCycle === ElectionCycle.Rawlsian) msg += `You prioritise society's most vulnerable.`;
    if (currentCycle === ElectionCycle.PersonalUtility) msg += `Citizens will strictly guard their own utility against loss.`;
    if (currentCycle === ElectionCycle.SocietalUtility) msg += `Citizens will evaluate outcomes based on empathy and fairness.`;
    
    return msg;
  };

  return (
    <ModalContent maxWidth="max-w-xl">
      <ModalHeader title="New Term Commencing" subtitle="Classified Briefing" />
      
      <p className="text-zinc-600 text-sm mb-2 text-center">
        The Civil Service has prepared your mandate for the upcoming term.
      </p>

      {/* Kept the typewriter here as it makes sense for a dramatic term intro */}
      <InteractiveDPMEmail 
        title="Official Mandate" 
        message={getBriefingMessage()} 
        onAcknowledge={onAcknowledge}
        buttonText="Accept Mandate & Begin Term"
        typeSpeed={25}
      />
    </ModalContent>
  );
}