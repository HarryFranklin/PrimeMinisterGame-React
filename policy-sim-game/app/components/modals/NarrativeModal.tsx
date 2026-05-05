import React, { useState, useMemo } from 'react';
import { ElectionCycle, Respondent, AxisVariable } from '../../utils/types';
import { WelfareMetrics } from '../../utils/WelfareMetrics';
import D3Chart from '../D3Chart';

interface NarrativeModalProps {
  completedCycle: ElectionCycle;
  population: Respondent[];
  onProceed: () => void;
}

const getDummyHistogram = (distribution: Record<number, number>) => {
  return Array.from({ length: 11 }, (_, i) => ({
    name: i,
    count: distribution[i] || 0,
    breakdown: { wealth: {}, age: {} }
  }));
};

export default function NarrativeModal({ completedCycle, population, onProceed }: NarrativeModalProps) {
  const [benthamSelection, setBenthamSelection] = useState<'none' | 'A' | 'B'>('none');
  const [revealedCitizen1, setRevealedCitizen1] = useState(false);
  const [revealedCitizen2, setRevealedCitizen2] = useState(false);
  const [rawlsExplanation, setRawlsExplanation] = useState(false);
  const [revealedEmpathy, setRevealedEmpathy] = useState(false);
  const [personalExplanation, setPersonalExplanation] = useState(false);

  const benthamGraphA = useMemo(() => getDummyHistogram({ 5: 100 }), []);
  const benthamGraphB = useMemo(() => getDummyHistogram({ 0: 50, 10: 50 }), []);

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

  const contrastingCitizens = useMemo(() => {
    for (let i = 0; i < population.length; i++) {
      for (let j = i + 1; j < population.length; j++) {
        if (Math.abs(population[i].currentLS - population[j].currentLS) < 0.2) {
          const u1 = WelfareMetrics.getUtilityForPerson(population[i].currentLS, population[i].personalUtilities);
          const u2 = WelfareMetrics.getUtilityForPerson(population[j].currentLS, population[j].personalUtilities);
          if (Math.abs(u1 - u2) > 0.4) {
            return [population[i], population[j]];
          }
        }
      }
    }
    return [population[0], population[1]]; 
  }, [population]);

  const currentFloor = useMemo(() => {
    if (population.length === 0) return 0;
    return Math.floor(Math.min(...population.map(p => p.currentLS)));
  }, [population]);

  const leftBehindThreshold = useMemo(() => {
    if (population.length === 0) return 3;
    const sorted = [...population].map(p => p.currentLS).sort((a, b) => a - b);
    const p20Index = Math.floor(sorted.length * 0.20);
    return Math.ceil(sorted[p20Index]);
  }, [population]);

  const leftBehindBars = Array.from({ length: leftBehindThreshold + 1 }, (_, i) => i);

  const empathyCitizen = useMemo(() => {
    if (population.length === 0) return null;
    const allLS = population.map(p => p.currentLS);
    
    let bestCitizen = population[0];
    let maxDiff = -1;

    for (const r of population) {
      if (r.currentLS >= 7) { 
        const pu = WelfareMetrics.getUtilityForPerson(r.currentLS, r.personalUtilities);
        const su = WelfareMetrics.evaluateDistribution(allLS, r.societalUtilities);
        const diff = pu - su; 
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
      case ElectionCycle.Benthamite:
        return (
          <div className="flex flex-col gap-6">
            <div className="text-center max-w-2xl mx-auto mb-2">
              <h2 className="text-3xl font-black tracking-tight text-zinc-900 mb-2">The Danger of Averages</h2>
              <p className="text-zinc-600 leading-relaxed text-sm">
                Before we examine the society you built, consider this test. Click on the graph that represents a society with an average Life Satisfaction of exactly 5.0.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-2">
              <div 
                onClick={() => setBenthamSelection('A')} 
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer bg-zinc-50 hover:bg-zinc-100 ${benthamSelection === 'A' ? 'border-pink-500 shadow-md ring-2 ring-pink-500/20' : 'border-zinc-200'}`}
              >
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-center mb-2">Society A</h3>
                <div className="h-[200px] pointer-events-none">
                  <D3Chart plotType="1D" chartData={[]} histogramData={benthamGraphA} xAxisType={AxisVariable.LifeSatisfaction} yAxisType={AxisVariable.LifeSatisfaction} color="#d4d4d8" />
                </div>
              </div>
              <div 
                onClick={() => setBenthamSelection('B')} 
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer bg-zinc-50 hover:bg-zinc-100 ${benthamSelection === 'B' ? 'border-pink-500 shadow-md ring-2 ring-pink-500/20' : 'border-zinc-200'}`}
              >
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-center mb-2">Society B</h3>
                <div className="h-[200px] pointer-events-none">
                  <D3Chart plotType="1D" chartData={[]} histogramData={benthamGraphB} xAxisType={AxisVariable.LifeSatisfaction} yAxisType={AxisVariable.LifeSatisfaction} color="#d4d4d8" />
                </div>
              </div>
            </div>

            {benthamSelection !== 'none' && (
              <div className="bg-pink-50 border border-pink-200 rounded-xl p-6 max-w-3xl mx-auto text-center animate-in fade-in slide-in-from-bottom-4">
                <p className="text-pink-800 font-bold mb-3">Trick question.</p>
                <p className="text-pink-900/80 text-sm leading-relaxed mb-6">
                  Both societies have an exact average of 5.0. Society A is perfectly equal, while Society B is entirely polarised. Relying purely on averages masks structural inequality. 
                </p>
                <p className="text-zinc-700 text-sm leading-relaxed mb-6">
                  Let's restart the simulation. This time, we will use a <strong>Rawlsian</strong> approach: you must govern by protecting the most vulnerable and raising the societal "floor".
                </p>
                <button onClick={onProceed} className="w-full py-4 bg-zinc-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-lg">
                  Restart Simulation: Cycle 2 (Rawlsian)
                </button>
              </div>
            )}
          </div>
        );

      case ElectionCycle.Rawlsian:
        const bothRawlsRevealed = revealedCitizen1 && revealedCitizen2;
        return (
          <div className="flex flex-col">
            <div className="mb-6 text-center max-w-2xl mx-auto">
              <h2 className="text-3xl font-black tracking-tight text-zinc-900 mb-2">The Illusion of Life Satisfaction</h2>
              <p className="text-zinc-600 leading-relaxed text-sm">
                You successfully raised the floor, but something is missing. If raw metrics are misleading, we need to understand why. Click on these two citizens to reveal their true happiness.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {contrastingCitizens.map((citizen, idx) => {
                const utility = WelfareMetrics.getUtilityForPerson(citizen.currentLS, citizen.personalUtilities);
                const isRevealed = idx === 0 ? revealedCitizen1 : revealedCitizen2;
                const setReveal = idx === 0 ? setRevealedCitizen1 : setRevealedCitizen2;

                return (
                  <div 
                    key={idx} 
                    onClick={() => setReveal(true)}
                    className={`p-6 rounded-xl border-2 transition-all text-center relative overflow-hidden group flex flex-col justify-center h-full min-h-[220px] ${
                      isRevealed ? 'border-pink-300 bg-pink-50' : 'border-zinc-200 bg-zinc-50 cursor-pointer hover:border-pink-300 hover:bg-pink-50/50'
                    }`}
                  >
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Citizen #{String(citizen.id).substring(0,4)}</p>
                    <div className="mb-2">
                      <span className="text-sm text-zinc-400">Life Satisfaction: </span>
                      <strong className="text-3xl text-zinc-800 block mt-1">{citizen.currentLS.toFixed(1)} / 10.0</strong>
                    </div>
                    
                    <div className={`transition-all duration-500 ${isRevealed ? 'opacity-100 transform-none' : 'opacity-0 translate-y-4 hidden'}`}>
                      <div className="w-full h-px bg-zinc-200 my-4" />
                      <span className="text-sm text-pink-500 font-bold uppercase tracking-widest block mb-1">Utility (Happiness)</span>
                      <strong className="text-4xl text-pink-600">{utility.toFixed(2)}</strong>
                    </div>

                    {!isRevealed && (
                      <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="bg-white px-4 py-2 rounded-full text-sm font-bold shadow-sm text-pink-600">Click to Reveal</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {bothRawlsRevealed && !rawlsExplanation && (
              <div className="bg-zinc-100 border border-zinc-200 rounded-xl p-6 max-w-2xl mx-auto text-center animate-in fade-in slide-in-from-bottom-4">
                <p className="text-zinc-800 font-bold mb-4 text-lg">What do you notice?</p>
                <button 
                  onClick={() => setRawlsExplanation(true)} 
                  className="px-8 py-3 bg-zinc-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-md"
                >
                  Continue
                </button>
              </div>
            )}

            {rawlsExplanation && (
              <div className="max-w-2xl mx-auto text-center animate-in fade-in slide-in-from-bottom-4">
                <p className="text-zinc-600 text-sm mb-6 leading-relaxed">
                  Despite having identical Life Satisfaction scores, their true Utility is completely different. Simple metrics fail to capture subjective human reality. Moving forward, we must govern based on <strong>Utility</strong>.
                </p>
                <button 
                  onClick={onProceed} 
                  className="w-full py-4 bg-zinc-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-lg"
                >
                  Restart Simulation: Cycle 3 (Personal Utility) 
                </button>
              </div>
            )}
          </div>
        );

      case ElectionCycle.PersonalUtility: {
        if (!empathyCitizen) return null;
        const allLS = population.map(p => p.currentLS);
        const pu = WelfareMetrics.getUtilityForPerson(empathyCitizen.currentLS, empathyCitizen.personalUtilities);
        const su = WelfareMetrics.evaluateDistribution(allLS, empathyCitizen.societalUtilities);

        return (
          <div className="flex flex-col">
            <div className="mb-6 text-center max-w-2xl mx-auto">
              <h2 className="text-3xl font-black tracking-tight text-zinc-900 mb-2">Self-Interest vs. Empathy</h2>
              <p className="text-zinc-600 leading-relaxed text-sm">
                Personal Utility assumes humans act purely selfishly. But humans have empathy. Click on the citizen below to reveal how they truly feel about the society you built.
              </p>
            </div>

            <div className="max-w-xl mx-auto w-full mb-6">
              <div 
                onClick={() => setRevealedEmpathy(true)}
                className={`p-6 rounded-xl border-2 transition-all text-center relative overflow-hidden group flex flex-col justify-center min-h-[220px] ${
                  revealedEmpathy ? 'border-emerald-300 bg-emerald-50' : 'border-zinc-200 bg-zinc-50 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/50'
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Citizen #{String(empathyCitizen.id).substring(0,4)}</p>
                
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div>
                    <span className="text-sm text-zinc-400 block mb-1">Life Satisfaction</span>
                    <strong className="text-3xl text-zinc-800">{empathyCitizen.currentLS.toFixed(1)} / 10.0</strong>
                  </div>
                  <div>
                    <span className="text-sm text-zinc-400 block mb-1">Personal Utility</span>
                    <strong className="text-3xl text-zinc-800">{pu.toFixed(2)}</strong>
                  </div>
                </div>
                
                <div className={`transition-all duration-500 ${revealedEmpathy ? 'opacity-100 transform-none' : 'opacity-0 translate-y-4 hidden'}`}>
                  <div className="w-full h-px bg-zinc-200 my-4" />
                  <span className="text-sm text-emerald-500 font-bold uppercase tracking-widest block mb-2">Societal Utility (Empathy for others)</span>
                  <strong className="text-4xl text-emerald-600">{su.toFixed(2)}</strong>
                  <p className="text-xs text-zinc-500 mt-3 max-w-md mx-auto italic">
                    "Even though I'm doing great personally, my overall wellbeing is dragged down by the severe inequality I see around me."
                  </p>
                </div>

                {!revealedEmpathy && (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="bg-white px-5 py-3 rounded-full text-sm font-bold shadow-sm text-emerald-600">Reveal Societal Utility</span>
                  </div>
                )}
              </div>
            </div>

            {revealedEmpathy && !personalExplanation && (
              <div className="bg-zinc-100 border border-zinc-200 rounded-xl p-6 max-w-2xl mx-auto text-center animate-in fade-in slide-in-from-bottom-4">
                <p className="text-zinc-800 font-bold mb-4 text-lg">What do you notice?</p>
                <button 
                  onClick={() => setPersonalExplanation(true)} 
                  className="px-8 py-3 bg-zinc-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-md"
                >
                  Continue
                </button>
              </div>
            )}

            {personalExplanation && (
              <div className="max-w-2xl mx-auto text-center animate-in fade-in slide-in-from-bottom-4">
                <p className="text-zinc-600 text-sm mb-6 leading-relaxed">
                  Look at the societal floor. While Personal Utility maximised their own score, relying purely on individual rational choice allows inequality to persist. For your final term, let's focus on <strong>Societal Utility</strong> to balance personal gains with a broader desire for fairness.
                </p>
                <button 
                  onClick={onProceed} 
                  className="w-full py-4 bg-zinc-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-lg"
                >
                  Restart Simulation: Final Cycle (Societal Utility)
                </button>
              </div>
            )}
          </div>
        );
      }

      case ElectionCycle.SocietalUtility:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="flex flex-col justify-center">
              <h2 className="text-3xl font-black tracking-tight text-zinc-900 mb-4">The Limits of Fairness</h2>
              <p className="text-zinc-600 mb-6 leading-relaxed">
                You balanced personal gains with societal empathy, but look at the issues now. Even when citizens vote on their ideals of fairness, it still opens the door to inequality because those ideals clash. Consensus rarely means unanimity.
              </p>
              <p className="text-zinc-600 mb-8 leading-relaxed">
                Look at the societal floor. By attempting to appease everyone's definition of "fair", some minority demographics still bore the cost.
              </p>
              <button onClick={onProceed} className="w-full py-4 bg-pink-600 text-white font-bold rounded-xl hover:bg-pink-700 transition-all shadow-lg">
                Proceed to Final Debrief: The Complexity of Governance
              </button>
            </div>
            <div className="bg-zinc-50 rounded-xl p-6 border border-zinc-200 flex flex-col">
              <div className="mb-4">
                <h3 className="text-xs font-bold text-rose-500 uppercase tracking-widest">
                  The Left Behind (LS 0-{leftBehindThreshold})
                </h3>
                <p className="text-xs text-zinc-400 font-medium">Conflicting fairness ideals still leave some behind.</p>
              </div>
              <div className="flex-1 min-h-[220px]">
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

      default:
        return null; 
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/80 backdrop-blur-md transition-all animate-in fade-in p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto p-10 border border-zinc-200 animate-in zoom-in duration-300">
        {renderContent()}
      </div>
    </div>
  );
}