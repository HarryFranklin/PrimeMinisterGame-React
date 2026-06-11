import React from 'react';
import { ModalOverlay, ModalContent, ModalHeader, InteractiveDPMEmail } from './SharedModalComponents';

interface WelcomeModalProps {
  onAcknowledge: () => void;
}

export default function WelcomeModal({ onAcknowledge }: WelcomeModalProps) {
  const welcomeText = "Prime Minister, congratulations on your election. The country is looking to you for leadership.\n\nThe public mandate is evolving; as societal priorities shift, so too must the metrics by which you are judged. Should you secure a mandate this term, be advised that the criteria for success will evolve in the future, demanding a more nuanced approach to governance.\n\nYour first agenda awaits.";

  return (
    <ModalContent maxWidth="max-w-xl">
      <ModalHeader title="Welcome Prime Minister" subtitle="Introduction" />
      
      <div className="p-6 md:p-8 flex flex-col gap-6 bg-zinc-50/50 rounded-xl mt-4">
        <InteractiveDPMEmail 
          title="Orientation"
          message={welcomeText}
          onAcknowledge={onAcknowledge}
          buttonText="Understood"
          typeSpeed={25}
        />
      </div>
    </ModalContent>
  );
}