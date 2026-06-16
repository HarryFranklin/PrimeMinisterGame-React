/**
 * Page 5 of the election sequence.
 * Provides the theoretical and comparative analysis under different welfare frameworks.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { ElectionCycle, Respondent, AxisVariable } from '../../../utils/types';
import { WelfareMetrics } from '../../../utils/WelfareMetrics';
import D3Chart from '../../D3Chart';
import { DPMMessage } from '../SharedModalComponents';

interface StageAcademicDebriefProps {
  currentCycle: ElectionCycle;
  finalPopulation: Respondent[];
  yAxisMax: number;
  onReady: () => void;
}

const getDummyHistogram = (distribution: Record<number, number>) => 
  Array.from({ length: 11 }, (_, i) => ({ name: i, count: distribution[i] || 0 }));

export default function StageAcademicDebrief({ 
  currentCycle, 
  finalPopulation, 
  yAxisMax,
  onReady 
}: StageAcademicDebriefProps) {
  const [revealedBenthamA, setRevealedBenthamA] = useState(false);
  const [revealedBenthamB, setRevealedBenthamB] = useState(false);
  const [revealedCitizen1, setRevealedCitizen1] = useState(false);
  const [revealedCitizen2, setRevealedCitizen2] = useState(false);
  const [revealedEmpathy, setRevealedEmpathy] = useState(false);

  useEffect(() => {
    let isReady = false;
    if (currentCycle === ElectionCycle.Benthamite) {
      isReady = revealedBenthamA && revealedBenthamB;
    } else if (currentCycle === ElectionCycle.Rawlsian) {
      isReady = revealedCitizen1 && revealedCitizen2;
    } else if (currentCycle === ElectionCycle.PersonalUtility) {
      isReady = revealedEmpathy;
    } else if (currentCycle === ElectionCycle.SocietalUtility) {
      isReady = true; 
    }

    if (isReady) {
      onReady();
    }
  }, [revealedBenthamA, revealedBenthamB, revealedCitizen1, revealedCitizen2, revealedEmpathy, currentCycle, onReady]);

  const dummyPeak = useMemo(() => Math.max(20, Math.floor((yAxisMax || 100) * 0.75)), [yAxisMax]);
  
  const benthamGraphA = useMemo(() => getDummyHistogram({ 5: dummyPeak }), [dummyPeak]);
  const benthamGraphB = useMemo(() => getDummyHistogram({ 0: Math.floor(dummyPeak / 2), 10: Math.ceil(dummyPeak / 2) }), [dummyPeak]);

  const contrastingCitizens = useMemo(() => {
    for (let i = 0; i < finalPopulation.length; i++) {
      for (let j = i + 1; j < finalPopulation.length; j++) {
        if (Math.abs(finalPopulation[i].currentLS - finalPopulation[j].currentLS) < 0.2) {
          const u1 = WelfareMetrics.getUtilityForPerson(finalPopulation[i].currentLS, finalPopulation[i].personalUtilities);
          const u2 = WelfareMetrics.getUtilityForPerson(finalPopulation[j].currentLS, finalPopulation[j].personalUtilities);
          if (Math.abs(u1 - u2) > 0.4) return [finalPopulation[i], finalPopulation[j]];
        }
      }
    }
    return [finalPopulation[0], finalPopulation[1]];
  }, [finalPopulation]);

  const empathyCitizen = useMemo(() => {
    if (finalPopulation.length === 0) return null;
    const allLS = finalPopulation.map((p: any) => p.currentLS);
    let bestCitizen = finalPopulation[0];
    let maxDiff = -1;
    for (const r of finalPopulation) {
      if (r.currentLS >= 7) {
        const pu = WelfareMetrics.getUtilityForPerson(r.currentLS, r.personalUtilities);
        const su = WelfareMetrics.evaluateDistribution(allLS, r.societalUtilities);
        const diff = pu - su;
        if (diff > maxDiff) { maxDiff = diff; bestCitizen = r; }
      }
    }
    return bestCitizen;
  }, [finalPopulation]);

  const avgPU = useMemo(() => finalPopulation.reduce((sum: number, p: any) => sum + WelfareMetrics.getUtilityForPerson(p.currentLS, p.personalUtilities), 0) / finalPopulation.length, [finalPopulation]);
  const avgSU = useMemo(() => {
    const allLS = finalPopulation.map((p: any) => p.currentLS);
    return finalPopulation.reduce((sum: number, p: any) => sum + WelfareMetrics.evaluateDistribution(allLS, p.societalUtilities), 0) / finalPopulation.length;
  }, [finalPopulation]);

  const getDpmMessage = () => {
    switch (currentCycle) {
      case ElectionCycle.Benthamite: return "We hit our happiness targets, but relying purely on averages can mask real suffering. Let's look at an example of how two societies can have the same average happiness.";
      case ElectionCycle.Rawlsian: return "We protected the vulnerable, but looking at living standards isn't the whole picture. Click on these citizens to see how they feel their lives have actually changed.";
      case ElectionCycle.PersonalUtility: return "Our voters are behaving selfishly. They ignore the big picture to protect their own wallets. Click below to see what happens when we try to shift their focus toward fairness.";
      case ElectionCycle.SocietalUtility: return "We've experimented with different ways of measuring success. Let's compare how your performance is judged under a 'Fairness' lens versus a 'Self-Interest' lens.";
      default: return "";
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in">
      <DPMMessage title="Academic Debrief">
        {getDpmMessage()}
      </DPMMessage>
      
      {currentCycle === ElectionCycle.Benthamite && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div onClick={() => setRevealedBenthamA(true)} className={`p-4 rounded-xl border-2 transition-all relative overflow-hidden flex flex-col cursor-pointer ${revealedBenthamA ? 'border-pink-300 bg-pink-50' : 'border-zinc-200 bg-zinc-50 hover:border-pink-300 hover:bg-pink-50/50'}`}>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-center mb-2">Society A</h3>
            <div className={`h-[200px] pointer-events-none transition-opacity duration-500 ${revealedBenthamA ? 'opacity-20' : 'opacity-100'}`}>
              <D3Chart plotType="1D" chartData={[]} histogramData={benthamGraphA} xAxisType={AxisVariable.LifeSatisfaction} yAxisType={AxisVariable.LifeSatisfaction} color="#d4d4d8" visualStyle='faces' yAxisMax={yAxisMax} faceCols={1}/>
            </div>
            {!revealedBenthamA && <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity"><span className="bg-white px-4 py-2 rounded-full text-xs font-bold shadow-sm text-pink-600">Calculate Average</span></div>}
            {revealedBenthamA && <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none animate-in zoom-in duration-300"><span className="text-xs font-bold text-pink-600 uppercase tracking-widest mb-1">Average LS</span><strong className="text-5xl font-black text-pink-700">5.0</strong></div>}
          </div>
          
          <div onClick={() => setRevealedBenthamB(true)} className={`p-4 rounded-xl border-2 transition-all relative overflow-hidden flex flex-col cursor-pointer ${revealedBenthamB ? 'border-pink-300 bg-pink-50' : 'border-zinc-200 bg-zinc-50 hover:border-pink-300 hover:bg-pink-50/50'}`}>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-center mb-2">Society B</h3>
            <div className={`h-[200px] pointer-events-none transition-opacity duration-500 ${revealedBenthamB ? 'opacity-20' : 'opacity-100'}`}>
              <D3Chart plotType="1D" chartData={[]} histogramData={benthamGraphB} xAxisType={AxisVariable.LifeSatisfaction} yAxisType={AxisVariable.LifeSatisfaction} color="#d4d4d8" visualStyle='faces' yAxisMax={yAxisMax} faceCols={1}/>
            </div>
            {!revealedBenthamB && <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity"><span className="bg-white px-4 py-2 rounded-full text-xs font-bold shadow-sm text-pink-600">Calculate Average</span></div>}
            {revealedBenthamB && <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none animate-in zoom-in duration-300"><span className="text-xs font-bold text-pink-600 uppercase tracking-widest mb-1">Average LS</span><strong className="text-5xl font-black text-pink-700">5.0</strong></div>}
          </div>

          {revealedBenthamA && revealedBenthamB && (
            <DPMMessage title="Mathematically Identical" className="border-pink-200 bg-pink-50/30 animate-in fade-in slide-in-from-bottom-4 col-span-1 md:col-span-2">
              "Under a strictly Benthamite framework, these societies are equally successful. Maximising the average efficiently increases total wellbeing, but it completely ignores equality. For Term 2, we will focus on raising the societal floor."
            </DPMMessage>
          )}
        </div>
      )}

      {currentCycle === ElectionCycle.Rawlsian && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contrastingCitizens.map((citizen, idx) => {
            const utility = WelfareMetrics.getUtilityForPerson(citizen.currentLS, citizen.personalUtilities);
            const isRevealed = idx === 0 ? revealedCitizen1 : revealedCitizen2;
            const setReveal = idx === 0 ? setRevealedCitizen1 : setRevealedCitizen2;
            return (
              <div key={idx} onClick={() => setReveal(true)} className={`p-4 rounded-xl border-2 transition-all text-center relative overflow-hidden group flex flex-col justify-center min-h-[140px] flex-1 cursor-pointer ${isRevealed ? 'border-pink-300 bg-pink-50' : 'border-zinc-200 bg-zinc-50 hover:border-pink-300 hover:bg-pink-50/50'}`}>
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">{citizen.name}</p>
                <div className="mb-1"><span className="text-xs text-zinc-400">Objective Life Satisfaction: </span><strong className="text-xl text-zinc-800 block mt-1">{citizen.currentLS.toFixed(1)}</strong></div>
                
                <div className={`transition-all duration-500 ${isRevealed ? 'opacity-100 transform-none' : 'opacity-0 translate-y-4 hidden'}`}>
                  <div className="w-full h-px bg-zinc-200 my-2" />
                  <span className="text-[10px] text-pink-500 font-bold uppercase tracking-widest block mb-1">Subjective Utility</span>
                  <strong className="text-2xl text-pink-600">{utility.toFixed(2)}</strong>
                </div>
                
                {!isRevealed && <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity"><span className="bg-white px-4 py-2 rounded-full text-xs font-bold shadow-sm text-pink-600">Click to Reveal</span></div>}
              </div>
            );
          })}
          {revealedCitizen1 && revealedCitizen2 && (
            <DPMMessage title="The Flaw in Objective Metrics" className="border-pink-200 bg-pink-50/30 animate-in fade-in slide-in-from-bottom-4 col-span-1 md:col-span-2">
              "Despite having identical living standards, their internal utility differs wildly. While raising the floor provides a baseline, it doesn't perfectly map to happiness. Next term, citizens will vote using their unique Personal Utility."
            </DPMMessage>
          )}
        </div>
      )}

      {currentCycle === ElectionCycle.PersonalUtility && empathyCitizen && (
        <div className="flex flex-col gap-3">
          <div onClick={() => setRevealedEmpathy(true)} className={`p-5 rounded-xl border-2 transition-all text-center relative overflow-hidden group flex flex-col justify-center min-h-[180px] cursor-pointer ${revealedEmpathy ? 'border-emerald-300 bg-emerald-50' : 'border-zinc-200 bg-zinc-50 hover:border-emerald-300 hover:bg-emerald-50/50'}`}>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">{empathyCitizen.name}</p>
            <div className="grid grid-cols-2 gap-4 mb-2">
              <div><span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Life Satisfaction</span><strong className="text-2xl text-zinc-800">{empathyCitizen.currentLS.toFixed(1)}</strong></div>
              <div><span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Personal Utility</span><strong className="text-2xl text-zinc-800">{WelfareMetrics.getUtilityForPerson(empathyCitizen.currentLS, empathyCitizen.personalUtilities).toFixed(2)}</strong></div>
            </div>
            <div className={`transition-all duration-500 ${revealedEmpathy ? 'opacity-100 transform-none' : 'opacity-0 translate-y-4 hidden'}`}>
              <div className="w-full h-px bg-zinc-200 my-2" />
              <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest block mb-1">Societal Utility (Evaluation of distribution)</span>
              <strong className="text-3xl text-emerald-600">{WelfareMetrics.evaluateDistribution(finalPopulation.map((p: any) => p.currentLS), empathyCitizen.societalUtilities).toFixed(2)}</strong>
              <p className="text-[11px] text-zinc-500 mt-2 max-w-sm mx-auto italic leading-relaxed">"While my personal circumstances are optimal, my overall evaluation is adjusted downward due to the inequality present in the broader society."</p>
            </div>
            {!revealedEmpathy && <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity"><span className="bg-white px-5 py-2 rounded-full text-xs font-bold shadow-sm text-emerald-600">Reveal Societal Utility</span></div>}
          </div>

          {revealedEmpathy && (
            <DPMMessage title="Moving to Empathy" className="border-emerald-200 bg-emerald-50/30 animate-in fade-in slide-in-from-bottom-4">
              "When citizens evaluate policy strictly to protect their personal utility, widespread redistribution becomes impossible due to loss aversion. For your final term, we will incorporate Societal Utility into their voting logic."
            </DPMMessage>
          )}
        </div>
      )}

      {currentCycle === ElectionCycle.SocietalUtility && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-4 flex flex-col">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-800 mb-2 text-center">Term 3: Personal Utility</h3>
            <div className="text-center mb-3"><span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Average Evaluation</span><strong className="text-3xl font-black text-zinc-800">{avgPU.toFixed(2)}</strong></div>
            <div className="flex-1 text-xs text-zinc-600 space-y-2">
              <p><strong>The Mechanic:</strong> Citizens evaluate policy strictly based on their own risk and reward.</p>
              <p><strong>The Challenge:</strong> Due to loss aversion, citizens will systematically block redistribution to protect their own wealth.</p>
            </div>
          </div>
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 flex flex-col">
            <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-800 mb-2 text-center">Term 4: Societal Utility</h3>
            <div className="text-center mb-3"><span className="text-[10px] uppercase font-bold text-emerald-600/70 block mb-1">Average Evaluation</span><strong className="text-3xl font-black text-emerald-700">{avgSU.toFixed(2)}</strong></div>
            <div className="flex-1 text-xs text-emerald-800/80 space-y-2">
              <p><strong>The Mechanic:</strong> Citizens evaluate policy based on empathy and their ideal vision of a fair society.</p>
              <p><strong>The Challenge:</strong> While empathy allows the floor to rise, consensus remains difficult because citizens hold fundamentally conflicting definitions of "fairness".</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}