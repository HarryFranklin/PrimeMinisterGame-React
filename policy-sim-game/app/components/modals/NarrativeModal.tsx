import React, { useState, useMemo } from 'react';
import { ElectionCycle, Respondent, AxisVariable } from '../../utils/types';
import { WelfareMetrics } from '../../utils/WelfareMetrics';
import D3Chart from '../D3Chart';

interface NarrativeModalProps {
  completedCycle: ElectionCycle;
  population: Respondent[];
  yAxisMax: number;
  onProceed: () => void;
}

const getDummyHistogram = (distribution: Record<number, number>) => {
  return Array.from({ length: 11 }, (_, i) => ({
    name: i, count: distribution[i] || 0
  }));
};

// STANDARDISED DPM HEADER (Helper Component)
const DPMMessage = ({ title, children, className = "mb-4" }: { title: string, children: React.ReactNode, className?: string }) => (
  <div className={`p-5 md:p-6 bg-zinc-50 rounded-xl border border-zinc-200 text-left ${className}`}>
    <div className="flex items-center gap-3 mb-4 border-b border-zinc-200/60 pb-4">
      <span className="text-3xl bg-white border border-zinc-200 w-12 h-12 flex items-center justify-center rounded-full shadow-sm shrink-0">🧑‍💼</span>
      <div>
        <span className="text-xs font-black uppercase tracking-widest text-pink-600 leading-tight block mb-0.5">Deputy Prime Minister</span>
        <span className="font-bold text-zinc-800 text-base md:text-lg">{title}</span>
      </div>
    </div>
    <div className="italic text-zinc-700 text-base md:text-lg leading-relaxed">{children}</div>
  </div>
);

