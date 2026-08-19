import React from 'react';
import { ElectionCycle, Policy } from '../utils/types';
import { DifficultySimulator } from '../utils/DifficultySimulator';
import { clearLog } from '../client/telemetry';

interface DevPanelProps {
  devMode: boolean;
  setDevMode: (active: boolean) => void;
  jumpToCycle: (cycle: ElectionCycle) => void;
  setCurrentTurn: React.Dispatch<React.SetStateAction<number>>;
  currentTurn: number;
  turnsPerCycle: number;
  showOptimalPath: boolean;
  setShowOptimalPath: (show: boolean) => void;
  optimalPath: Policy[];
  cycleMAO: number;
  difficultySeed: number;
}

export default function DevPanel({
  devMode,
  setDevMode,
  jumpToCycle,
  setCurrentTurn,
  currentTurn,
  turnsPerCycle,
  showOptimalPath,
  setShowOptimalPath,
  optimalPath,
  cycleMAO,
  difficultySeed,
}: DevPanelProps) {
  return (
    <>
      <button
        onClick={() => setDevMode(!devMode)}
        className="fixed bottom-4 left-4 z-[100] bg-zinc-800/80 backdrop-blur-sm text-zinc-400 text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full hover:bg-zinc-700 hover:text-white transition-colors border border-zinc-600 shadow-lg"
      >
        Dev Mode {devMode ? 'ON' : 'OFF'}
      </button>

      {devMode && (
        <div className="fixed bottom-14 left-4 z-[100] bg-zinc-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-zinc-700 w-64 text-sm flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4">
          <h3 className="font-bold text-pink-500 uppercase tracking-widest text-xs border-b border-zinc-800 pb-1.5">
            Developer Panel
          </h3>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest px-1">
              Jump to Cycle
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => jumpToCycle(ElectionCycle.Benthamite)}
                className="bg-zinc-800 hover:bg-zinc-700 px-2 py-1.5 rounded-lg text-xs font-bold transition-colors"
              >
                1. Benthamite
              </button>
              <button
                onClick={() => jumpToCycle(ElectionCycle.Rawlsian)}
                className="bg-zinc-800 hover:bg-zinc-700 px-2 py-1.5 rounded-lg text-xs font-bold transition-colors"
              >
                2. Rawlsian
              </button>
              <button
                onClick={() => jumpToCycle(ElectionCycle.SocietalUtility)}
                className="bg-zinc-800 hover:bg-zinc-700 px-2 py-1.5 rounded-lg text-xs font-bold transition-colors"
              >
                3. Societal
              </button>
              <button
                onClick={() => jumpToCycle(ElectionCycle.PersonalUtility)}
                className="bg-zinc-800 hover:bg-zinc-700 px-2 py-1.5 rounded-lg text-xs font-bold transition-colors"
              >
                4. Personal
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest px-1">
              Time Controls
            </span>
            <button
              onClick={() => setCurrentTurn(turnsPerCycle)}
              className="bg-zinc-800 hover:bg-zinc-700 px-2 py-1.5 rounded-lg text-xs font-bold transition-colors"
            >
              Jump to End
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest px-1">
              Cheat Codes
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              <button
                onClick={() => setShowOptimalPath(!showOptimalPath)}
                className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  showOptimalPath
                    ? 'bg-pink-600 text-white'
                    : 'bg-zinc-800 hover:bg-zinc-700'
                }`}
              >
                {showOptimalPath ? 'Hide Optimal Path' : 'Show Optimal Path'}
              </button>
              <button
                onClick={() => {
                  clearLog();
                  localStorage.clear();
                  window.location.href = '/';
                }}
                className="bg-red-900/50 hover:bg-red-800 text-red-200 px-2 py-1.5 rounded-lg text-xs font-bold transition-colors border border-red-900"
              >
                Wipe Save & Restart
              </button>
              <button
                onClick={() => {
                  DifficultySimulator.runDeterministicSimulation(10000, difficultySeed);
                }}
                className="bg-indigo-900/50 hover:bg-indigo-800 text-indigo-200 px-2 py-1.5 rounded-lg text-xs font-bold transition-colors border border-indigo-900"
              >
                Run Simulator (Check Console)
              </button>
            </div>
          </div>

          {/* OPTIMAL PATH DEV WIDGET */}
          {showOptimalPath && optimalPath.length > 0 && (
            <div className="fixed bottom-14 left-72 z-[100] bg-zinc-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-zinc-700 w-64 animate-in fade-in slide-in-from-left-4">
              <h3 className="font-bold text-pink-500 uppercase tracking-widest text-xs border-b border-zinc-800 pb-1.5 mb-2">
                Optimal Path
              </h3>
              <ol className="flex flex-col gap-2 text-sm">
                {optimalPath.map((policy, index) => {
                  const isPast = index + 1 < currentTurn;
                  const isCurrent = index + 1 === currentTurn;
                  return (
                    <li
                      key={index}
                      className={`flex items-start gap-2 transition-colors ${
                        isPast
                          ? 'opacity-30 line-through'
                          : isCurrent
                          ? 'text-emerald-400 font-bold'
                          : 'text-zinc-400'
                      }`}
                    >
                      <span className="font-mono text-xs mt-0.5">{index + 1}.</span>
                      <span className="leading-tight text-xs">{policy.policyName}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>
      )}
    </>
  );
}
