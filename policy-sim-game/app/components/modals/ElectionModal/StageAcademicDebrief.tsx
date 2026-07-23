import React, { useState, useMemo, useEffect } from 'react';
import { ElectionCycle, Respondent, AxisVariable } from '../../../utils/types';
import { WelfareMetrics } from '../../../utils/WelfareMetrics';
import D3Chart from '../../D3Chart';
import { DPMMessage } from '../SharedModalComponents';
import { motion } from 'framer-motion';

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

  const [revealedPU, setRevealedPU] = useState(false);
  const [revealedSU, setRevealedSU] = useState(false);

  useEffect(() => {
    let isReady = false;
    if (currentCycle === ElectionCycle.Benthamite) {
      isReady = revealedBenthamA && revealedBenthamB;
    } else if (currentCycle === ElectionCycle.Rawlsian) {
      isReady = revealedCitizen1 && revealedCitizen2;
    } else if (currentCycle === ElectionCycle.SocietalUtility) {
      isReady = revealedEmpathy;
    } else if (currentCycle === ElectionCycle.PersonalUtility) {
      isReady = revealedPU && revealedSU; 
    }
    
    if (isReady) {
      onReady();
    }
  }, [revealedBenthamA, revealedBenthamB, revealedCitizen1, revealedCitizen2, revealedEmpathy, revealedPU, revealedSU, currentCycle, onReady]);

  const dummyPeak = useMemo(() => Math.max(20, Math.floor((yAxisMax || 100) * 0.75)), [yAxisMax]);
  const benthamGraphA = useMemo(() => getDummyHistogram({ 5: dummyPeak }), [dummyPeak]);
  const benthamGraphB = useMemo(() => getDummyHistogram({ 0: Math.floor(dummyPeak / 2), 10: Math.ceil(dummyPeak / 2) }), [dummyPeak]);

  // Smarter Pairing Algorithm: Finds two citizens with almost identical objective gains but maximum difference in subjective utility
  const contrastingCitizens = useMemo(() => {
    if (finalPopulation.length === 0) return [];

    const enriched = finalPopulation.map(p => {
      const ledger = p.historicalLedger.find(l => l.cycle === currentCycle);
      
      const startLS = Number((ledger?.turns[0]?.ls ?? p.currentLS).toFixed(1));
      const endLS = Number((ledger?.turns[ledger.turns.length - 1]?.ls ?? p.currentLS).toFixed(1));
      const lsGained = Number((endLS - startLS).toFixed(1));
      
      const startPU = WelfareMetrics.getUtilityForPerson(startLS, p.personalUtilities);
      const endPU = WelfareMetrics.getUtilityForPerson(endLS, p.personalUtilities);
      const puGained = Number((endPU - startPU).toFixed(2));
      
      return { ...p, startLS, endLS, lsGained, puGained };
    });

    let bestPair = [enriched[0], enriched[1]];
    let maxContrast = -1;

    for (let i = 0; i < enriched.length; i++) {
      for (let j = i + 1; j < enriched.length; j++) {
        const p1 = enriched[i];
        const p2 = enriched[j];
        
        // Ensure both actually gained something noticeable
        if (p1.lsGained < 0.3 || p2.lsGained < 0.3) continue;
        
        const lsDiff = Math.abs(p1.lsGained - p2.lsGained);
        // They must have gained almost identical objective amounts (within 0.3 of each other)
        if (lsDiff > 0.3) continue; 
        
        const puDiff = Math.abs(p1.puGained - p2.puGained);
        
        // Heavily penalise objective differences so it prefers identical pairings
        const score = puDiff - (lsDiff * 2); 
        
        if (score > maxContrast) {
          maxContrast = score;
          bestPair = p1.startLS < p2.startLS ? [p1, p2] : [p2, p1];
        }
      }
    }
    return bestPair;
  }, [finalPopulation, currentCycle]);

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
      case ElectionCycle.Benthamite: return "We hit our happiness targets, but relying purely on averages can mask real suffering.\nClick each society below to reveal its average — see if you can guess before you click.";
      case ElectionCycle.Rawlsian: return "We protected the vulnerable, but objective living standards aren't the whole picture.\nClick on these citizens to see how their subjective wellbeing shifted in response to their physical gains.";
      case ElectionCycle.SocietalUtility: return "Our voters are behaving based on their empathy, but consensus is hard.\nLet's see what happens when we shift their focus to pure self-interest.";
      case ElectionCycle.PersonalUtility: return "We've experimented with different ways of measuring success.\nLet's compare how your performance is judged under a 'Fairness' lens versus a 'Self-Interest' lens.";
      default: return "";
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in w-full">
      <DPMMessage title="Academic Debrief">
        {getDpmMessage()}
      </DPMMessage>
      
      {currentCycle === ElectionCycle.Benthamite && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div onClick={() => setRevealedBenthamA(true)} className={`p-4 rounded-xl border-2 transition-all relative overflow-hidden flex flex-col cursor-pointer ${revealedBenthamA ? 'border-pink-300 bg-pink-50' : 'border-zinc-200 bg-zinc-50 hover:border-pink-300 hover:bg-pink-50/50'}`}>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-center mb-2">Society A</h3>
            <div className="relative h-[200px]">
              <div className={`w-full h-full pointer-events-none transition-opacity duration-500 ${revealedBenthamA ? 'opacity-20' : 'opacity-100'}`}>
                <D3Chart plotType="1D" chartData={[]} histogramData={benthamGraphA} xAxisType={AxisVariable.LifeSatisfaction} yAxisType={AxisVariable.LifeSatisfaction} color="#d4d4d8" visualStyle='faces' yAxisMax={yAxisMax} faceCols={1}/>
              </div>
              {revealedBenthamA && <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none animate-in zoom-in duration-300"><span className="text-xs font-bold text-pink-600 uppercase tracking-widest mb-1">Average LS</span><strong className="text-5xl font-black text-pink-700">5.0</strong></div>}
            </div>
            <div className="mt-4 flex justify-center items-center h-8">
              {!revealedBenthamA ? (
                <span className="bg-white px-4 py-1.5 rounded-full text-xs font-bold shadow-sm text-pink-600 border border-pink-200 animate-pulse">Calculate Average</span>
              ) : (
                <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest">Calculated</span>
              )}
            </div>
          </div>
          
          <div onClick={() => setRevealedBenthamB(true)} className={`p-4 rounded-xl border-2 transition-all relative overflow-hidden flex flex-col cursor-pointer ${revealedBenthamB ? 'border-pink-300 bg-pink-50' : 'border-zinc-200 bg-zinc-50 hover:border-pink-300 hover:bg-pink-50/50'}`}>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-center mb-2">Society B</h3>
            <div className="relative h-[200px]">
              <div className={`w-full h-full pointer-events-none transition-opacity duration-500 ${revealedBenthamB ? 'opacity-20' : 'opacity-100'}`}>
                <D3Chart plotType="1D" chartData={[]} histogramData={benthamGraphB} xAxisType={AxisVariable.LifeSatisfaction} yAxisType={AxisVariable.LifeSatisfaction} color="#d4d4d8" visualStyle='faces' yAxisMax={yAxisMax} faceCols={1}/>
              </div>
              {revealedBenthamB && <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none animate-in zoom-in duration-300"><span className="text-xs font-bold text-pink-600 uppercase tracking-widest mb-1">Average LS</span><strong className="text-5xl font-black text-pink-700">5.0</strong></div>}
            </div>
            <div className="mt-4 flex justify-center items-center h-8">
              {!revealedBenthamB ? (
                <span className="bg-white px-4 py-1.5 rounded-full text-xs font-bold shadow-sm text-pink-600 border border-pink-200 animate-pulse">Calculate Average</span>
              ) : (
                <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest">Calculated</span>
              )}
            </div>
          </div>

          {revealedBenthamA && revealedBenthamB && (
            <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.5, ease: 'easeOut' }} className="col-span-1 md:col-span-2 overflow-hidden">
              <DPMMessage title="Mathematically Identical" className="border-pink-200 bg-pink-50/30">
               {'When solely considering averages, these societies appear equally successful. Maximising the average efficiently increases total wellbeing, but it completely ignores how it is distributed. If unchecked, this can lead to issues such as equality.'}
              </DPMMessage>
            </motion.div>
          )}
        </div>
      )}

      {currentCycle === ElectionCycle.Rawlsian && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contrastingCitizens.map((citizen, idx) => {
            const isRevealed = idx === 0 ? revealedCitizen1 : revealedCitizen2;
            const setReveal = idx === 0 ? setRevealedCitizen1 : setRevealedCitizen2;
            
            return (
              <div key={idx} onClick={() => setReveal(true)} className={`p-4 rounded-xl border-2 transition-all text-center relative overflow-hidden group flex flex-col justify-center min-h-[160px] flex-1 cursor-pointer ${isRevealed ? 'border-pink-300 bg-pink-50' : 'border-zinc-200 bg-zinc-50 hover:border-pink-300 hover:bg-pink-50/50'}`}>
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">{citizen?.name}</p>
                <div className="mb-1 flex justify-center items-center gap-2">
                  <span className="text-xs text-zinc-400">Objective Shift: </span>
                  <span className="text-sm font-bold text-zinc-500">{citizen?.startLS.toFixed(1)}</span>
                  <span className="text-zinc-300">→</span>
                  <strong className="text-lg text-zinc-800">{citizen?.endLS.toFixed(1)}</strong>
                  <span className="text-[10px] font-black bg-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded ml-1">
                    {citizen && citizen.lsGained > 0 ? '+' : ''}{citizen?.lsGained.toFixed(1)} LS
                  </span>
                </div>
                
                <div className={`transition-all duration-500 ${isRevealed ? 'opacity-100 transform-none' : 'opacity-0 translate-y-4 hidden'}`}>
                  <div className="w-full h-px bg-zinc-200 my-2" />
                  <span className="text-[10px] text-pink-500 font-bold uppercase tracking-widest block mb-1">Subjective Value</span>
                  <strong className="text-2xl text-pink-600">
                    {citizen && citizen.puGained > 0 ? '+' : ''}{citizen?.puGained.toFixed(2)}
                  </strong>
                </div>
                
                {!isRevealed && <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm transition-opacity rounded-xl"><span className="bg-white px-4 py-2 rounded-full text-xs font-bold shadow-sm text-pink-600 border border-pink-200 animate-pulse">Click to Reveal</span></div>}
              </div>
            );
          })}

          {revealedCitizen1 && revealedCitizen2 && (
            <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.5, ease: 'easeOut' }} className="col-span-1 md:col-span-2 overflow-hidden">
              <DPMMessage title="Unequal Subjective Value" className="border-pink-200 bg-pink-50/30">
                {`Both citizens experienced a similar objective increase in their living standards. However, because one was already comfortable and the other was struggling, they value that gain completely differently.\n\nNext term, citizens will vote using their unique Societal Utility.`}
              </DPMMessage>
            </motion.div>
          )}
        </div>
      )}

      {currentCycle === ElectionCycle.SocietalUtility && empathyCitizen && (
        <div className="flex flex-col gap-4">
          <div onClick={() => setRevealedEmpathy(true)} className={`p-5 rounded-xl border-2 transition-all text-center relative overflow-hidden group flex flex-col justify-center min-h-[180px] cursor-pointer ${revealedEmpathy ? 'border-emerald-300 bg-emerald-50' : 'border-zinc-200 bg-zinc-50 hover:border-emerald-300 hover:bg-emerald-50/50'}`}>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">{empathyCitizen.name}</p>
            <div className="grid grid-cols-2 gap-4 mb-2">
              <div><span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Life Satisfaction</span><strong className="text-2xl text-zinc-800">{empathyCitizen.currentLS.toFixed(1)}</strong></div>
              <div><span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Societal Utility</span><strong className="text-2xl text-zinc-800">{WelfareMetrics.evaluateDistribution(finalPopulation.map((p: any) => p.currentLS), empathyCitizen.societalUtilities).toFixed(2)}</strong></div>
            </div>
            
            <div className={`transition-all duration-500 ${revealedEmpathy ? 'opacity-100 transform-none' : 'opacity-0 translate-y-4 hidden'}`}>
              <div className="w-full h-px bg-zinc-200 my-2" />
              <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest block mb-1">Personal Utility (Self-Interest)</span>
              <strong className="text-3xl text-emerald-600">{WelfareMetrics.getUtilityForPerson(empathyCitizen.currentLS, empathyCitizen.personalUtilities).toFixed(2)}</strong>
              <p className="text-[11px] text-zinc-500 mt-2 max-w-sm mx-auto italic leading-relaxed">"While my evaluation of society drops due to inequality, my personal score is significantly higher when evaluating strictly for myself."</p>
            </div>

            {!revealedEmpathy && <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm transition-opacity rounded-xl"><span className="bg-white px-5 py-2 rounded-full text-xs font-bold shadow-sm text-emerald-600 border border-emerald-200 animate-pulse">Reveal Personal Utility</span></div>}
          </div>

          {revealedEmpathy && (
            <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.5, ease: 'easeOut' }} className="overflow-hidden">
              <DPMMessage title="Moving to Self-Interest" className="border-emerald-200 bg-emerald-50/30">
                {'When citizens evaluate policy strictly based on empathy, consensus is difficult because everyone has a different definition of fairness.\nFor your final term, we will incorporate Personal Utility into their voting logic, modelling pure self-interest.'}
              </DPMMessage>
            </motion.div>
          )}
        </div>
      )}

      {currentCycle === ElectionCycle.PersonalUtility && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <div onClick={() => setRevealedSU(true)} className={`rounded-xl border-2 transition-all p-5 flex flex-col relative overflow-hidden cursor-pointer ${revealedSU ? 'border-emerald-300 bg-emerald-50' : 'border-zinc-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50'}`}>
            <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-600/70 mb-2 text-center">Term 3: Societal Utility</h3>
            <div className={`transition-all duration-500 flex flex-col h-full ${revealedSU ? 'opacity-100 transform-none' : 'opacity-0 translate-y-4 hidden'}`}>
              <div className="text-center mb-4 mt-2">
                <span className="text-xs uppercase font-bold text-emerald-600/70 block mb-1">Average Evaluation</span>
                <strong className="text-4xl font-black text-emerald-700">{avgSU.toFixed(2)}</strong>
              </div>
              <div className="flex-1 text-xs md:text-sm text-emerald-800/80 space-y-3 overflow-y-auto pr-1">
                <p><strong>The Mechanic:</strong> Citizens evaluate policy based on empathy and their ideal vision of a fair society.</p>
                <p><strong>The Challenge:</strong> Empathy raises the floor, but consensus is harder to reach when voters prioritise equality over aggregate wealth.</p>
              </div>
            </div>
            {!revealedSU && <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm transition-opacity rounded-xl"><span className="bg-white px-4 py-2 rounded-full text-xs font-bold shadow-sm text-emerald-600 border border-emerald-200 animate-pulse">Click to Reveal</span></div>}
          </div>
          
          <div onClick={() => setRevealedPU(true)} className={`rounded-xl border-2 transition-all p-5 flex flex-col relative overflow-hidden cursor-pointer ${revealedPU ? 'border-zinc-300 bg-zinc-50' : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/50'}`}>
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-2 text-center">Term 4: Personal Utility</h3>
            <div className={`transition-all duration-500 flex flex-col h-full ${revealedPU ? 'opacity-100 transform-none' : 'opacity-0 translate-y-4 hidden'}`}>
              <div className="text-center mb-4 mt-2">
                <span className="text-xs uppercase font-bold text-zinc-400 block mb-1">Average Evaluation</span>
                <strong className="text-4xl font-black text-zinc-800">{avgPU.toFixed(2)}</strong>
              </div>
              <div className="flex-1 text-xs md:text-sm text-zinc-600 space-y-3 overflow-y-auto pr-1">
                <p><strong>The Mechanic:</strong> Citizens evaluate policy strictly based on their own risk and reward.</p>
                <p><strong>The Challenge:</strong> Due to loss aversion, citizens will systematically block redistribution to protect their own wealth.</p>
              </div>
            </div>
            {!revealedPU && <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm transition-opacity rounded-xl"><span className="bg-white px-4 py-2 rounded-full text-xs font-bold shadow-sm text-zinc-600 border border-zinc-200 animate-pulse">Click to Reveal</span></div>}
          </div>

          {revealedPU && revealedSU && (
            <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.5, ease: 'easeOut' }} className="col-span-1 md:col-span-2 overflow-hidden">
              <DPMMessage title="The Final Mandate" className="border-zinc-200 bg-zinc-50/30">
                {'"You have seen how the same society can be judged completely differently depending on the metrics we use to measure success. You have navigated four different political philosophies.\nIt is time for your final verdict.'}
              </DPMMessage>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}