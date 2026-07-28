import React, { useEffect, useRef } from 'react';
import { ModalContent, ModalHeader, InteractiveDPMEmail } from './SharedModalComponents';
import { track } from '../../client/telemetry';
import { useTypewriterTelemetry, useDwellTimer } from '../../client/hooks';

interface IntroModalProps {
  onAcknowledge: () => void;
}

export default function IntroModal({ onAcknowledge }: IntroModalProps) {
  const introText = "Welcome to the Prime Minister Game.\n\nThe game is comprised of four levels. In each, you will adopt the persona of a different Prime Minister, each with their own distinct philosophy on how society should be governed. You must master these ideas and enact aligned policies to secure re-election and pass the level.\n\nYour overarching goal is to fully understand and balance these competing political frameworks. Good luck.";

  const tw = useTypewriterTelemetry(introText);
  const dwell = useDwellTimer();

  useEffect(() => {
    track('intro_opened', {});
    dwell.start();
  }, []);

  const handleSkip = () => {
    tw.onSkip();
  };

  const handleProceed = () => {
    const info = tw.getSkipInfo();
    if (info.was_skipped) {
      track('intro_text_skipped', { elapsed_ms: info.elapsed_ms, pct_seen: info.pct_seen });
    }
    track('intro_proceeded', { dwell_ms: dwell.stop() });
    onAcknowledge();
  };

  return (
    <ModalContent maxWidth="max-w-[500px]" slideEntry slideExit>
      <ModalHeader title="Welcome" subtitle="Game Overview" />
      <InteractiveDPMEmail
        title="System Initialisation"
        message={introText}
        onAcknowledge={handleProceed}
        onSkip={handleSkip}          // ← see note below
        buttonText="Proceed to Level Select"
      />
    </ModalContent>
  );
}