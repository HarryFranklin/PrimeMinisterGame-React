import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ElectionCycle, AxisVariable } from '../../utils/types';
import { WelfareMetrics } from '../../utils/WelfareMetrics';
import D3Chart from '../D3Chart';
import { track } from '../../client/telemetry';
import { useGame } from '../../context/GameStateContext';

const getDummyHistogram = (distribution: Record<number, number>) =>
  Array.from({ length: 11 }, (_, i) => ({ name: i, count: distribution[i] || 0 }));

// Small dark-mode note used for the top instruction line and per-section insight
// callouts. Replaces the repeated white DPMMessage box (icon + "Deputy Prime
// Minister" kicker) so the payoff text doesn't compete with the header above it.
const toneClasses: Record<string, string> = {
  pink: 'border-pink-500/30 bg-pink-500/10 text-pink-300',
  emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  zinc: 'border-zinc-700 bg-zinc-800/50 text-zinc-300',
};

const Note = ({
  label,
  tone = 'pink',
  children,
}: {
  label: string;
  tone?: 'pink' | 'emerald' | 'zinc';
  children: React.ReactNode;
}) => (
  <div className={`rounded-xl border p-4 text-left ${toneClasses[tone]}`}>
    <span className="text-xs font-black uppercase tracking-widest block mb-1 opacity-80">{label}</span>
    <p className="text-base italic leading-relaxed whitespace-pre-wrap text-zinc-200">{children}</p>
  </div>
);

