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
  }, []);

  const handleOpenIntro = () => {
    track('intro_envelope_opened', {});
    // Reset here, not at mount - time spent with the envelope closed
    // shouldn't count as reading/dwell time.
    tw.reset();
    dwell.start();
  };

  const handleSkip = () => {
    tw.onSkip();
    // Track right here, at the moment the skip actually happens - not
    // deferred until Proceed is clicked, otherwise the skip and proceed
    // events end up with (almost) the same timestamp even though they may
    // have been minutes apart.
    const info = tw.getSkipInfo();
    track('intro_text_skipped', { elapsed_ms: info.elapsed_ms, pct_seen: info.pct_seen });
  };

  const handleProceed = () => {
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
        onProgress={tw.updateDisplayed}
        onOpen={handleOpenIntro}
        buttonText="Proceed to Level Select"
      />
    </ModalContent>
  );
}