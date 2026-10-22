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

/** One clear question with answer buttons; after a guess, says right / not quite. */
const GuessQuestion = ({
  question, options, correct, guess, onGuess, rightText, wrongText,
}: {
  question: string;
  options: { value: string; label: string }[];
  correct: string;
  guess: string | null;
  onGuess: (value: string, correct: boolean) => void;
  rightText: string;
  wrongText: string;
}) => (
  <div className="rounded-xl border border-pink-500/30 bg-zinc-950/60 p-4 flex flex-col gap-3">
    <p className="text-base font-bold text-white">{question}</p>
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const chosen = guess === o.value;
        const isRight = o.value === correct;
        const cls = !guess
          ? 'bg-zinc-800 border-zinc-600 text-white hover:bg-pink-600 hover:border-pink-500 cursor-pointer'
          : isRight
            ? 'bg-emerald-600/20 border-emerald-500 text-emerald-200'
            : chosen
              ? 'bg-red-600/20 border-red-500 text-red-200'
              : 'bg-zinc-900 border-zinc-800 text-zinc-500';
        return (
          <button key={o.value} type="button" disabled={!!guess} onClick={() => onGuess(o.value, isRight)} className={`px-4 py-2 rounded-lg border text-sm font-bold transition-colors ${cls}`}>
            {o.label}
          </button>
        );
      })}
    </div>
    {guess && <p className={`text-sm font-bold ${guess === correct ? 'text-emerald-400' : 'text-amber-300'}`}>{guess === correct ? rightText : wrongText}</p>}
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
  const readyAt = useRef<number | null>(null);
  const markInteraction = (item: string) => {
    const now = Date.now();
    track('academic_debrief_revealed', { cycle: ElectionCycle[currentCycle], item, ms_since_open: now - openedAt.current });
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
      readyAt.current = now;
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

  // Level 2 debrief: two REAL citizens from the population, one at LS 4 and one
  // at LS 8, each given the same +1 (4→5, 8→9). What that +1 is worth to each
  // comes from their own personal-utility curve. Picks the most typical pair
  // that shows the point (the +1 at 4 worth more than the +1 at 8).
  const examplePair = useMemo(() => {
    if (finalPopulation.length === 0) return null;
    // On the same 0–1 scale as the Level 3 utility curve (each person's
    // utility from LS 2 to LS 10 = 0 to 1).
    const u = (p: any, ls: number) => WelfareMetrics.getUtilityForPerson(ls, p.personalUtilities);
    const gainAt = (p: any, from: number) => {
      const range = u(p, 10) - u(p, 2);
      return range > 1e-9 ? (u(p, from + 1) - u(p, from)) / range : 0;
    };
    const near = (from: number) => {
      const exact = finalPopulation.filter((p: any) => Math.round(p.currentLS) === from);
      return exact.length > 0 ? exact : finalPopulation;
    };
    // Each group sorted by what the +1 is worth; the middle one = a typical citizen.
    const byGain = (list: any[], from: number) => list.map((p) => ({ p, gain: gainAt(p, from) })).sort((x, y) => x.gain - y.gain);
    const low = byGain(near(4), 4);
    const high = byGain(near(8), 8);
    if (low.length === 0 || high.length === 0) return null;
    let a = low[Math.floor(low.length / 2)];
    let b = high[Math.floor(high.length / 2)];
    if (a.p.id === b.p.id || !(a.gain > b.gain)) {
      // Fall back to the clearest pair available.
      a = low[low.length - 1];
      b = high.find((h) => h.p.id !== a.p.id && h.gain < a.gain) ?? high[0];
    }
    return { low: { name: a.p.name as string, from: 4, gain: a.gain }, high: { name: b.p.name as string, from: 8, gain: b.gain } };
  }, [finalPopulation]);

  // Guess-then-reveal (Levels 1 and 2): one clear question instead of
  // "click each box". The guess is tracked.
  const [guess, setGuess] = useState<string | null>(null);
  const makeGuess = (value: string, correct: boolean) => {
    if (guess) return;
    setGuess(value);
    track('academic_debrief_guess', { cycle: ElectionCycle[currentCycle], guess: value, correct });
    markInteraction('guess');
    if (currentCycle === ElectionCycle.Benthamite) {
      setRevealedBenthamA(true);
      setRevealedBenthamB(true);
    } else {
      setRevealedCitizen1(true);
      setRevealedCitizen2(true);
    }
  };

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
      case ElectionCycle.Benthamite: return "We hit our happiness targets, but relying purely on averages can mask real suffering.\nLook at the two societies below and answer the question underneath.";
      case ElectionCycle.Rawlsian: return "We protected the vulnerable, but at a cost: only the worst-off counted, so even large gains for everyone else were worth nothing to our score.\nHere are two real citizens from our population. Imagine each one gains exactly one point. Whose gain would matter more to them?";
      case ElectionCycle.SocietalUtility: return "This term, citizens judged the country as they would when responsible for others.\nNext, each citizen will judge only by how they value their own life.";
      case ElectionCycle.PersonalUtility: return "You governed the same policies under two lenses.\nLet's compare how your performance is judged when citizens decide for others versus for themselves.";
    }
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
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[{ label: 'Society A', data: benthamGraphA }, { label: 'Society B', data: benthamGraphB }].map((soc) => (
                    <div key={soc.label} className={`p-4 rounded-xl border flex flex-col ${guess ? 'border-pink-500/50 bg-pink-500/10' : 'border-zinc-800 bg-zinc-950/40'}`}>
                      <h3 className="text-sm font-black text-zinc-200 uppercase tracking-widest text-center mb-2">{soc.label}</h3>
                      <div className="relative h-[200px]">
                        <div className={`w-full h-full pointer-events-none transition-opacity duration-500 ${guess ? 'opacity-20' : 'opacity-100'}`}>
                          <D3Chart plotType="1D" chartData={[]} histogramData={soc.data} xAxisType={AxisVariable.LifeSatisfaction} yAxisType={AxisVariable.LifeSatisfaction} color="#ec4899" visualStyle='faces' yAxisMax={yAxisMax} faceCols={1} theme="dark"/>
                        </div>
                        {guess && <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none animate-in zoom-in duration-300"><span className="text-xs font-bold text-pink-400 uppercase tracking-widest mb-1">Average LS</span><strong className="text-5xl font-black text-pink-300">5.0</strong></div>}
                      </div>
                    </div>
                  ))}
                </div>

                <GuessQuestion
                  question="Which society has the higher average life satisfaction?"
                  options={[{ value: 'A', label: 'Society A' }, { value: 'B', label: 'Society B' }, { value: 'same', label: 'They’re the same' }]}
                  correct="same"
                  guess={guess}
                  onGuess={makeGuess}
                  rightText="Right – both average exactly 5.0."
                  wrongText="Not quite – both average exactly 5.0."
                />

                {guess && (
                  <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.5, ease: 'easeOut' }} className="overflow-hidden">
                    <Note label="Mathematically Identical" tone="pink">
                      {'When solely considering averages, these societies appear equally successful. Maximising the average efficiently increases total wellbeing, but it ignores how that wellbeing is shared. The cost: a policy that makes the worst-off worse off can still win, as long as the better-off gain enough.'}
                    </Note>
                  </motion.div>
                )}
              </div>
            )}

            {currentCycle === ElectionCycle.Rawlsian && examplePair && (() => {
              const { low, high } = examplePair;
              const ratio = high.gain > 0 ? low.gain / high.gain : null;
              const maxGain = Math.max(low.gain, high.gain, 1e-6);
              const cards = [low, high];
              return (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cards.map((c) => (
                      <div key={c.name} className={`p-5 rounded-xl border flex flex-col gap-2 ${guess ? 'border-pink-500/50 bg-pink-500/10' : 'border-zinc-800 bg-zinc-950/40'}`}>
                        <p className="text-sm font-black uppercase tracking-widest text-zinc-200">{c.name}</p>
                        <p className="text-zinc-300">
                          Life satisfaction <strong className="text-white text-lg">{c.from}</strong> → <strong className="text-white text-lg">{c.from + 1}</strong>
                          <span className="ml-2 text-xs font-black bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded">+1</span>
                        </p>
                        {guess && (
                          <div className="flex flex-col gap-1 animate-in fade-in duration-500">
                            <span className="text-xs text-pink-300 font-bold uppercase tracking-widest">What this +1 is worth to them</span>
                            <div className="h-4 w-full rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden">
                              <motion.div className="h-full bg-pink-500" initial={{ width: 0 }} animate={{ width: `${(c.gain / maxGain) * 100}%` }} transition={{ duration: 0.8 }} />
                            </div>
                            <strong className="text-xl text-pink-200">+{c.gain.toFixed(2)} utility</strong>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <GuessQuestion
                    question={`Each gets exactly the same +1. Whose +1 is worth more to them?`}
                    options={[{ value: 'low', label: `${low.name}'s (4 → 5)` }, { value: 'high', label: `${high.name}'s (8 → 9)` }, { value: 'same', label: 'The same' }]}
                    correct="low"
                    guess={guess}
                    onGuess={makeGuess}
                    rightText={`Right – ${low.name}'s +1 is worth more.`}
                    wrongText={`Not quite – ${low.name}'s +1 is worth more.`}
                  />

                  {guess && (
                    <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.5, ease: 'easeOut' }} className="overflow-hidden">
                      <Note label="Unequal Subjective Value" tone="pink">
                        {`Both gain exactly one point. But ${low.name} starts lower, so that point was worth ${ratio && ratio >= 1.2 ? `about ${ratio.toFixed(1)} times as much to them` : 'more to them'} as the same point was to ${high.name}. This term's Rawlsian score would have counted neither gain unless they were the worst-off citizen.\n\nLevel 1 counted every point the same. Level 2 counted only the worst-off. Most people's intuitions sit somewhere between these two.`}
                      </Note>
                    </motion.div>
                  )}
                </div>
              );
            })()}

            {currentCycle === ElectionCycle.SocietalUtility && empathyCitizen && (
              <div className="flex flex-col gap-4">
                <div
                  onClick={() => { setRevealedEmpathy(true); markInteraction('empathy'); }}
                  className={`p-5 rounded-xl border transition-all text-center relative overflow-hidden group flex flex-col justify-center min-h-[180px] cursor-pointer ${revealedEmpathy ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-950/40 hover:border-emerald-500/40 hover:bg-emerald-500/5'}`}
                >
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">{empathyCitizen.name}</p>
                  <div className="grid grid-cols-2 gap-4 mb-2">
                    <div><span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Life Satisfaction</span><strong className="text-2xl text-zinc-200">{empathyCitizen.currentLS.toFixed(1)}</strong></div>
                    <div><span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Societal Utility</span><strong className="text-2xl text-zinc-200">{WelfareMetrics.evaluateDistribution(finalPopulation.map((p: any) => p.currentLS), empathyCitizen.societalUtilities).toFixed(2)}</strong></div>
                  </div>

                  <div className={`transition-all duration-500 ${revealedEmpathy ? 'opacity-100 transform-none' : 'opacity-0 translate-y-4 hidden'}`}>
                    <div className="w-full h-px bg-zinc-800 my-2" />
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest block mb-1">Personal Utility (Own Life)</span>
                    <strong className="text-3xl text-emerald-300">{WelfareMetrics.getUtilityForPerson(empathyCitizen.currentLS, empathyCitizen.personalUtilities).toFixed(2)}</strong>
                    <p className="text-[11px] text-zinc-400 mt-2 max-w-sm mx-auto italic leading-relaxed">"Deciding for everyone, I weigh the worst-off heavily. Deciding only for my own life, I value things differently."</p>
                  </div>

                  {!revealedEmpathy && <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 backdrop-blur-sm transition-opacity rounded-xl"><span className="bg-zinc-900 px-5 py-2 rounded-full text-xs font-bold shadow-sm text-emerald-400 border border-emerald-500/30 animate-pulse">Reveal Personal Utility</span></div>}
                </div>

                {revealedEmpathy && (
                  <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.5, ease: 'easeOut' }} className="overflow-hidden">
                    <Note label="Moving to Personal Utility" tone="emerald">
                                            {'Social utility reflects what people endorse when they are responsible for others: it gives the worst-off a lot of extra weight.\nFor your final term, citizens will judge by personal utility instead. It respects the choices people make for their own lives.'}
                    </Note>
                  </motion.div>
                )}
              </div>
            )}

            {currentCycle === ElectionCycle.PersonalUtility && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                <div
                  onClick={() => { setRevealedSU(true); markInteraction('societal_utility'); }}
                  className={`rounded-xl border transition-all p-5 flex flex-col relative overflow-hidden cursor-pointer ${revealedSU ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-950/40 hover:border-emerald-500/40 hover:bg-emerald-500/5'}`}
                >
                  <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-400/70 mb-2 text-center">Term 3: Societal Utility</h3>
                  <div className={`transition-all duration-500 flex flex-col h-full ${revealedSU ? 'opacity-100 transform-none' : 'opacity-0 translate-y-4 hidden'}`}>
                    <div className="text-center mb-4 mt-2">
                      <span className="text-xs uppercase font-bold text-emerald-400/70 block mb-1">Average Evaluation</span>
                      <strong className="text-4xl font-black text-emerald-300">{avgSU.toFixed(2)}</strong>
                    </div>
                    <div className="flex-1 text-xs md:text-sm text-zinc-400 space-y-3 overflow-y-auto pr-1">
                      <p><strong className="text-zinc-300">The Mechanic:</strong> Citizens judge the country as they would when responsible for others.</p>
                      <p><strong className="text-zinc-300">The Case For It:</strong> It reflects what people endorse for others, so the worst-off get a lot of extra weight.</p>
                    </div>
                  </div>
                  {!revealedSU && <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 backdrop-blur-sm transition-opacity rounded-xl"><span className="bg-zinc-900 px-4 py-2 rounded-full text-xs font-bold shadow-sm text-emerald-400 border border-emerald-500/30 animate-pulse">Click to Reveal</span></div>}
                </div>

                <div
                  onClick={() => { setRevealedPU(true); markInteraction('personal_utility'); }}
                  className={`rounded-xl border transition-all p-5 flex flex-col relative overflow-hidden cursor-pointer ${revealedPU ? 'border-zinc-600 bg-zinc-800/60' : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-600 hover:bg-zinc-800/40'}`}
                >
                  <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-2 text-center">Term 4: Personal Utility</h3>
                  <div className={`transition-all duration-500 flex flex-col h-full ${revealedPU ? 'opacity-100 transform-none' : 'opacity-0 translate-y-4 hidden'}`}>
                    <div className="text-center mb-4 mt-2">
                      <span className="text-xs uppercase font-bold text-zinc-500 block mb-1">Average Evaluation</span>
                      <strong className="text-4xl font-black text-zinc-200">{avgPU.toFixed(2)}</strong>
                    </div>
                    <div className="flex-1 text-xs md:text-sm text-zinc-400 space-y-3 overflow-y-auto pr-1">
                      <p><strong className="text-zinc-300">The Mechanic:</strong> Citizens judge only by how they value their own life.</p>
                      <p><strong className="text-zinc-300">The Case For It:</strong> It respects the choices people make for their own lives, so the worst-off get less extra weight.</p>
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
            onClick={() => {
              const now = Date.now();
              track('academic_debrief_continue_clicked', {
                cycle: ElectionCycle[currentCycle],
                dwell_ms: now - openedAt.current,
                ms_after_unlock: readyAt.current ? now - readyAt.current : null,
                ms_after_last_reveal: lastInteractionAt.current ? now - lastInteractionAt.current : null,
              });
              resolveAcademicDebrief();
            }}
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