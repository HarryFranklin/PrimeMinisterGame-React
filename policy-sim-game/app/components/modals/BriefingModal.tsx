import React, { useEffect, useState } from 'react';
import { ElectionCycle } from '../../utils/types';
import { FRAMEWORK_RULES } from '../../utils/frameworkRules';
import { getPMProfile } from '../../utils/pmProfiles';
import { ModalContent, ModalHeader, InteractiveDPMEmail, FloatingDefinitionPanel } from './SharedModalComponents';
import { useGame } from '../../context/GameStateContext';
import PMIdentityBanner from '../PMIdentityBanner';
import { track } from '../../client/telemetry';
import { useTypewriterTelemetry, useDwellTimer } from '../../client/hooks';

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
  const cycleKey = ElectionCycle[currentCycle];

  const getBriefingMessage = () => {
    let msg = `Office of ${profile.name}\n\n`;
    msg += `Dear PM,\n\nI know you are very busy, so I'll get right to it.\n\n`;
    msg += rule.briefingText;
    return msg;
  };

  const briefingText = getBriefingMessage();
  const tw = useTypewriterTelemetry(briefingText);
  const dwell = useDwellTimer();

  useEffect(() => {
    track('briefing_opened', {
      cycle: cycleKey,
      attempt_number: cycleAttempts,
      is_retry: isRetryingTerm,
    });
    dwell.start();
  }, []);

  const handleMetricClick = () => {
    setShowDefinition(true);
    track('briefing_metric_definition_clicked', {
      cycle: cycleKey,
      metric_name: rule.targetMetricName,
    });
  };

  const handleSkip = () => {
    tw.onSkip();
  };

  const handleProceed = (usedSkipButton = false) => {
    const info = tw.getSkipInfo();
    if (info.was_skipped && !usedSkipButton) {
      track('briefing_text_skipped', { cycle: cycleKey, elapsed_ms: info.elapsed_ms, pct_seen: info.pct_seen });
    }
    track('briefing_proceeded', {
      cycle: cycleKey,
      dwell_ms: dwell.stop(),
      used_skip_button: usedSkipButton,
    });
    onAcknowledge();
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
        <PMIdentityBanner cycle={currentCycle} className="-mt-1" />
        <p className="text-zinc-600 text-sm text-center">
          The Civil Service has prepared your mandate for the upcoming term.
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <button
            onClick={handleMetricClick}
            className="text-[11px] font-bold uppercase tracking-widest bg-pink-50 text-pink-700 border border-pink-200 rounded-full px-3 py-1 hover:bg-pink-100 transition-colors cursor-pointer"
          >
            {rule.targetMetricName} ({rule.targetMetricAbbreviation})
          </button>
        </div>
        <InteractiveDPMEmail
          title="Official Mandate"
          message={briefingText}
          onAcknowledge={() => handleProceed(false)}
          onSkip={handleSkip}
          buttonText="Accept Mandate & Begin Term"
          typeSpeed={25}
        />
        {isRetryingTerm && (
          <div className="text-center animate-in fade-in">
            <button
              onClick={() => handleProceed(true)}
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