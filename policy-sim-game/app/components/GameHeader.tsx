import React from 'react';
import { ElectionCycle } from '../utils/types';
import { FRAMEWORK_RULES } from '../utils/frameworkRules';

interface GameHeaderProps {
  currentCycle: ElectionCycle;
  currentTurn: number;
  turnsPerCycle: number;
  isParliamentDissolved: boolean;
}

export default function GameHeader({
  currentCycle, currentTurn, turnsPerCycle, isParliamentDissolved
}: GameHeaderProps) {
  const turnsRemaining = Math.max(0, turnsPerCycle - currentTurn + 1);

  return (
    <header className="bg-white border-b border-zinc-200 px-8 py-5 flex justify-between items-center shrink-0 shadow-sm relative z-10">
      
      {/* Prime Minister Game & Framework */}
      <div className="flex items-baseline gap-4 z-20">
        <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Prime Minister Game</h1>
        <p className="text-base font-bold text-pink-600 uppercase tracking-widest">
          {FRAMEWORK_RULES[currentCycle]?.targetMetricName || "Loading..."}
        </p>
      </div>

      {/* Centered Dashboard Label */}
      <span className="absolute left-1/2 -translate-x-1/2 text-sm font-bold text-zinc-400 uppercase tracking-[0.25em] z-10">
        Dashboard
      </span>

      {/* Turn Counter */}
      <div className="flex items-center gap-4 z-20">
        <p className="text-lg font-bold text-zinc-500 uppercase tracking-widest">
          {isParliamentDissolved ? "Status:" : "Election in:"}
        </p>
        <p className={`text-lg font-mono font-black ${isParliamentDissolved ? 'text-rose-600' : 'text-zinc-900'}`}>
          {isParliamentDissolved 
            ? "POLLS OPEN" 
            : `${turnsRemaining} ${turnsRemaining === 1 ? 'turn' : 'turns'}`
          }
        </p>
      </div>
      
    </header>
  );
}