export default function NarrativeModal({ completedCycle, population, onProceed, yAxisMax }: NarrativeModalProps) {
  const [revealedBenthamA, setRevealedBenthamA] = useState(false);
  const [revealedBenthamB, setRevealedBenthamB] = useState(false);

  const [revealedCitizen1, setRevealedCitizen1] = useState(false);
  const [revealedCitizen2, setRevealedCitizen2] = useState(false);
  const [rawlsExplanation, setRawlsExplanation] = useState(false);

  const [revealedEmpathy, setRevealedEmpathy] = useState(false);
  const [personalExplanation, setPersonalExplanation] = useState(false);

  const benthamGraphA = useMemo(() => getDummyHistogram({ 5: 100 }), []);
  const benthamGraphB = useMemo(() => getDummyHistogram({ 0: 50, 10: 50 }), []);

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

  const avgPU = useMemo(() => {
    if (population.length === 0) return 0;
    return population.reduce((sum, p) => sum + WelfareMetrics.getUtilityForPerson(p.currentLS, p.personalUtilities), 0) / population.length;
  }, [population]);

  const avgSU = useMemo(() => {
    if (population.length === 0) return 0;
    const allLS = population.map(p => p.currentLS);
    return population.reduce((sum, p) => sum + WelfareMetrics.evaluateDistribution(allLS, p.societalUtilities), 0) / population.length;
  }, [population]);

  const renderContent = () => {
    switch (completedCycle) {
      case ElectionCycle.Benthamite:
        const bothBenthamRevealed = revealedBenthamA && revealedBenthamB;
        return (
          <div className="flex flex-col gap-4">
            <div className="text-center max-w-3xl mx-auto mb-2">
              <h2 className="text-3xl font-black tracking-tight text-zinc-900 mb-3">Challenges with Aggregation</h2>
              <DPMMessage title="Theoretical Comparison">
                "Prime Minister, before examining the society you built, consider this comparison. Click to calculate the Benthamite average for these two theoretical societies."
              </DPMMessage>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-2">
              <div 
                onClick={() => setRevealedBenthamA(true)} 
                className={`p-4 rounded-xl border-2 transition-all relative overflow-hidden flex flex-col ${revealedBenthamA ? 'border-pink-300 bg-pink-50' : 'border-zinc-200 bg-zinc-50 cursor-pointer hover:border-pink-300 hover:bg-pink-50/50'}`}
              >
                <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest text-center mb-2">Society A</h3>
                {/* VITAL: Fixed Y Axis to 120 so both graphs are identical in scale */}
                <div className={`h-[220px] pointer-events-none transition-opacity duration-500 ${revealedBenthamA ? 'opacity-20' : 'opacity-100'}`}>
                  <D3Chart plotType="1D" chartData={[]} histogramData={benthamGraphA} xAxisType={AxisVariable.LifeSatisfaction} yAxisType={AxisVariable.LifeSatisfaction} color="#d4d4d8" visualStyle='faces' yAxisMax={120}/>
                </div>
                
                {!revealedBenthamA && (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="bg-white px-5 py-3 rounded-full text-sm font-bold shadow-sm text-pink-600">Calculate Average</span>
                  </div>
                )}
                
                {revealedBenthamA && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none animate-in zoom-in duration-300">
                    <span className="text-sm font-bold text-pink-600 uppercase tracking-widest mb-1">Average LS</span>
                    <strong className="text-6xl font-black text-pink-700">5.0</strong>
                  </div>
                )}
              </div>
              
              <div 
                onClick={() => setRevealedBenthamB(true)} 
                className={`p-4 rounded-xl border-2 transition-all relative overflow-hidden flex flex-col ${revealedBenthamB ? 'border-pink-300 bg-pink-50' : 'border-zinc-200 bg-zinc-50 cursor-pointer hover:border-pink-300 hover:bg-pink-50/50'}`}
              >
                <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest text-center mb-2">Society B</h3>
                {/* VITAL: Fixed Y Axis to 120 so both graphs are identical in scale */}
                <div className={`h-[220px] pointer-events-none transition-opacity duration-500 ${revealedBenthamB ? 'opacity-20' : 'opacity-100'}`}>
                  <D3Chart plotType="1D" chartData={[]} histogramData={benthamGraphB} xAxisType={AxisVariable.LifeSatisfaction} yAxisType={AxisVariable.LifeSatisfaction} color="#d4d4d8" visualStyle='faces' yAxisMax={120}/>
                </div>

                {!revealedBenthamB && (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="bg-white px-5 py-3 rounded-full text-sm font-bold shadow-sm text-pink-600">Calculate Average</span>
                  </div>
                )}
                
                {revealedBenthamB && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none animate-in zoom-in duration-300">
                    <span className="text-sm font-bold text-pink-600 uppercase tracking-widest mb-1">Average LS</span>
                    <strong className="text-6xl font-black text-pink-700">5.0</strong>
                  </div>
                )}
              </div>
            </div>

            {bothBenthamRevealed && (
              <div className="max-w-4xl mx-auto w-full text-center animate-in fade-in slide-in-from-bottom-4">
                <DPMMessage title="Mathematically Identical Outcomes" className="mb-5 border-pink-200 bg-pink-50/30">
                  "Under a strictly Benthamite framework, these societies are equally successful. Society A is perfectly equal, while Society B is entirely polarised. Maximising the average efficiently increases total wellbeing, but it completely ignores how that wellbeing is distributed."
                </DPMMessage>

                <button onClick={onProceed} className="w-full py-4 bg-zinc-900 text-white text-base font-bold rounded-xl hover:bg-black transition-all shadow-md">
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
            <div className="mb-4 text-center max-w-3xl mx-auto">
              <h2 className="text-3xl font-black tracking-tight text-zinc-900 mb-3">Objective Metrics vs. Utility</h2>
              <DPMMessage title="Subjective Experience">
                "Prime Minister, you successfully raised the floor. But the data presents a new variable. Click on these two citizens to reveal their Personal Utility scores."
              </DPMMessage>
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
                    className={`p-6 rounded-xl border-2 transition-all text-center relative overflow-hidden group flex flex-col justify-center h-full min-h-[200px] ${
                      isRevealed ? 'border-pink-300 bg-pink-50' : 'border-zinc-200 bg-zinc-50 cursor-pointer hover:border-pink-300 hover:bg-pink-50/50'
                    }`}
                  >
                    <p className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-3">Citizen #{String(citizen.id).substring(0,4)}</p>
                    
                    <div className="mb-3">
                      <span className="text-sm text-zinc-400">Life Satisfaction: </span>
                      <strong className="text-3xl text-zinc-800 block mt-1">{citizen.currentLS.toFixed(1)}</strong>
                    </div>
                    
                    <div className={`transition-all duration-500 ${isRevealed ? 'opacity-100 transform-none' : 'opacity-0 translate-y-4 hidden'}`}>
                      <div className="w-full h-px bg-zinc-200 my-4" />
                      <span className="text-sm text-pink-500 font-bold uppercase tracking-widest block mb-2">Personal Utility</span>
                      <strong className="text-4xl text-pink-600">{utility.toFixed(2)}</strong>
                    </div>

                    {!isRevealed && (
                      <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="bg-white px-5 py-3 rounded-full text-sm font-bold shadow-sm text-pink-600">Click to Reveal</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {bothRawlsRevealed && !rawlsExplanation && (
              <div className="max-w-3xl mx-auto w-full text-center animate-in fade-in slide-in-from-bottom-4">
                <DPMMessage title="Observation">
                  "Notice the stark difference in their utility despite identical living standards. Are you ready to proceed?"
                </DPMMessage>
                <button 
                  onClick={() => setRawlsExplanation(true)} 
                  className="w-full py-4 bg-zinc-900 text-white text-base font-bold rounded-xl hover:bg-black transition-all shadow-md"
                >
                  Review Findings
                </button>
              </div>
            )}

            {rawlsExplanation && (
              <div className="max-w-3xl mx-auto w-full text-center animate-in fade-in slide-in-from-bottom-4">
                <DPMMessage title="The Flaw in Objective Metrics" className="mb-5 border-pink-200 bg-pink-50/30">
                  "Despite having identical objective Life Satisfaction scores, their true Personal Utility is markedly different. While raising the floor provides a baseline standard, objective metrics do not always map perfectly to personal experience."
                </DPMMessage>
                <button 
                  onClick={onProceed} 
                  className="w-full py-4 bg-zinc-900 text-white text-base font-bold rounded-xl hover:bg-black transition-all shadow-md"
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
            <div className="mb-4 text-center max-w-3xl mx-auto">
              <h2 className="text-3xl font-black tracking-tight text-zinc-900 mb-3">The Individual vs The Collective</h2>
              <DPMMessage title="Societal Evaluation">
                "Personal Utility models citizens making choices based purely on their own outcomes. Click on the citizen below to reveal how their perspective shifts when accounting for the broader society."
              </DPMMessage>
            </div>

            <div className="max-w-2xl mx-auto w-full mb-6">
              <div 
                onClick={() => setRevealedEmpathy(true)}
                className={`p-6 rounded-xl border-2 transition-all text-center relative overflow-hidden group flex flex-col justify-center min-h-[220px] ${
                  revealedEmpathy ? 'border-emerald-300 bg-emerald-50' : 'border-zinc-200 bg-zinc-50 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/50'
                }`}
              >
                <p className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4">Citizen #{String(empathyCitizen.id).substring(0,4)}</p>
                
                <div className="grid grid-cols-2 gap-6 mb-4">
                  <div>
                    <span className="text-sm text-zinc-400 block mb-2">Life Satisfaction</span>
                    <strong className="text-3xl text-zinc-800">{empathyCitizen.currentLS.toFixed(1)}</strong>
                  </div>
                  <div>
                    <span className="text-sm text-zinc-400 block mb-2">Personal Utility</span>
                    <strong className="text-3xl text-zinc-800">{pu.toFixed(2)}</strong>
                  </div>
                </div>
                
                <div className={`transition-all duration-500 ${revealedEmpathy ? 'opacity-100 transform-none' : 'opacity-0 translate-y-4 hidden'}`}>
                  <div className="w-full h-px bg-zinc-200 my-4" />
                  <span className="text-sm text-emerald-500 font-bold uppercase tracking-widest block mb-2">Societal Utility (Evaluation of distribution)</span>
                  <strong className="text-4xl text-emerald-600">{su.toFixed(2)}</strong>
                  <p className="text-xs text-zinc-500 mt-3 max-w-md mx-auto italic">
                    "While my personal circumstances are optimal, my overall evaluation is adjusted downward due to the inequality present in the broader distribution."
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
              <div className="max-w-3xl mx-auto w-full text-center animate-in fade-in slide-in-from-bottom-4">
                <DPMMessage title="Observation">
                  "Notice the downward adjustment. Shall we review why this occurs?"
                </DPMMessage>
                <button 
                  onClick={() => setPersonalExplanation(true)} 
                  className="w-full py-4 bg-zinc-900 text-white text-base font-bold rounded-xl hover:bg-black transition-all shadow-md"
                >
                  Review Findings
                </button>
              </div>
            )}

            {personalExplanation && (
              <div className="max-w-3xl mx-auto w-full text-center animate-in fade-in slide-in-from-bottom-4">
                <DPMMessage title="The Status Quo Trap" className="mb-5 border-emerald-200 bg-emerald-50/30">
                  "When citizens evaluate policy strictly to protect their personal utility, widespread redistribution becomes difficult to enact due to loss aversion. For your final term, we will incorporate <strong>Societal Utility</strong> into their voting logic."
                </DPMMessage>
                <button 
                  onClick={onProceed} 
                  className="w-full py-4 bg-zinc-900 text-white text-base font-bold rounded-xl hover:bg-black transition-all shadow-md"
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
          <div className="flex flex-col">
            <div className="mb-4 text-center max-w-3xl mx-auto">
              <h2 className="text-3xl font-black tracking-tight text-zinc-900 mb-3">Personal vs. Societal Utility</h2>
              <DPMMessage title="Final Comparison">
                "Prime Minister, you have now tested both utility frameworks. Let's directly compare how the society you just built is evaluated under each philosophy."
              </DPMMessage>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-6 flex flex-col">
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-800 mb-3 text-center">Cycle 3: Personal Utility</h3>
                <div className="text-center mb-4">
                  <span className="text-xs uppercase font-bold text-zinc-400 block mb-1">Average Population Score</span>
                  <strong className="text-4xl font-black text-zinc-800">{avgPU.toFixed(2)}</strong>
                </div>
                <div className="flex-1 text-sm text-zinc-600 space-y-3">
                  <p><strong>The Mechanic:</strong> Citizens evaluate policy strictly based on their own risk and reward.</p>
                  <p><strong>The Challenge:</strong> Due to loss aversion, citizens will systematically block redistribution to protect their own wealth.</p>
                </div>
              </div>

              <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-6 flex flex-col">
                <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-800 mb-3 text-center">Cycle 4: Societal Utility</h3>
                <div className="text-center mb-4">
                  <span className="text-xs uppercase font-bold text-emerald-600/70 block mb-1">Average Population Score</span>
                  <strong className="text-4xl font-black text-emerald-700">{avgSU.toFixed(2)}</strong>
                </div>
                <div className="flex-1 text-sm text-emerald-800/80 space-y-3">
                  <p><strong>The Mechanic:</strong> Citizens evaluate policy based on empathy and their ideal vision of a fair society.</p>
                  <p><strong>The Challenge:</strong> While empathy allows the floor to rise, consensus remains difficult because citizens hold fundamentally conflicting definitions of "fairness".</p>
                </div>
              </div>
            </div>

            <div className="max-w-3xl mx-auto w-full text-center">
              <DPMMessage title="Next Steps" className="mb-5">
                "As you proceed to the final debrief, consider which of these four frameworks provides the most effective and ethical blueprint for real-world governance."
              </DPMMessage>
              <button onClick={onProceed} className="w-full py-4 bg-pink-600 text-white text-base font-bold rounded-xl hover:bg-pink-700 transition-all shadow-md">
                Proceed to Final Debrief
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/80 backdrop-blur-md transition-all animate-in fade-in p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full p-6 md:p-10 border border-zinc-200 animate-in zoom-in duration-300">
        {renderContent()}
      </div>
    </div>
  );
}