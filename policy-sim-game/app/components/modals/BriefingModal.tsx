import React, { useState } from 'react';
import { ElectionCycle } from '../../utils/types';
import { FRAMEWORK_RULES } from '../../utils/frameworkRules';
import { getPMProfile } from '../../utils/pmProfiles';
import { ModalContent, ModalHeader, InteractiveDPMEmail, FloatingDefinitionPanel } from './SharedModalComponents';
import { useGame } from '../../context/GameStateContext';

interface BriefingModalProps {
  currentCycle: ElectionCycle;
  onAcknowledge: () => void;
}

export default function BriefingModal({ currentCycle, onAcknowledge }: BriefingModalProps) {
  const rule = FRAMEWORK_RULES[currentCycle];
  const profile = getPMProfile(currentCycle);
  const { cycleAttempts } = useGame();
  const [showDefinition, setShowDefinition] = useState(false);

  const isRetryingTerm = cycleAttempts > 1;

  const getBriefingMessage = () => {
    let msg = `Office of ${profile.name}\n\n`;
    msg += `I know you are very busy, so I'll get right to it.\n\n`;
    msg += rule.briefingText;
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

        {/* PM identity — carries the character/colour established at Level Select into the mandate itself */}
        <div className="flex items-center justify-center gap-3 -mt-1">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-4xl shrink-0 shadow-inner"
            style={{ backgroundColor: `${profile.color}22` }}
          >
            {profile.emoji}
          </div>
          <div className="text-left">
            <h3 className="font-black text-base text-zinc-900 leading-tight">{profile.name}</h3>
            <p className={`text-[10px] font-black uppercase tracking-widest ${profile.colorClass}`}>{rule.frameworkTitle}</p>
          </div>
        </div>

        <p className="text-zinc-600 text-sm text-center">
          The Civil Service has prepared your mandate for the upcoming term.
        </p>

        <div className="flex items-center justify-center gap-2 flex-wrap">
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