export default function AcademicDebriefOverlay() {
  const { currentCycle, population: finalPopulation, yAxisMax, resolveAcademicDebrief } = useGame();

  const [revealedBenthamA, setRevealedBenthamA] = useState(false);
  const [revealedBenthamB, setRevealedBenthamB] = useState(false);
  const [revealedCitizen1, setRevealedCitizen1] = useState(false);
  const [revealedCitizen2, setRevealedCitizen2] = useState(false);
  const [revealedEmpathy, setRevealedEmpathy] = useState(false);
  const [revealedPU, setRevealedPU] = useState(false);
  const [revealedSU, setRevealedSU] = useState(false);
  const [ready, setReady] = useState(false);

  // ── Telemetry refs ──────────────────────────────────────────────────────
  const openedAt = useRef(Date.now());
  const firstInteractionAt = useRef<number | null>(null);
  const lastInteractionAt = useRef<number | null>(null);
  const readyFired = useRef(false);

  useEffect(() => {
    openedAt.current = Date.now();
    track('academic_debrief_opened', { cycle: ElectionCycle[currentCycle] });
  }, []);

  // Call this from every "click to reveal" handler
  const markInteraction = () => {
    const now = Date.now();
    if (firstInteractionAt.current === null) {
      firstInteractionAt.current = now;
      track('academic_debrief_first_interaction', {
        cycle: ElectionCycle[currentCycle],
        time_to_first_ms: now - openedAt.current,
      });
    }
    lastInteractionAt.current = now;
  };
  // ────────────────────────────────────────────────────────────────────────

  // Determine when all required reveals for this cycle are done → unlock Continue
  useEffect(() => {
    if (readyFired.current) return;

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
      readyFired.current = true;
      const now = Date.now();
      track('academic_debrief_closed', {
        cycle: ElectionCycle[currentCycle],
        dwell_ms: now - openedAt.current,
        idle_before_proceed_ms: lastInteractionAt.current ? now - lastInteractionAt.current : now - openedAt.current,
      });
      setReady(true);
    }
  }, [revealedBenthamA, revealedBenthamB, revealedCitizen1, revealedCitizen2, revealedEmpathy, revealedPU, revealedSU, currentCycle]);

  const dummyPeak = useMemo(() => Math.max(20, Math.floor((yAxisMax || 100) * 0.75)), [yAxisMax]);
  const benthamGraphA = useMemo(() => getDummyHistogram({ 5: dummyPeak }), [dummyPeak]);
  const benthamGraphB = useMemo(() => getDummyHistogram({ 0: Math.floor(dummyPeak / 2), 10: Math.ceil(dummyPeak / 2) }), [dummyPeak]);

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
    let maxScore = -Infinity;

    for (let i = 0; i < enriched.length; i++) {
      for (let j = i + 1; j < enriched.length; j++) {
        const p1 = enriched[i];
        const p2 = enriched[j];

        const sameDirection = Math.sign(p1.lsGained) === Math.sign(p2.lsGained) && p1.lsGained !== 0;
        const lsDiff = Math.abs(p1.lsGained - p2.lsGained);
        const startDiff = Math.abs(p1.startLS - p2.startLS);
        const puDiff = Math.abs(p1.puGained - p2.puGained);

        let score = 0;
        if (sameDirection) score += 100;
        score -= (lsDiff * 20);
        score += (startDiff * 2);
        score += (puDiff * 5);

        if (score > maxScore) {
          maxScore = score;
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

  const getRawlsianMessage = () => {
    if (contrastingCitizens.length < 2) return "";

    const p1 = contrastingCitizens[0];
    const p2 = contrastingCitizens[1];

    const sameDirection = Math.sign(p1.lsGained) === Math.sign(p2.lsGained) && p1.lsGained !== 0;
    const isGain = p1.lsGained > 0;
    const similarObjective = Math.abs(p1.lsGained - p2.lsGained) <= 0.5;

    if (sameDirection && similarObjective) {
      if (isGain) {
        return "Both citizens experienced a similar objective increase in their living standards. However, because one was already comfortable and the other was struggling, they value that gain completely differently.\n\nNext term, citizens will vote using their unique Societal Utility.";
      } else {
        return "Both citizens experienced a similar objective decrease in their living standards. However, because one was already comfortable and the other was struggling, they felt the pain of that loss completely differently.\n\nNext term, citizens will vote using their unique Societal Utility.";
      }
    }

    return "These citizens experienced varying objective shifts in their living standards. Notice how their subjective value (utility) does not always scale linearly with their objective gains or losses, depending on where they started on the curve.\n\nNext term, citizens will vote using their unique Societal Utility.";
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
      className="fixed inset-0 z-[9999] bg-zinc-950 text-zinc-200 flex flex-col p-6 md:p-12 overflow-y-auto"
    >
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col justify-center gap-6 mt-12">
        <div>
          <h2 className="text-pink-500 font-black uppercase tracking-widest text-sm mb-2">
            Term Concluded
          </h2>
          <h1 className="text-3xl md:text-4xl font-black text-white">
            Debrief
          </h1>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-2xl">
          <div className="flex flex-col gap-4 animate-in fade-in w-full">
            <Note label="Deputy Prime Minister" tone="pink">
              {getDpmMessage()}
            </Note>

            {currentCycle === ElectionCycle.Benthamite && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  onClick={() => { setRevealedBenthamA(true); markInteraction(); }}
                  className={`p-4 rounded-xl border transition-all relative overflow-hidden flex flex-col cursor-pointer ${revealedBenthamA ? 'border-pink-500/50 bg-pink-500/10' : 'border-zinc-800 bg-zinc-950/40 hover:border-pink-500/40 hover:bg-pink-500/5'}`}
                >
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-center mb-2">Society A</h3>
                  <div className="relative h-[200px]">
                    <div className={`w-full h-full pointer-events-none transition-opacity duration-500 ${revealedBenthamA ? 'opacity-20' : 'opacity-100'}`}>
                      <D3Chart plotType="1D" chartData={[]} histogramData={benthamGraphA} xAxisType={AxisVariable.LifeSatisfaction} yAxisType={AxisVariable.LifeSatisfaction} color="#ec4899" visualStyle='faces' yAxisMax={yAxisMax} faceCols={1} theme="dark"/>
                    </div>
                    {revealedBenthamA && <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none animate-in zoom-in duration-300"><span className="text-xs font-bold text-pink-400 uppercase tracking-widest mb-1">Average LS</span><strong className="text-5xl font-black text-pink-300">5.0</strong></div>}
                  </div>
                  <div className="mt-2 flex justify-center items-center h-8">
                    {!revealedBenthamA ? (
                      <span className="bg-zinc-900 px-4 py-1.5 rounded-full text-xs font-bold shadow-sm text-pink-400 border border-pink-500/30 animate-pulse">Calculate Average</span>
                    ) : (
                      <span className="text-[10px] font-bold text-pink-400/70 uppercase tracking-widest">Calculated</span>
                    )}
                  </div>
                </div>

                <div
                  onClick={() => { setRevealedBenthamB(true); markInteraction(); }}
                  className={`p-4 rounded-xl border transition-all relative overflow-hidden flex flex-col cursor-pointer ${revealedBenthamB ? 'border-pink-500/50 bg-pink-500/10' : 'border-zinc-800 bg-zinc-950/40 hover:border-pink-500/40 hover:bg-pink-500/5'}`}
                >
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-center mb-2">Society B</h3>
                  <div className="relative h-[200px]">
                    <div className={`w-full h-full pointer-events-none transition-opacity duration-500 ${revealedBenthamB ? 'opacity-20' : 'opacity-100'}`}>
                      <D3Chart plotType="1D" chartData={[]} histogramData={benthamGraphB} xAxisType={AxisVariable.LifeSatisfaction} yAxisType={AxisVariable.LifeSatisfaction} color="#ec4899" visualStyle='faces' yAxisMax={yAxisMax} faceCols={1} theme="dark"/>
                    </div>
                    {revealedBenthamB && <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none animate-in zoom-in duration-300"><span className="text-xs font-bold text-pink-400 uppercase tracking-widest mb-1">Average LS</span><strong className="text-5xl font-black text-pink-300">5.0</strong></div>}
                  </div>
                  <div className="mt-2 flex justify-center items-center h-8">
                    {!revealedBenthamB ? (
                      <span className="bg-zinc-900 px-4 py-1.5 rounded-full text-xs font-bold shadow-sm text-pink-400 border border-pink-500/30 animate-pulse">Calculate Average</span>
                    ) : (
                      <span className="text-[10px] font-bold text-pink-400/70 uppercase tracking-widest">Calculated</span>
                    )}
                  </div>
                </div>

                {revealedBenthamA && revealedBenthamB && (
                  <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.5, ease: 'easeOut' }} className="col-span-1 md:col-span-2 overflow-hidden">
                    <Note label="Mathematically Identical" tone="pink">
                     {'When solely considering averages, these societies appear equally successful. Maximising the average efficiently increases total wellbeing, but it completely ignores how it is distributed. If unchecked, this can lead to issues such as equality.'}
                    </Note>
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
                    <div
                      key={idx}
                      onClick={() => { setReveal(true); markInteraction(); }}
                      className={`p-4 rounded-xl border transition-all text-center relative overflow-hidden group flex flex-col justify-center min-h-[160px] flex-1 cursor-pointer ${isRevealed ? 'border-pink-500/50 bg-pink-500/10' : 'border-zinc-800 bg-zinc-950/40 hover:border-pink-500/40 hover:bg-pink-500/5'}`}
                    >
                      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">{citizen?.name}</p>
                      <div className="mb-1 flex justify-center items-center gap-2">
                        <span className="text-xs text-zinc-500">Objective Shift: </span>
                        <span className="text-sm font-bold text-zinc-500">{citizen?.startLS.toFixed(1)}</span>
                        <span className="text-zinc-600">→</span>
                        <strong className="text-lg text-zinc-200">{citizen?.endLS.toFixed(1)}</strong>
                        <span className="text-[10px] font-black bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded ml-1">
                          {citizen && citizen.lsGained > 0 ? '+' : ''}{citizen?.lsGained.toFixed(1)} LS
                        </span>
                      </div>

                      <div className={`transition-all duration-500 ${isRevealed ? 'opacity-100 transform-none' : 'opacity-0 translate-y-4 hidden'}`}>
                        <div className="w-full h-px bg-zinc-800 my-2" />
                        <span className="text-[10px] text-pink-400 font-bold uppercase tracking-widest block mb-1">Subjective Value (Utility Gained)</span>
                        <strong className="text-2xl text-pink-300">
                          {citizen && citizen.puGained > 0 ? '+' : ''}{citizen?.puGained.toFixed(2)}
                        </strong>
                      </div>

                      {!isRevealed && <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 backdrop-blur-sm transition-opacity rounded-xl"><span className="bg-zinc-900 px-4 py-2 rounded-full text-xs font-bold shadow-sm text-pink-400 border border-pink-500/30 animate-pulse">Click to Reveal</span></div>}
                    </div>
                  );
                })}

                {revealedCitizen1 && revealedCitizen2 && (
                  <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.5, ease: 'easeOut' }} className="col-span-1 md:col-span-2 overflow-hidden">
                    <Note label="Unequal Subjective Value" tone="pink">
                      {getRawlsianMessage()}
                    </Note>
                  </motion.div>
                )}
              </div>
            )}

            {currentCycle === ElectionCycle.SocietalUtility && empathyCitizen && (
              <div className="flex flex-col gap-4">
                <div
                  onClick={() => { setRevealedEmpathy(true); markInteraction(); }}
                  className={`p-5 rounded-xl border transition-all text-center relative overflow-hidden group flex flex-col justify-center min-h-[180px] cursor-pointer ${revealedEmpathy ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-950/40 hover:border-emerald-500/40 hover:bg-emerald-500/5'}`}
                >
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">{empathyCitizen.name}</p>
                  <div className="grid grid-cols-2 gap-4 mb-2">
                    <div><span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Life Satisfaction</span><strong className="text-2xl text-zinc-200">{empathyCitizen.currentLS.toFixed(1)}</strong></div>
                    <div><span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Societal Utility</span><strong className="text-2xl text-zinc-200">{WelfareMetrics.evaluateDistribution(finalPopulation.map((p: any) => p.currentLS), empathyCitizen.societalUtilities).toFixed(2)}</strong></div>
                  </div>

                  <div className={`transition-all duration-500 ${revealedEmpathy ? 'opacity-100 transform-none' : 'opacity-0 translate-y-4 hidden'}`}>
                    <div className="w-full h-px bg-zinc-800 my-2" />
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest block mb-1">Personal Utility (Self-Interest)</span>
                    <strong className="text-3xl text-emerald-300">{WelfareMetrics.getUtilityForPerson(empathyCitizen.currentLS, empathyCitizen.personalUtilities).toFixed(2)}</strong>
                    <p className="text-[11px] text-zinc-400 mt-2 max-w-sm mx-auto italic leading-relaxed">"While my evaluation of society drops due to inequality, my personal score is significantly higher when evaluating strictly for myself."</p>
                  </div>

                  {!revealedEmpathy && <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 backdrop-blur-sm transition-opacity rounded-xl"><span className="bg-zinc-900 px-5 py-2 rounded-full text-xs font-bold shadow-sm text-emerald-400 border border-emerald-500/30 animate-pulse">Reveal Personal Utility</span></div>}
                </div>

                {revealedEmpathy && (
                  <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.5, ease: 'easeOut' }} className="overflow-hidden">
                    <Note label="Moving to Self-Interest" tone="emerald">
                      {'When citizens evaluate policy strictly based on empathy, consensus is difficult because everyone has a different definition of fairness.\nFor your final term, we will incorporate Personal Utility into their voting logic, modelling pure self-interest.'}
                    </Note>
                  </motion.div>
                )}
              </div>
            )}

            {currentCycle === ElectionCycle.PersonalUtility && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                <div
                  onClick={() => { setRevealedSU(true); markInteraction(); }}
                  className={`rounded-xl border transition-all p-5 flex flex-col relative overflow-hidden cursor-pointer ${revealedSU ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-950/40 hover:border-emerald-500/40 hover:bg-emerald-500/5'}`}
                >
                  <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-400/70 mb-2 text-center">Term 3: Societal Utility</h3>
                  <div className={`transition-all duration-500 flex flex-col h-full ${revealedSU ? 'opacity-100 transform-none' : 'opacity-0 translate-y-4 hidden'}`}>
                    <div className="text-center mb-4 mt-2">
                      <span className="text-xs uppercase font-bold text-emerald-400/70 block mb-1">Average Evaluation</span>
                      <strong className="text-4xl font-black text-emerald-300">{avgSU.toFixed(2)}</strong>
                    </div>
                    <div className="flex-1 text-xs md:text-sm text-zinc-400 space-y-3 overflow-y-auto pr-1">
                      <p><strong className="text-zinc-300">The Mechanic:</strong> Citizens evaluate policy based on empathy and their ideal vision of a fair society.</p>
                      <p><strong className="text-zinc-300">The Challenge:</strong> Empathy raises the floor, but consensus is harder to reach when voters prioritise equality over aggregate wealth.</p>
                    </div>
                  </div>
                  {!revealedSU && <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 backdrop-blur-sm transition-opacity rounded-xl"><span className="bg-zinc-900 px-4 py-2 rounded-full text-xs font-bold shadow-sm text-emerald-400 border border-emerald-500/30 animate-pulse">Click to Reveal</span></div>}
                </div>

                <div
                  onClick={() => { setRevealedPU(true); markInteraction(); }}
                  className={`rounded-xl border transition-all p-5 flex flex-col relative overflow-hidden cursor-pointer ${revealedPU ? 'border-zinc-600 bg-zinc-800/60' : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-600 hover:bg-zinc-800/40'}`}
                >
                  <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-2 text-center">Term 4: Personal Utility</h3>
                  <div className={`transition-all duration-500 flex flex-col h-full ${revealedPU ? 'opacity-100 transform-none' : 'opacity-0 translate-y-4 hidden'}`}>
                    <div className="text-center mb-4 mt-2">
                      <span className="text-xs uppercase font-bold text-zinc-500 block mb-1">Average Evaluation</span>
                      <strong className="text-4xl font-black text-zinc-200">{avgPU.toFixed(2)}</strong>
                    </div>
                    <div className="flex-1 text-xs md:text-sm text-zinc-400 space-y-3 overflow-y-auto pr-1">
                      <p><strong className="text-zinc-300">The Mechanic:</strong> Citizens evaluate policy strictly based on their own risk and reward.</p>
                      <p><strong className="text-zinc-300">The Challenge:</strong> Due to loss aversion, citizens will systematically block redistribution to protect their own wealth.</p>
                    </div>
                  </div>
                  {!revealedPU && <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 backdrop-blur-sm transition-opacity rounded-xl"><span className="bg-zinc-900 px-4 py-2 rounded-full text-xs font-bold shadow-sm text-zinc-300 border border-zinc-700 animate-pulse">Click to Reveal</span></div>}
                </div>

                {revealedPU && revealedSU && (
                  <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.5, ease: 'easeOut' }} className="col-span-1 md:col-span-2 overflow-hidden">
                    <Note label="The Final Mandate" tone="zinc">
                      {'"You have seen how the same society can be judged completely differently depending on the metrics we use to measure success. You have navigated four different political philosophies.\nIt is time for your final verdict.'}
                    </Note>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={resolveAcademicDebrief}
            disabled={!ready}
            className={`px-6 py-3 rounded-lg text-sm font-bold shadow-md transition-all duration-500 ${ready ? 'bg-pink-600 text-white hover:bg-pink-700 cursor-pointer' : 'bg-zinc-800 text-zinc-500 opacity-50 cursor-not-allowed'}`}
          >
            Continue &rarr;
          </button>
        </div>
      </div>
    </motion.div>
  );
}