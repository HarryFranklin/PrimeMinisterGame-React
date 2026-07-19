import React from 'react';
import { ElectionCycle } from '../../utils/types';
import { getPMProfile } from '../../utils/pmProfiles';
import { ModalContent, ModalHeader, InteractiveDPMEmail } from './SharedModalComponents';

interface WelcomeModalProps {
  currentCycle: ElectionCycle;
  onAcknowledge: () => void;
}

export default function WelcomeModal({ currentCycle, onAcknowledge }: WelcomeModalProps) {
  const profile = getPMProfile(currentCycle);
  const levelNumber = currentCycle + 1;

  const welcomeText = `Prime Minister, congratulations on your election. The country is looking to you for leadership.\n\nThe public mandate is evolving; as societal priorities shift, so do the metrics by which you are judged. Should you secure a mandate this term, be advised that the criteria for success will evolve in the future, demanding a more nuanced approach to governance.\n\nYour first agenda awaits.`;

  return (
    <ModalContent maxWidth="max-w-[500px]" slideEntry slideExit>
      <ModalHeader title="Welcome, Prime Minister" />

      {/* PM identity */}
      <div className="flex items-center justify-center gap-3 -mt-1">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-4xl shrink-0 shadow-inner"
          style={{ backgroundColor: `${profile.color}22` }}
        >
          {profile.emoji}
        </div>
        <div className="text-left">
          <span className="text-[12px] font-black uppercase tracking-widest text-zinc-400 block leading-tight">
            Level {levelNumber}
          </span>
          <h3 className="font-black text-base text-zinc-900 leading-tight">{profile.name}</h3>
        </div>
      </div>

      <InteractiveDPMEmail 
        title="Introduction"
        kicker=""
        message={welcomeText}
        onAcknowledge={onAcknowledge}
        buttonText="Understood"
      />
    </ModalContent>
  );
}