import React from 'react';
import { ModalContent, ModalHeader, InteractiveDPMEmail } from './SharedModalComponents';

interface IntroModalProps {
  onAcknowledge: () => void;
}

export default function IntroModal({ onAcknowledge }: IntroModalProps) {
  const introText = "Welcome to the Prime Minister Game.\n\nYour goal is to understand and balance competing policymaking philosophies. There are four levels. In each, you will play as a different Prime Minister, each governing and judged by different metrics of societla success.\n\nTo succeed, you must learn the logic behind each metric and enact policies that satisfy your specific electorate. Good luck.";
  
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