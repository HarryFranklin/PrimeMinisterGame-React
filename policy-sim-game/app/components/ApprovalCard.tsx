import React from 'react';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';
import { useGame } from '../context/GameStateContext';

interface ApprovalCardProps {
  approvalRating: number;
  isParliamentDissolved: boolean;
  accentColor: string;
}

export default function ApprovalCard({ approvalRating, isParliamentDissolved, accentColor }: ApprovalCardProps) {
  const displayApproval = useAnimatedNumber(approvalRating);
  const { currentTurn } = useGame();
  const turnsRemaining = 5 - currentTurn;

  return (
    <div className="bg-zinc-900 rounded-xl shadow-lg p-5 flex flex-col items-center justify-center shrink-0 h-36 lg:h-40 relative overflow-hidden transition-all">
      <div className="absolute top-0 left-0 w-full h-1.5" style={{ backgroundColor: accentColor }} />
      
      {/* Updated Election Counter */}
      {!isParliamentDissolved && (
        <div className="absolute top-3 w-full text-center">
          <span className="text-[12px] font-black uppercase tracking-widest text-zinc-500">
            Election In: <span className="text-zinc-300">{turnsRemaining} {turnsRemaining === 1 ? 'Turn' : 'Turns'}</span>
          </span>
        </div>
      )}

      <div className="mt-4 flex flex-col items-center">
        <p className="text-xs lg:text-sm font-bold uppercase tracking-widest text-zinc-400 mb-1">Public Approval</p>

        {isParliamentDissolved ? (
          <p className="text-3xl lg:text-4xl font-black tracking-widest text-zinc-500">UNCLEAR</p>
        ) : (
          <p
            className={`text-4xl lg:text-5xl font-black tracking-tighter transition-colors duration-500 ${
              approvalRating >= 51 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {displayApproval.toFixed(1) === '100.0' ? '100' : displayApproval.toFixed(1)}%
          </p>
        )}
      </div>
    </div>
  );
}