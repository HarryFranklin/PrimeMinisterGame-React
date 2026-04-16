import React, { useState, useMemo } from 'react';
import { ElectionCycle, Respondent } from '../utils/types';
import { WelfareMetrics } from '../utils/WelfareMetrics';

interface NarrativeModalProps {
  completedCycle: ElectionCycle;
  population: Respondent[];
  onProceed: () => void;
}

export default function NarrativeModal({ completedCycle, population, onProceed }: NarrativeModalProps) {
  const [revealed, setRevealed] = useState(false);

  // Find two citizens with similar Life Satisfaction but vastly different Utility for the Cycle 2 transition
  const contrastingCitizens = useMemo(() => {
    for (let i = 0; i < population.length; i++) {
      for (let j = i + 1; j < population.length; j++) {
        // Find two people with almost identical LS...
        if (Math.abs(population[i].currentLS - population[j].currentLS) < 0.2) {
          const u1 = WelfareMetrics.getUtilityForPerson(population[i].currentLS, population[i].personalUtilities);
          const u2 = WelfareMetrics.getUtilityForPerson(population[j].currentLS, population[j].personalUtilities);
          // ...but vastly different actual utility (happiness)
          if (Math.abs(u1 - u2) > 0.4) {
            return [population[i], population[j]];
          }
        }
      }
    }
    return [population[0], population[1]]; // Fallback safety
  }, [population]);

  const renderContent = () => {
    switch (completedCycle) {
      case ElectionCycle.Benthamite:
        return (
          <>
            <h2 className="text-3xl font-black tracking-tight text-zinc-900 mb-4">The Limit of Averages</h2>
            <p className="text-zinc-600 mb-6 leading-relaxed">
              Okay, that doesn't work perfectly. You successfully raised the average Life Satisfaction, but focusing solely on the "greatest good for the greatest number" allowed severe inequality to fester, leaving minority demographics behind.
            </p>
            <p className="text-zinc-600 mb-8 leading-relaxed">
              Let's restart the simulation from scratch. This time, we will use a <strong>Rawlsian</strong> approach: you must protect the most vulnerable by raising the societal "floor".
            </p>
            <button onClick={onProceed} className="w-full py-4 bg-zinc-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-lg">
              Restart Simulation: Cycle 2
            </button>
          </>
        );

      case ElectionCycle.Rawlsian:
        return (
          <>
            <h2 className="text-3xl font-black tracking-tight text-zinc-900 mb-4">The Illusion of Life Satisfaction</h2>
            <p className="text-zinc-600 mb-6 leading-relaxed">
              Clearly this doesn’t work either. You successfully raised the floor, but something is missing. Click on these two citizens below. They have the exact same Life Satisfaction score... why is one so much happier than the other?
            </p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              {contrastingCitizens.map((citizen, idx) => {
                const utility = WelfareMetrics.getUtilityForPerson(citizen.currentLS, citizen.personalUtilities);
                return (
                  <div 
                    key={idx} 
                    onClick={() => setRevealed(true)}
                    className="p-4 rounded-xl border-2 border-zinc-200 bg-zinc-50 cursor-pointer hover:border-pink-400 hover:bg-pink-50 transition-all text-center relative overflow-hidden group"
                  >
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Citizen #{citizen.id}</p>
                    <div className="mb-2">
                      <span className="text-sm text-zinc-400">Life Satisfaction: </span>
                      <strong className="text-2xl text-zinc-800">{citizen.currentLS.toFixed(1)}</strong>
                    </div>
                    
                    <div className={`transition-all duration-500 ${revealed ? 'opacity-100 transform-none' : 'opacity-0 translate-y-4'}`}>
                      <div className="w-full h-px bg-zinc-200 my-3" />
                      <span className="text-sm text-pink-500 font-bold uppercase tracking-widest block mb-1">True Utility</span>
                      <strong className="text-3xl text-pink-600">{utility.toFixed(2)}</strong>
                    </div>

                    {!revealed && (
                      <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="bg-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">Click to Reveal</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <p className={`text-zinc-600 mb-8 leading-relaxed transition-opacity duration-500 ${revealed ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              Simple Life Satisfaction fails to capture subjective human reality. Moving forward, we must govern based on <strong>Utility</strong>.
            </p>

            <button 
              onClick={onProceed} 
              disabled={!revealed}
              className="w-full py-4 bg-zinc-900 text-white font-bold rounded-xl hover:bg-black disabled:bg-zinc-300 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              Restart Simulation: Cycle 3
            </button>
          </>
        );

      case ElectionCycle.SocietalUtility:
        return (
          <>
            <h2 className="text-3xl font-black tracking-tight text-zinc-900 mb-4">Fairness vs. Self-Interest</h2>
            <p className="text-zinc-600 mb-6 leading-relaxed">
              Societal Utility helped us build a fairer society, but humans are inherently self-interested. A mathematically "fair" society might still leave individuals feeling unfulfilled if they don't see personal gains.
            </p>
            <p className="text-zinc-600 mb-8 leading-relaxed">
              For your final term, let's restart and focus entirely on maximizing <strong>Personal Utility</strong>.
            </p>
            <button onClick={onProceed} className="w-full py-4 bg-zinc-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-lg">
              Restart Simulation: Final Cycle
            </button>
          </>
        );

      default:
        return null; // Won't be reached for PersonalUtility as it's the end of the game
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/80 backdrop-blur-md transition-all animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-10 border border-zinc-200 animate-in zoom-in duration-300">
        {renderContent()}
      </div>
    </div>
  );
}