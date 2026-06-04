import React from 'react';
import { ElectionCycle } from '../utils/types';
import { FRAMEWORK_RULES } from '../utils/frameworkRules';

interface GameHeaderProps {
  currentCycle: ElectionCycle;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  currentTurn: number;
  turnsPerCycle: number;
  tabs: readonly string[];
}

export default function GameHeader({
  currentCycle, activeTab, setActiveTab, currentTurn, turnsPerCycle, tabs
}: GameHeaderProps) {
  const activeTabIndex = tabs.indexOf(activeTab);

  return (
    <header className="bg-white border-b border-zinc-200 px-6 py-4 flex justify-between items-center shrink-0 shadow-sm relative z-10">
      <div>
        <h1 className="text-xl font-bold">Policy Simulator - Test</h1>
        <p className="text-xs font-bold text-pink-600 uppercase">
          {FRAMEWORK_RULES[currentCycle]?.frameworkTitle || "Loading..."}
        </p>
      </div>
      
      {/* TAB BAR */}
      <nav className="p-1 rounded-lg w-full max-w-3xl pointer-events-auto bg-zinc-100 transition-all duration-500">
        <div className="relative grid grid-cols-3 gap-1">
          <div 
            className="absolute top-0 bottom-0 left-0 bg-white rounded-md shadow-sm transition-all duration-300 ease-out"
            style={{
              width: `calc((100% - 8px) / 3)`, 
              transform: `translateX(calc(${activeTabIndex * 100}% + ${activeTabIndex * 4}px))`
            }}
          />
          {tabs.map((t) => (
            <button 
              key={t} 
              onClick={() => setActiveTab(t as any)} 
              className={`relative z-10 w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold uppercase rounded-md transition-all duration-300 ${
                activeTab === t 
                  ? 'text-pink-600' 
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </nav>
      
      {/* Turn Counter */}
      <div className="text-right">
        <p className="text-xs font-bold text-zinc-400 uppercase">Election In</p>
        <p className="text-lg font-mono font-bold">{Math.max(0, turnsPerCycle - currentTurn + 1)} Turns</p>
      </div>
    </header>
  );
}