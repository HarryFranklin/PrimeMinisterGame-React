import React from 'react';
import { ModalContent, ModalHeader, InteractiveDPMEmail } from './SharedModalComponents';

interface WelcomeModalProps {
  onAcknowledge: () => void;
}

export default function WelcomeModal({ onAcknowledge }: WelcomeModalProps) {
  const welcomeText = "Prime Minister, congratulations on your election. The country is looking to you for leadership.\n\nThe public mandate is evolving; as societal priorities shift, so do the metrics by which you are judged. Should you secure a mandate this term, be advised that the criteria for success will evolve in the future, demanding a more nuanced approach to governance.\n\nYour first agenda awaits.";

  return (
    <ModalContent maxWidth="max-w-[600px]" slideEntry slideExit>
      <ModalHeader title="Welcome Prime Minister" subtitle="Introduction" />
  
      <div className="w-full mt-4">
        <InteractiveDPMEmail 
          title="Orientation"
          message={welcomeText}
          onAcknowledge={onAcknowledge}
          buttonText="Understood"
        />
      </div>
    </ModalContent>
  );
}