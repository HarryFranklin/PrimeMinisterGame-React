import React from 'react';
import { ElectionCycle } from '../../utils/types';
import { FRAMEWORK_RULES } from '../../utils/frameworkRules';
import { ModalContent, ModalHeader, InteractiveDPMEmail } from './SharedModalComponents';
import { useGame } from '../../context/GameStateContext';

interface BriefingModalProps {
  currentCycle: ElectionCycle;
  onAcknowledge: () => void;
}

export default function BriefingModal({ currentCycle, onAcknowledge }: BriefingModalProps) {
  const rule = FRAMEWORK_RULES[currentCycle];
  const { cycleAttempts } = useGame();

  const isRetryingTerm = cycleAttempts > 1;

  const getDiegeticContext = () => {
    switch(currentCycle) {
      case ElectionCycle.Benthamite:
        return "Welcome to Number 10, Prime Minister. The country is looking to you for leadership.";
      case ElectionCycle.Rawlsian:
        return "Following your re-election, a severe global economic shock has wiped out our previous gains. The national baseline has reset, and we are back to square one.";
      case ElectionCycle.PersonalUtility:
        return "A devastating cost-of-living crisis has levelled the playing field once again. The electorate is anxious and hyper-focused on their own survival.";
      case ElectionCycle.SocietalUtility:
        return "Another term, another crisis. Global supply chain collapses have reset the economy. The public is demanding not just recovery, but a fundamentally fairer society.";
      default:
        return "";
    }
  };

  const getBriefingMessage = () => {
    let msg = `PRIME MINISTER'S MANDATE: TERM ${currentCycle + 1}\n\n`;
    msg += `PHILOSOPHY: ${rule.frameworkTitle}\n`;
    msg += `KEY METRIC: ${rule.targetMetricName}\n\n`;
    msg += `THE SITUATION:\n${getDiegeticContext()}\n\n`;
    msg += `YOUR GOAL:\n${rule.briefingText}\n\n`;
    msg += `DIRECTIVE:\n`;

    if (currentCycle === ElectionCycle.Benthamite) {
      msg += `Raise the overall National Average Happiness.`;
    }
    if (currentCycle === ElectionCycle.Rawlsian) {
      msg += `Prioritise the country's most vulnerable citizens.`;
    }
    if (currentCycle === ElectionCycle.PersonalUtility) {
      msg += `Map voter self-interest and avoid policies that cause personal loss.`;
    }
    if (currentCycle === ElectionCycle.SocietalUtility) {
      msg += `Balance individual outcomes with the public demand for fairness.`;
    }

    return msg;
  };

  return (
    <ModalContent maxWidth="max-w-xl" slideEntry slideExit>
      <ModalHeader title="New Term Commencing" subtitle="Classified Briefing" />

      <p className="text-zinc-600 text-sm mb-4 text-center">
        The Civil Service has prepared your mandate for the upcoming term.
      </p>

      <InteractiveDPMEmail
        title="Official Mandate"
        message={getBriefingMessage()}
        onAcknowledge={onAcknowledge}
        buttonText="Accept Mandate & Begin Term"
        typeSpeed={25}
      />

      {isRetryingTerm && (
        <div className="mt-5 text-center animate-in fade-in">
          <button
            onClick={onAcknowledge}
            className="text-xs font-bold text-zinc-400 hover:text-zinc-600 uppercase tracking-widest transition-colors"
          >
            Skip Briefing →
          </button>
        </div>
      )}
    </ModalContent>
  );
}