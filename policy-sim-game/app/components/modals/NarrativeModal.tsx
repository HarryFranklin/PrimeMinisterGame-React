import React, { useState, useMemo } from 'react';
import { ElectionCycle, Respondent, AxisVariable } from '../../utils/types';
import { WelfareMetrics } from '../../utils/WelfareMetrics';
import D3Chart from '../D3Chart';
import { ModalOverlay, ModalContent, ModalHeader, DPMMessage, ModalActionBtn } from './SharedModalComponents';

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
          <>
            <ModalHeader title="Challenges with Aggregation" />
            <DPMMessage title="Theoretical Comparison">
              "Prime Minister, before examining the society you built, consider this comparison. Click to calculate the Benthamite average for these two theoretical societies."
            </DPMMessage>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                onClick={() => setRevealedBenthamA(true)} 
                className={`p-4 rounded-xl border-2 transition-all relative overflow-hidden flex flex-col ${revealedBenthamA ? 'border-pink-300 bg-pink-50' : 'border-zinc-200 bg-zinc-50 cursor-pointer hover:border-pink-300 hover:bg-pink-50/50'}`}
              >
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-center mb-2">Society A</h3>
                {/* Standardised Height */}
                <div className={`h-[180px] pointer-events-none transition-opacity duration-500 ${revealedBenthamA ? 'opacity-20' : 'opacity-100'}`}>
                  <D3Chart plotType="1D" chartData={[]} histogramData={benthamGraphA} xAxisType={AxisVariable.LifeSatisfaction} yAxisType={AxisVariable.LifeSatisfaction} color="#d4d4d8" visualStyle='faces' yAxisMax={120} faceCols={3}/>
                </div>
                
                {!revealedBenthamA && (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="bg-white px-4 py-2 rounded-full text-xs font-bold shadow-sm text-pink-600">Calculate Average</span>
                  </div>
                )}
                
                {revealedBenthamA && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none animate-in zoom-in duration-300">
                    <span className="text-xs font-bold text-pink-600 uppercase tracking-widest mb-1">Average LS</span>
                    <strong className="text-5xl font-black text-pink-700">5.0</strong>
                  </div>
                )}
              </div>
              
              <div 
                onClick={() => setRevealedBenthamB(true)} 
                className={`p-4 rounded-xl border-2 transition-all relative overflow-hidden flex flex-col ${revealedBenthamB ? 'border-pink-300 bg-pink-50' : 'border-zinc-200 bg-zinc-50 cursor-pointer hover:border-pink-300 hover:bg-pink-50/50'}`}
              >
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-center mb-2">Society B</h3>
                <div className={`h-[180px] pointer-events-none transition-opacity duration-500 ${revealedBenthamB ? 'opacity-20' : 'opacity-100'}`}>
                  <D3Chart plotType="1D" chartData={[]} histogramData={benthamGraphB} xAxisType={AxisVariable.LifeSatisfaction} yAxisType={AxisVariable.LifeSatisfaction} color="#d4d4d8" visualStyle='faces' yAxisMax={120} faceCols={3}/>
                </div>

                {!revealedBenthamB && (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="bg-white px-4 py-2 rounded-full text-xs font-bold shadow-sm text-pink-600">Calculate Average</span>
                  </div>
                )}
                
                {revealedBenthamB && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none animate-in zoom-in duration-300">
                    <span className="text-xs font-bold text-pink-600 uppercase tracking-widest mb-1">Average LS</span>
                    <strong className="text-5xl font-black text-pink-700">5.0</strong>
                  </div>
                )}
              </div>
            </div>

            {bothBenthamRevealed && (
              <div className="mt-2 animate-in fade-in slide-in-from-bottom-4">
                <DPMMessage title="Mathematically Identical Outcomes" className="border-pink-200 bg-pink-50/30 mb-4">
                  "Under a strictly Benthamite framework, these societies are equally successful. Society A is perfectly equal, while Society B is entirely polarised. Maximising the average efficiently increases total wellbeing, but it completely ignores how that wellbeing is distributed."
                </DPMMessage>
                <ModalActionBtn onClick={onProceed}>Restart Simulation: Cycle 2 (Rawlsian)</ModalActionBtn>
              </div>
            )}
          </>
        );

      case ElectionCycle.Rawlsian:
        const bothRawlsRevealed = revealedCitizen1 && revealedCitizen2;
        return (
          <>
            <ModalHeader title="Objective Metrics vs. Utility" />
            <DPMMessage title="Subjective Experience">
              "Prime Minister, you successfully raised the floor. But the data presents a new variable. Click on these two citizens to reveal their Personal Utility scores."
            </DPMMessage>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contrastingCitizens.map((citizen, idx) => {
                const utility = WelfareMetrics.getUtilityForPerson(citizen.currentLS, citizen.personalUtilities);
                const isRevealed = idx === 0 ? revealedCitizen1 : revealedCitizen2;
                const setReveal = idx === 0 ? setRevealedCitizen1 : setRevealedCitizen2;

                return (
                  <div 
                    key={idx} 
                    onClick={() => setReveal(true)}
                    className={`p-4 rounded-xl border-2 transition-all text-center relative overflow-hidden group flex flex-col justify-center h-full min-h-[160px] ${
                      isRevealed ? 'border-pink-300 bg-pink-50' : 'border-zinc-200 bg-zinc-50 cursor-pointer hover:border-pink-300 hover:bg-pink-50/50'
                    }`}
                  >
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Citizen #{String(citizen.id).substring(0,4)}</p>
                    
                    <div className="mb-2">
                      <span className="text-xs text-zinc-400">Life Satisfaction: </span>
                      <strong className="text-2xl text-zinc-800 block mt-1">{citizen.currentLS.toFixed(1)}</strong>
                    </div>
                    
                    <div className={`transition-all duration-500 ${isRevealed ? 'opacity-100 transform-none' : 'opacity-0 translate-y-4 hidden'}`}>
                      <div className="w-full h-px bg-zinc-200 my-3" />
                      <span className="text-xs text-pink-500 font-bold uppercase tracking-widest block mb-1">Personal Utility</span>
                      <strong className="text-3xl text-pink-600">{utility.toFixed(2)}</strong>
                    </div>

                    {!isRevealed && (
                      <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="bg-white px-4 py-2 rounded-full text-xs font-bold shadow-sm text-pink-600">Click to Reveal</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {bothRawlsRevealed && !rawlsExplanation && (
              <div className="mt-2 animate-in fade-in slide-in-from-bottom-4">
                <DPMMessage title="Observation" className="mb-4">
                  "Notice the stark difference in their utility despite identical living standards. Are you ready to proceed?"
                </DPMMessage>
                <ModalActionBtn onClick={() => setRawlsExplanation(true)}>Review Findings</ModalActionBtn>
              </div>
            )}

            {rawlsExplanation && (
              <div className="mt-2 animate-in fade-in slide-in-from-bottom-4">
                <DPMMessage title="The Flaw in Objective Metrics" className="mb-4 border-pink-200 bg-pink-50/30">
                  "Despite having identical objective Life Satisfaction scores, their true Personal Utility is markedly different. While raising the floor provides a baseline standard, objective metrics do not always map perfectly to personal experience."
                </DPMMessage>
                <ModalActionBtn onClick={onProceed}>Restart Simulation: Cycle 3 (Personal Utility)</ModalActionBtn>
              </div>
            )}
          </>
        );

      case ElectionCycle.PersonalUtility: {
        if (!empathyCitizen) return null;
        const allLS = population.map(p => p.currentLS);
        const pu = WelfareMetrics.getUtilityForPerson(empathyCitizen.currentLS, empathyCitizen.personalUtilities);
        const su = WelfareMetrics.evaluateDistribution(allLS, empathyCitizen.societalUtilities);

        return (
          <>
            <ModalHeader title="The Individual vs The Collective" />
            <DPMMessage title="Societal Evaluation">
              "Personal Utility models citizens making choices based purely on their own outcomes. Click on the citizen below to reveal how their perspective shifts when accounting for the broader society."
            </DPMMessage>

            <div className="w-full">
              <div 
                onClick={() => setRevealedEmpathy(true)}
                className={`p-5 rounded-xl border-2 transition-all text-center relative overflow-hidden group flex flex-col justify-center min-h-[180px] ${
                  revealedEmpathy ? 'border-emerald-300 bg-emerald-50' : 'border-zinc-200 bg-zinc-50 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/50'
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Citizen #{String(empathyCitizen.id).substring(0,4)}</p>
                
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div>
                    <span className="text-xs text-zinc-400 block mb-1">Life Satisfaction</span>
                    <strong className="text-2xl text-zinc-800">{empathyCitizen.currentLS.toFixed(1)}</strong>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400 block mb-1">Personal Utility</span>
                    <strong className="text-2xl text-zinc-800">{pu.toFixed(2)}</strong>
                  </div>
                </div>
                
                <div className={`transition-all duration-500 ${revealedEmpathy ? 'opacity-100 transform-none' : 'opacity-0 translate-y-4 hidden'}`}>
                  <div className="w-full h-px bg-zinc-200 my-3" />
                  <span className="text-xs text-emerald-500 font-bold uppercase tracking-widest block mb-1">Societal Utility (Evaluation of distribution)</span>
                  <strong className="text-3xl text-emerald-600">{su.toFixed(2)}</strong>
                  <p className="text-[10px] text-zinc-500 mt-2 max-w-sm mx-auto italic">
                    "While my personal circumstances are optimal, my overall evaluation is adjusted downward due to the inequality present in the broader distribution."
                  </p>
                </div>

                {!revealedEmpathy && (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="bg-white px-4 py-2 rounded-full text-xs font-bold shadow-sm text-emerald-600">Reveal Societal Utility</span>
                  </div>
                )}
              </div>
            </div>

            {revealedEmpathy && !personalExplanation && (
              <div className="mt-2 animate-in fade-in slide-in-from-bottom-4">
                <DPMMessage title="Observation" className="mb-4">
                  "Notice the downward adjustment. Shall we review why this occurs?"
                </DPMMessage>
                <ModalActionBtn onClick={() => setPersonalExplanation(true)}>Review Findings</ModalActionBtn>
              </div>
            )}

            {personalExplanation && (
              <div className="mt-2 animate-in fade-in slide-in-from-bottom-4">
                <DPMMessage title="The Status Quo Trap" className="mb-4 border-emerald-200 bg-emerald-50/30">
                  "When citizens evaluate policy strictly to protect their personal utility, widespread redistribution becomes difficult to enact due to loss aversion. For your final term, we will incorporate <strong>Societal Utility</strong> into their voting logic."
                </DPMMessage>
                <ModalActionBtn onClick={onProceed}>Restart Simulation: Final Cycle (Societal Utility)</ModalActionBtn>
              </div>
            )}
          </>
        );
      }

      case ElectionCycle.SocietalUtility:
        return (
          <>
            <ModalHeader title="Personal vs. Societal Utility" />
            <DPMMessage title="Final Comparison">
              "Prime Minister, you have now tested both utility frameworks. Let's directly compare how the society you just built is evaluated under each philosophy."
            </DPMMessage>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-5 flex flex-col">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-800 mb-2 text-center">Cycle 3: Personal Utility</h3>
                <div className="text-center mb-3">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Average Population Score</span>
                  <strong className="text-3xl font-black text-zinc-800">{avgPU.toFixed(2)}</strong>
                </div>
                <div className="flex-1 text-xs text-zinc-600 space-y-2">
                  <p><strong>The Mechanic:</strong> Citizens evaluate policy strictly based on their own risk and reward.</p>
                  <p><strong>The Challenge:</strong> Due to loss aversion, citizens will systematically block redistribution to protect their own wealth.</p>
                </div>
              </div>

              <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-5 flex flex-col">
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-800 mb-2 text-center">Cycle 4: Societal Utility</h3>
                <div className="text-center mb-3">
                  <span className="text-[10px] uppercase font-bold text-emerald-600/70 block mb-1">Average Population Score</span>
                  <strong className="text-3xl font-black text-emerald-700">{avgSU.toFixed(2)}</strong>
                </div>
                <div className="flex-1 text-xs text-emerald-800/80 space-y-2">
                  <p><strong>The Mechanic:</strong> Citizens evaluate policy based on empathy and their ideal vision of a fair society.</p>
                  <p><strong>The Challenge:</strong> While empathy allows the floor to rise, consensus remains difficult because citizens hold fundamentally conflicting definitions of "fairness".</p>
                </div>
              </div>
            </div>

            <div className="mt-2 text-center">
              <DPMMessage title="Next Steps" className="mb-4">
                "As you proceed to the final debrief, consider which of these four frameworks provides the most effective and ethical blueprint for real-world governance."
              </DPMMessage>
              <ModalActionBtn onClick={onProceed} variant="accent">Proceed to Final Debrief</ModalActionBtn>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <ModalOverlay>
      <ModalContent maxWidth="max-w-4xl">
        {renderContent()}
      </ModalContent>
    </ModalOverlay>
  );
}