import React from 'react';
import { ModalContent, ModalHeader, InteractiveDPMEmail } from './SharedModalComponents';

interface IntroModalProps {
  onAcknowledge: () => void;
}

export default function IntroModal({ onAcknowledge }: IntroModalProps) {
  const introText = "Welcome to the Prime Minister Game.\n\nThe game is comprised of four levels. In each, you will adopt the persona of a different Prime Minister, each with their own distinct philosophy on how society should be governed. You must master these ideas and enact aligned policies to secure re-election and pass the level.\n\nYour overarching goal is to fully understand and balance these competing political frameworks. Good luck.";
  
  return (
    <ModalContent maxWidth="max-w-[500px]" slideEntry slideExit>
      <ModalHeader title="Welcome" subtitle="Game Overview" />
      <InteractiveDPMEmail 
        title="System Initialisation"
        message={introText}
        onAcknowledge={onAcknowledge}
        buttonText="Proceed to Level Select"
      />
    </ModalContent>
  );
}