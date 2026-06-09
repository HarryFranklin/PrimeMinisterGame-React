import React from 'react';
import { ModalOverlay, ModalContent, ModalHeader, InteractiveDPMEmail } from './SharedModalComponents';

interface WelcomeModalProps {
  onAcknowledge: () => void;
}

export default function WelcomeModal({ onAcknowledge }: WelcomeModalProps) {
  const welcomeText = "Prime Minister, congratulations on your election. The country is looking to you for leadership.\n\nOur objective over these upcoming terms is to evaluate different methodologies of societal wellbeing. You will be tested on various philosophical frameworks, evaluating how policies impact the electorate differently under each lens.\n\nYour first agenda awaits.";

  return (
    <ModalContent maxWidth="max-w-xl">
      <ModalHeader title="Welcome Prime Minister" subtitle="Initialisation" />
      
      <div className="p-6 md:p-8 flex flex-col gap-6 bg-zinc-50/50 rounded-xl mt-4">
        <InteractiveDPMEmail 
          title="Orientation"
          message={welcomeText}
          onAcknowledge={onAcknowledge}
          buttonText="Commence Term"
          typeSpeed={25}
        />
      </div>
    </ModalContent>
  );
}