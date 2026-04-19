import React, { useState, useMemo } from 'react';
import { ElectionCycle, Respondent, AxisVariable } from '../utils/types';
import { WelfareMetrics } from '../utils/WelfareMetrics';
import D3Chart from './D3Chart';

interface NarrativeModalProps {
  completedCycle: ElectionCycle;
  population: Respondent[];
  onProceed: () => void;
}

export default function NarrativeModal({ completedCycle, population, onProceed }: NarrativeModalProps) {
  const [revealed, setRevealed] = useState(false);

  // Generate the Histogram Data for the embedded chart
  const histogramData = useMemo(() => {
    if (!population || population.length === 0) return [];
    return Array.from({ length: 11 }, (_, i) => {
      const peopleInBar = population.filter(r => Math.round(r.currentLS) === i);
      const total = peopleInBar.length;
      const getPct = (count: number) => (total > 0 ? (count / total) * 100 : 0);
      
      return {
        name: i,
        count: total,
        breakdown: {
          wealth: {
            Poor: getPct(peopleInBar.filter(p => p.demographics.wealth === 'Poor').length),
            Middle: getPct(peopleInBar.filter(p => p.demographics.wealth === 'Middle').length),
            Wealthy: getPct(peopleInBar.filter(p => p.demographics.wealth === 'Wealthy').length),
          },
          age: {
            Youth: getPct(peopleInBar.filter(p => p.demographics.age === 'Youth').length),
            Adult: getPct(peopleInBar.filter(p => p.demographics.age === 'Adult').length),
            Elderly: getPct(peopleInBar.filter(p => p.demographics.age === 'Elderly').length),
          },
        }
      };
    });
  }, [population]);

  // Find two citizens with similar Life Satisfaction but vastly different Utility for Cycle 2
  const contrastingCitizens = useMemo(() => {
    for (let i = 0; i < population.length; i++) {
      for (let j = i + 1; j < population.length; j++) {
        if (Math.abs(population[i].currentLS - population[j].currentLS) < 0.2) {
          const u1 = WelfareMetrics.getUtilityForPerson(population[i].currentLS, population[i].personalUtilities);
          const u2 = WelfareMetrics.getUtilityForPerson(population[j].currentLS, population[j].personalUtilities);
          if (Math.abs(u1 - u2) > 4.0) {
            return [population[i], population[j]];
          }
        }
      }
    }
    return [population[0], population[1]]; 
  }, [population]);

  // Calculate the societal floor to highlight it dynamically in Cycle 2
  const currentFloor = useMemo(() => {
    if (population.length === 0) return 0;
    return Math.floor(Math.min(...population.map(p => p.currentLS)));
  }, [population]);

  // Dynamically calculate what the bottom 20% looks like for Cycle 1 & 3
  const leftBehindThreshold = useMemo(() => {
    if (population.length === 0) return 3;
    const sorted = [...population].map(p => p.currentLS).sort((a, b) => a - b);
    const p20Index = Math.floor(sorted.length * 0.20);
    return Math.ceil(sorted[p20Index]);
  }, [population]);

  const leftBehindBars = Array.from({ length: leftBehindThreshold + 1 }, (_, i) => i);

  // NEW: Find a citizen doing well personally, but with low societal utility due to empathy (For Cycle 3)
  const empathyCitizen = useMemo(() => {
    if (population.length === 0) return null;
    const allLS = population.map(p => p.currentLS);
    
    let bestCitizen = population[0];
    let maxDiff = -1;

    for (const r of population) {
      if (r.currentLS >= 7) { // Must be someone personally thriving
        const pu = WelfareMetrics.getUtilityForPerson(r.currentLS, r.personalUtilities);
        const su = WelfareMetrics.evaluateDistribution(allLS, r.societalUtilities);
        const diff = pu - su; // Find the biggest gap between their selfishness and their empathy
        if (diff > maxDiff) {
          maxDiff = diff;
          bestCitizen = r;
        }
      }
    }
    return bestCitizen;
  }, [population]);

  const renderContent = () => {
    switch (completedCycle) {
      
      // TRANSITION 1: End of Benthamite -> Moving to Rawlsian
      case ElectionCycle.Benthamite:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="flex flex-col justify-center">
              <h2 className="text-3xl font-black tracking-tight text-zinc-900 mb-4">The Limit of Averages</h2>
              <p className="text-zinc-600 mb-6 leading-relaxed">
                Okay, that doesn't work perfectly. You successfully raised the average Life Satisfaction, but focusing solely on the "greatest good for the greatest number" allowed severe inequality to fester, leaving minority demographics behind in the lower brackets.
              </p>
              <p className="text-zinc-600 mb-8 leading-relaxed">
                Let's restart the simulation from scratch. This time, we will use a <strong>Rawlsian</strong> approach: you must protect the most vulnerable by raising the societal "floor".
              </p>
              <button onClick={onProceed} className="w-full py-4 bg-zinc-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-lg">
                Restart Simulation: Cycle 2 (Rawlsian)
              </button>
            </div>
            <div className="bg-zinc-50 rounded-xl p-6 border border-zinc-200 flex flex-col">
              <div className="mb-4">
                <h3 className="text-xs font-bold text-rose-500 uppercase tracking-widest">
                  The "Left Behind" (LS 0-{leftBehindThreshold})
                </h3>
                <p className="text-xs text-zinc-400 font-medium">Despite a high average, the bottom 20% still fall behind.</p>
              </div>
              <div className="flex-1 min-h-[250px]">
                 <D3Chart 
                    plotType="1D" 
                    chartData={[]} 
                    histogramData={histogramData} 
                    xAxisType={AxisVariable.LifeSatisfaction} 
                    yAxisType={AxisVariable.LifeSatisfaction} 
                    color="#d4d4d8" 
                    highlightBars={leftBehindBars} 
                 />
              </div>
            </div>
          </div>
        );

      // TRANSITION 2: End of Rawlsian -> Moving to Personal Utility
      case ElectionCycle.Rawlsian:
        return (
          <div className="flex flex-col">
            <div className="mb-8 text-center max-w-2xl mx-auto">
              <h2 className="text-3xl font-black tracking-tight text-zinc-900 mb-4">The Illusion of Life Satisfaction</h2>
              <p className="text-zinc-600 leading-relaxed">
                Clearly this doesn’t work either. You successfully raised the floor, but something is missing. Click on these two citizens below. They have the exact same Life Satisfaction score... why is one so much happier than the other?
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* Context Graph */}
              <div className="bg-zinc-50 rounded-xl p-6 border border-zinc-200 flex flex-col lg:col-span-1">
                <div className="mb-2">
                  <h3 className="text-xs font-bold text-rose-500 uppercase tracking-widest">The Societal Floor</h3>
                  <p className="text-xs text-zinc-400 font-medium">You raised the bottom to LS {currentFloor}.</p>
                </div>
                <div className="flex-1 min-h-[200px]">
                   <D3Chart 
                      plotType="1D" 
                      chartData={[]} 
                      histogramData={histogramData} 
                      xAxisType={AxisVariable.LifeSatisfaction} 
                      yAxisType={AxisVariable.LifeSatisfaction} 
                      color="#d4d4d8" 
                      highlightBars={[currentFloor]} 
                   />
                </div>
              </div>

              {/* Citizen Cards */}
              <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                {contrastingCitizens.map((citizen, idx) => {
                  const utility = WelfareMetrics.getUtilityForPerson(citizen.currentLS, citizen.personalUtilities);
                  return (
                    <div 
                      key={idx} 
                      onClick={() => setRevealed(true)}
                      className="p-6 rounded-xl border-2 border-zinc-200 bg-zinc-50 cursor-pointer hover:border-pink-400 hover:bg-pink-50 transition-all text-center relative overflow-hidden group flex flex-col justify-center h-full"
                    >
                      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Citizen #{String(citizen.id).substring(0,4)}</p>
                      <div className="mb-2">
                        <span className="text-sm text-zinc-400">Life Satisfaction: </span>
                        <strong className="text-3xl text-zinc-800 block mt-1">{citizen.currentLS.toFixed(1)} / 10.0</strong>
                      </div>
                      
                      <div className={`transition-all duration-500 ${revealed ? 'opacity-100 transform-none' : 'opacity-0 translate-y-4'}`}>
                        <div className="w-full h-px bg-zinc-200 my-4" />
                        <span className="text-sm text-pink-500 font-bold uppercase tracking-widest block mb-1">Utility (Happiness)</span>
                        <strong className="text-4xl text-pink-600">{utility.toFixed(2)}</strong>
                      </div>

                      {!revealed && (
                        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="bg-white px-4 py-2 rounded-full text-sm font-bold shadow-sm text-pink-600">Click to Reveal</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="max-w-2xl mx-auto text-center">
              <p className={`text-zinc-600 mb-6 leading-relaxed transition-opacity duration-500 ${revealed ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                Simple Life Satisfaction fails to capture subjective human reality. Moving forward, we must govern based on <strong>Utility</strong>.
              </p>
              <button 
                onClick={onProceed} 
                disabled={!revealed}
                className="w-full py-4 bg-zinc-900 text-white font-bold rounded-xl hover:bg-black disabled:bg-zinc-300 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                Restart Simulation: Cycle 3 (Personal Utility) 
              </button>
            </div>
          </div>
        );

      // TRANSITION 3: End of Personal Utility -> Moving to Societal Utility
      case ElectionCycle.PersonalUtility: {
        if (!empathyCitizen) return null;
        const allLS = population.map(p => p.currentLS);
        const pu = WelfareMetrics.getUtilityForPerson(empathyCitizen.currentLS, empathyCitizen.personalUtilities);
        const su = WelfareMetrics.evaluateDistribution(allLS, empathyCitizen.societalUtilities);

        return (
          <div className="flex flex-col">
            <div className="mb-8 text-center max-w-2xl mx-auto">
              <h2 className="text-3xl font-black tracking-tight text-zinc-900 mb-4">Self-Interest vs. Empathy</h2>
              <p className="text-zinc-600 leading-relaxed">
                Personal Utility helped us maximise individual happiness, but humans are not purely selfish. We have empathy. Click on the citizen below to see how they feel about the society you built.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              
              {/* Context Graph (The Fairness Gap) */}
              <div className="bg-zinc-50 rounded-xl p-6 border border-zinc-200 flex flex-col lg:col-span-1">
                <div className="mb-2">
                  <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-widest">The Fairness Gap</h3>
                  <p className="text-xs text-zinc-400 font-medium">Structural inequality remained.</p>
                </div>
                <div className="flex-1 min-h-[200px]">
                   <D3Chart 
                      plotType="1D" 
                      chartData={[]} 
                      histogramData={histogramData} 
                      xAxisType={AxisVariable.LifeSatisfaction} 
                      yAxisType={AxisVariable.LifeSatisfaction} 
                      color="#d4d4d8" 
                      highlightBars={leftBehindBars} 
                   />
                </div>
              </div>

              {/* Empathy Citizen Card */}
              <div className="lg:col-span-2">
                <div 
                  onClick={() => setRevealed(true)}
                  className="p-8 rounded-xl border-2 border-zinc-200 bg-zinc-50 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all text-center relative overflow-hidden group flex flex-col justify-center h-full"
                >
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Citizen #{String(empathyCitizen.id).substring(0,4)}</p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-sm text-zinc-400 block mb-1">Life Satisfaction</span>
                      <strong className="text-3xl text-zinc-800">{empathyCitizen.currentLS.toFixed(1)} / 10.0</strong>
                    </div>
                    <div>
                      <span className="text-sm text-zinc-400 block mb-1">Personal Utility</span>
                      <strong className="text-3xl text-zinc-800">{pu.toFixed(2)}</strong>
                    </div>
                  </div>
                  
                  <div className={`transition-all duration-500 ${revealed ? 'opacity-100 transform-none' : 'opacity-0 translate-y-4'}`}>
                    <div className="w-full h-px bg-zinc-200 my-6" />
                    <span className="text-sm text-emerald-500 font-bold uppercase tracking-widest block mb-2">Societal Utility (Empathy for others)</span>
                    <strong className="text-5xl text-emerald-600">{su.toFixed(2)}</strong>
                    <p className="text-sm text-zinc-500 mt-4 max-w-md mx-auto italic">
                      "Even though I'm doing great personally, my overall wellbeing is dragged down by the severe inequality I see around me."
                    </p>
                  </div>

                  {!revealed && (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="bg-white px-5 py-3 rounded-full text-sm font-bold shadow-sm text-emerald-600">Reveal Societal Utility</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="max-w-2xl mx-auto text-center">
              <p className={`text-zinc-600 mb-6 leading-relaxed transition-opacity duration-500 ${revealed ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                For your final term, let's restart and focus on <strong>Societal Utility</strong>, balancing personal gains with the population's broader desire for fairness and equality.
              </p>
              <button 
                onClick={onProceed} 
                disabled={!revealed}
                className="w-full py-4 bg-zinc-900 text-white font-bold rounded-xl hover:bg-black disabled:bg-zinc-300 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                Restart Simulation: Final Cycle (Societal Utility)
              </button>
            </div>
          </div>
        );
      }

      default:
        return null; 
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/80 backdrop-blur-md transition-all animate-in fade-in p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full p-10 border border-zinc-200 animate-in zoom-in duration-300">
        {renderContent()}
      </div>
    </div>
  );
}