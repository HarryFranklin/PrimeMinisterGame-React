import React, { useState } from 'react';
import { ElectionCycle } from '../../utils/types';
import { FRAMEWORK_RULES } from '../../utils/frameworkRules';
import { ModalContent, ModalHeader, InteractiveDPMEmail, FloatingDefinitionPanel } from './SharedModalComponents';
import { useGame } from '../../context/GameStateContext';

interface BriefingModalProps {
  currentCycle: ElectionCycle;
  onAcknowledge: () => void;
}

export default function BriefingModal({ currentCycle, onAcknowledge }: BriefingModalProps) {
  const rule = FRAMEWORK_RULES[currentCycle];
  const { cycleAttempts } = useGame();
  const [showDefinition, setShowDefinition] = useState(false);

  const isRetryingTerm = cycleAttempts > 1;

  const getDiegeticContext = () => {
    switch(currentCycle) {
      case ElectionCycle.Benthamite:
        return "Welcome to Number 10, Prime Minister. The country is looking to you for leadership.";
      case ElectionCycle.Rawlsian:
        return "Following your re-election, a severe global economic shock has wiped out our previous gains. The national baseline has reset, and we are back to square one.";
      case ElectionCycle.SocietalUtility:
        return "Another term, another crisis. Global supply chain collapses have reset the economy. The public is demanding not just recovery, but a fundamentally fairer society.";
      case ElectionCycle.PersonalUtility:
        return "A devastating cost-of-living crisis has levelled the playing field once again. The electorate is anxious and hyper-focused on their own survival.";
      default:
        return "";
    }
  };

  const getBriefingMessage = () => {
    let msg = `PRIME MINISTER'S MANDATE: TERM ${currentCycle + 1}\n\n`;
    msg += `THE SITUATION:\n${getDiegeticContext()}\n\n`;
    msg += `YOUR GOAL:\n${rule.briefingText}`;
    return msg;
  };

  return (
    <ModalContent 
      maxWidth="max-w-xl" 
      slideEntry 
      slideExit
      floatingPanel={
        <FloatingDefinitionPanel 
          title={rule.targetMetricName}
          description={rule.targetMetricDescription}
          isVisible={showDefinition}
        />
      }
    >
      <div className="flex-1 flex flex-col w-full gap-4">
        <ModalHeader title="New Term Commencing" subtitle="Classified Briefing" />
        <p className="text-zinc-600 text-sm text-center">
          The Civil Service has prepared your mandate for the upcoming term.
        </p>

        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold uppercase tracking-widest bg-zinc-100 text-zinc-600 border border-zinc-200 rounded-full px-3 py-1">
            {rule.frameworkTitle}
          </span>
          <button
            onClick={() => setShowDefinition(true)}
            className="text-[11px] font-bold uppercase tracking-widest bg-pink-50 text-pink-700 border border-pink-200 rounded-full px-3 py-1 hover:bg-pink-100 transition-colors cursor-pointer"
          >
            {rule.targetMetricName} ({rule.targetMetricAbbreviation})
          </button>
        </div>

        <InteractiveDPMEmail 
          title="Official Mandate"
          message={getBriefingMessage()}
          onAcknowledge={onAcknowledge}
          buttonText="Accept Mandate & Begin Term"
          typeSpeed={25}
        />

        {isRetryingTerm && (
          <div className="text-center animate-in fade-in">
            <button
              onClick={onAcknowledge}
              className="text-xs font-bold text-zinc-400 hover:text-zinc-600 uppercase tracking-widest transition-colors cursor-pointer"
            >
              Skip Briefing
            </button>
          </div>
        )}
      </div>
    </ModalContent>
  );
}