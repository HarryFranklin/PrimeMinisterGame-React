import React from 'react';
import { ElectionCycle } from '../utils/types';
import { FRAMEWORK_RULES } from '../utils/frameworkRules';

interface GameHeaderProps {
  currentCycle: ElectionCycle;
  isTutorialActive: boolean;
  setIsTutorialActive: (active: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  targetNextTab: string | null;
  tutorialVisitedTabs: string[];
  setTutorialVisitedTabs: React.Dispatch<React.SetStateAction<string[]>>;
  setTutorialStep: React.Dispatch<React.SetStateAction<number>>;
  currentTurn: number;
  turnsPerCycle: number;
  tabs: readonly string[];
}

export default function GameHeader({
  currentCycle, isTutorialActive, setIsTutorialActive, activeTab, setActiveTab,
  targetNextTab, tutorialVisitedTabs, setTutorialVisitedTabs, setTutorialStep,
  currentTurn, turnsPerCycle, tabs
}: GameHeaderProps) {
  
  const activeTabIndex = tabs.indexOf(activeTab);

  return (
    <header className={`bg-white border-b border-zinc-200 px-6 py-4 flex justify-between items-center shrink-0 shadow-sm transition-all duration-500 ${isTutorialActive ? 'relative z-[70]' : 'relative z-10'}`}>
      <div>
        <h1 className="text-xl font-bold">Policy Simulator - Test</h1>
        <p className="text-xs font-bold text-pink-600 uppercase">
          {FRAMEWORK_RULES[currentCycle]?.frameworkTitle || "Loading..."}
        </p>
      </div>
      
      {/* TAB BAR */}
      <nav className={`p-1 rounded-lg w-full max-w-3xl pointer-events-auto transition-all duration-500 ${isTutorialActive ? 'bg-zinc-200 ring-4 ring-pink-500/30 shadow-inner' : 'bg-zinc-100'}`}> 
        <div className="relative grid grid-cols-4 gap-1">
          <div 
            className="absolute top-0 bottom-0 left-0 bg-white rounded-md shadow-sm transition-all duration-300 ease-out"
            style={{
              width: `calc((100% - 12px) / 4)`, 
              transform: `translateX(calc(${activeTabIndex * 100}% + ${activeTabIndex * 4}px))`
            }}
          />
          {tabs.map((t) => {
            const isTarget = t === targetNextTab;
            const isLocked = isTutorialActive && t !== activeTab && !isTarget;

            return (
              <button 
                key={t} 
                disabled={isLocked}
                onClick={() => {
                  if (isTutorialActive) {
                    setTutorialVisitedTabs(prev => prev.includes(activeTab) ? prev : [...prev, activeTab]);
                    setTutorialStep(0); 
                  }
                  setActiveTab(t as any);
                }} 
                className={`relative z-10 w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold uppercase rounded-md transition-all duration-300 ${
                  activeTab === t 
                    ? 'text-pink-600' 
                    : isTarget
                      ? 'text-emerald-700 bg-emerald-100/50 ring-2 ring-emerald-400 animate-pulse shadow-sm'
                      : isLocked 
                        ? 'text-zinc-400 opacity-40 cursor-not-allowed' 
                        : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                {t}
                {isLocked && <span className="text-[9px] opacity-70">🔒</span>}
                {isTarget && <span className="text-[10px] animate-bounce">🔓</span>}
              </button>
            );
          })}
        </div>
      </nav>
      
      {/* Tutorial Toggle Button & Turn Counter */}
      <div className="flex items-center gap-6 text-right">
        <button 
          onClick={() => setIsTutorialActive(!isTutorialActive)}
          className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-colors border shadow-sm ${
            isTutorialActive 
              ? 'bg-pink-100 text-pink-700 border-pink-300' 
              : 'bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50'
          }`}
        >
          {isTutorialActive ? 'Tutorial: ON' : 'Tutorial: OFF'}
        </button>

        <div>
          <p className="text-xs font-bold text-zinc-400 uppercase">Election In</p>
          <p className="text-lg font-mono font-bold">{Math.max(0, turnsPerCycle - currentTurn + 1)} Turns</p>
        </div>
      </div>
    </header>
  );
}