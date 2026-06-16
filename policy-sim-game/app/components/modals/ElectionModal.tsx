import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ElectionCycle, Respondent, AxisVariable } from '../../utils/types';
import { FRAMEWORK_RULES } from '../../utils/frameworkRules';
import { WelfareMetrics } from '../../utils/WelfareMetrics';
import D3Chart from '../D3Chart';
import { availablePolicies } from '../../data/policies';
import { ModalContent, ModalHeader, DPMMessage } from './SharedModalComponents';

interface ElectionModalProps {
  currentMetricScore: number;
  currentCycle: ElectionCycle;
  approvalRating: number;
  cycleAttempts: number;
  initialPopulation: Respondent[];
  baselinePopulation: Respondent[];
  finalPopulation: Respondent[];
  yAxisMax: number;
  onNextCycle: () => void;
  onReset: () => void;
  onFinish?: () => void;
}

const generateHistogramData = (pop: Respondent[]) => Array.from({ length: 11 }, (_, i) => ({ name: i, count: pop.filter(r => Math.round(r.currentLS) === i).length }));
const getDummyHistogram = (distribution: Record<number, number>) => Array.from({ length: 11 }, (_, i) => ({ name: i, count: distribution[i] || 0 }));

const Confetti = () => {
  const colors = ['#ec4899', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[9999] flex justify-center">
      {Array.from({ length: 100 }).map((_, i) => (
        <motion.div key={i} initial={{ y: -50, x: 0, opacity: 1, rotate: 0 }} animate={{ y: window.innerHeight + 50, x: (Math.random() - 0.5) * window.innerWidth * 0.8, opacity: [1, 1, 0], rotate: 360 + Math.random() * 720 }} transition={{ duration: 2.5 + Math.random() * 2, ease: "easeOut", delay: Math.random() * 0.4 }} className="absolute w-3 h-3" style={{ backgroundColor: colors[i % colors.length], borderRadius: i % 3 === 0 ? '50%' : '2px', top: '-20px' }} />
      ))}
    </div>
  );
}

// --- Extracted Components ---

const PageMacro = ({ initialPopulation, finalPopulation, currentCycle, yAxisMax, setPageReady }: any) => {
  const rule = FRAMEWORK_RULES[currentCycle as ElectionCycle];
  const initialHist = useMemo(() => generateHistogramData(initialPopulation), [initialPopulation]);
  const finalHist = useMemo(() => generateHistogramData(finalPopulation), [finalPopulation]);
  
  const safeYAxisMax = useMemo(() => {
    const maxInitial = Math.max(...initialHist.map((d: any) => d.count), 0);
    const maxFinal = Math.max(...finalHist.map((d: any) => d.count), 0);
    const trueMax = Math.max(maxInitial, maxFinal, yAxisMax);
    return Math.ceil(trueMax / 10) * 10;
  }, [initialHist, finalHist, yAxisMax]);

  const startMetric = useMemo(() => {
    if (!initialPopulation || initialPopulation.length === 0) return 0;
    if (currentCycle === ElectionCycle.Benthamite) return initialPopulation.reduce((s: number, p: any) => s + p.currentLS, 0) / initialPopulation.length;
    if (currentCycle === ElectionCycle.Rawlsian) return Math.min(...initialPopulation.map((p: any) => p.currentLS));
    if (currentCycle === ElectionCycle.PersonalUtility) return initialPopulation.reduce((s: number, p: any) => s + WelfareMetrics.getUtilityForPerson(p.currentLS, p.personalUtilities), 0) / initialPopulation.length;
    
    const allLS = initialPopulation.map((p: any) => p.currentLS);
    return initialPopulation.reduce((s: number, p: any) => s + WelfareMetrics.evaluateDistribution(allLS, p.societalUtilities), 0) / initialPopulation.length;
  }, [initialPopulation, currentCycle]);

  const endMetric = useMemo(() => {
    if (!finalPopulation || finalPopulation.length === 0) return 0;
    if (currentCycle === ElectionCycle.Benthamite) return finalPopulation.reduce((s: number, p: any) => s + p.currentLS, 0) / finalPopulation.length;
    if (currentCycle === ElectionCycle.Rawlsian) return Math.min(...finalPopulation.map((p: any) => p.currentLS));
    if (currentCycle === ElectionCycle.PersonalUtility) return finalPopulation.reduce((s: number, p: any) => s + WelfareMetrics.getUtilityForPerson(p.currentLS, p.personalUtilities), 0) / finalPopulation.length;
    
    const allLS = finalPopulation.map((p: any) => p.currentLS);
    return finalPopulation.reduce((s: number, p: any) => s + WelfareMetrics.evaluateDistribution(allLS, p.societalUtilities), 0) / finalPopulation.length;
  }, [finalPopulation, currentCycle]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPageReady(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, [setPageReady]);

  const markerLabel = currentCycle === ElectionCycle.Benthamite ? "Average" : 
                      currentCycle === ElectionCycle.Rawlsian ? "Baseline" : 
                      currentCycle === ElectionCycle.PersonalUtility ? "Satisfaction" : 
                      "Fairness";

  const initialMarkers = [{ value: startMetric, label: `${markerLabel}: ${startMetric.toFixed(2)}`, color: "#a1a1aa", dashed: true }];
  const finalMarkers = [{ value: endMetric, label: `${markerLabel}: ${endMetric.toFixed(2)}`, color: rule.graphColor, dashed: false }];

  const getAnalysisMessage = () => {
    const diff = endMetric - startMetric;
    const direction = diff >= 0 ? "increased" : "decreased";
    
    if (currentCycle === ElectionCycle.Benthamite) {
      return `The National Average Happiness has ${direction} from ${startMetric.toFixed(2)} to ${endMetric.toFixed(2)}. This represents a net ${diff >= 0 ? 'gain' : 'loss'} of ${Math.abs(diff).toFixed(2)} points.`;
    } else if (currentCycle === ElectionCycle.Rawlsian) {
      return `The baseline standard of living for the poorest citizens has ${direction} from ${startMetric.toFixed(2)} to ${endMetric.toFixed(2)}.`;
    } else if (currentCycle === ElectionCycle.PersonalUtility) {
      return `Average Voter Satisfaction has ${direction} from ${startMetric.toFixed(2)} to ${endMetric.toFixed(2)} based on personal financial impacts.`;
    } else {
      return `The National Fairness Index has ${direction} from ${startMetric.toFixed(2)} to ${endMetric.toFixed(2)}, reflecting shifting views on equality.`;
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in w-full">
      <DPMMessage title="Term Summary">
        {getAnalysisMessage()}
      </DPMMessage>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-5 flex flex-col w-full">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 text-center">Start</h3>
          <div className="h-[240px] md:h-[260px] w-full">
            <D3Chart plotType="1D" chartData={[]} histogramData={initialHist} xAxisType={AxisVariable.LifeSatisfaction} yAxisType={rule.yAxisType} color="#d4d4d8" visualStyle='faces' yAxisMax={safeYAxisMax} faceCols={4} markers={initialMarkers} />
          </div>
        </div>
        <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-5 flex flex-col w-full">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-800 mb-2 text-center">End</h3>
          <div className="h-[240px] md:h-[260px] w-full">
            <D3Chart plotType="1D" chartData={[]} histogramData={finalHist} xAxisType={AxisVariable.LifeSatisfaction} yAxisType={rule.yAxisType} color={rule.graphColor} visualStyle='faces' yAxisMax={safeYAxisMax} faceCols={4} markers={finalMarkers} />
          </div>
        </div>
      </div>
    </div>
  );
}

const PageVerdict = ({ approvalRating, won, setPageReady }: any) => {
  const [displayScore, setDisplayScore] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let start = 0;
    const duration = 4000;
    const delay = 1500;
    let animationFrameId: number;

    const animate = (currentTime: number) => {
      if (!start) start = currentTime;
      const elapsed = currentTime - start;

      if (elapsed < delay) {
        animationFrameId = requestAnimationFrame(animate);
        return;
      }

      const progress = Math.min((elapsed - delay) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3); 
      setDisplayScore(easeProgress * approvalRating);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setIsDone(true);
        timeoutRef.current = setTimeout(() => setPageReady(true), 2000); 
      }
    };
    
    animationFrameId = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [approvalRating, setPageReady]);

  const showSuccess = isDone && won;
  const showFailure = isDone && !won;

  return (
    <div className="flex flex-col items-center justify-center py-6 mt-8 w-full relative animate-in zoom-in duration-500">
      {showSuccess && <Confetti />}
      
      {showSuccess && <div className="absolute -top-5 bg-emerald-500 text-white py-1 px-4 rounded-full font-black uppercase tracking-widest text-[10px] shadow-lg animate-bounce z-10">Majority Secured</div>}
      
      <div className={`p-10 w-full max-w-lg min-h-[320px] flex flex-col items-center justify-center text-center rounded-3xl border-4 transition-all duration-700 transform ${showSuccess ? 'bg-emerald-50 border-emerald-200 scale-105 shadow-xl' : showFailure ? 'bg-rose-50 border-rose-200 scale-100 shadow-md' : 'bg-zinc-50 border-zinc-200 scale-100'}`}>
        
        <h1 className={`text-4xl md:text-5xl font-black mb-2 transition-colors duration-500 ${showSuccess ? 'text-emerald-700' : showFailure ? 'text-rose-700' : 'text-zinc-800'}`}>
          {showSuccess ? 'Re-Elected' : showFailure ? 'Voted Out' : 'Counting Votes...'}
        </h1>
        
        <p className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-6 transition-opacity duration-500">
          {showSuccess ? "The public has backed our vision for the country." : showFailure ? "The public feels we didn't do enough to address their concerns." : "Awaiting final tally"}
        </p>
        
        <div className="flex flex-col items-center justify-center gap-1">
          <span className="text-sm md:text-base font-black text-zinc-400 uppercase tracking-widest">Final Approval</span>
          <span className={`text-8xl font-black tabular-nums transition-colors duration-300 ${showSuccess ? 'text-emerald-600' : showFailure ? 'text-rose-600' : 'text-zinc-800'}`}>{displayScore.toFixed(1)}%</span>
          <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest mt-2">Required: 51.0%</span>
        </div>
      </div>
    </div>
  );
}

const PageCohorts = ({ finalPopulation, currentCycle, setPageReady }: any) => {
  useEffect(() => {
    setPageReady(true);
  }, [setPageReady]);

  const cohorts = useMemo(() => {
    let improvedCount = 0;
    let stableCount = 0;
    let declinedCount = 0;

    finalPopulation.forEach((p: any) => {
      const ledger = p.historicalLedger?.find((l: any) => l.cycle === currentCycle);
      if (!ledger || ledger.turns.length === 0) return;
      
      const startLS = ledger.turns[0].ls;
      const endLS = ledger.turns[ledger.turns.length - 1].ls;
      const diff = endLS - startLS;

      if (diff > 0.5) improvedCount++;
      else if (diff < -0.5) declinedCount++;
      else stableCount++;
    });

    return {
      improved: finalPopulation.length ? Math.round((improvedCount / finalPopulation.length) * 100) : 0,
      stable: finalPopulation.length ? Math.round((stableCount / finalPopulation.length) * 100) : 0,
      declined: finalPopulation.length ? Math.round((declinedCount / finalPopulation.length) * 100) : 0
    };
  }, [finalPopulation, currentCycle]);

  return (
    <div className="flex flex-col gap-4 animate-in fade-in w-full">
      <DPMMessage title="Wellbeing Mobility">
        "We've tracked the electorate based on how their overall life satisfaction shifted during your administration."
      </DPMMessage>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-2">
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-6 flex flex-col items-center text-center shadow-sm">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-xl mb-4 shadow-inner">📈</div>
          <h4 className="font-black text-emerald-900 uppercase tracking-widest text-xs mb-1">Improved</h4>
          <p className="text-4xl font-black text-emerald-600">{cohorts.improved}%</p>
        </div>

        <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-6 flex flex-col items-center text-center shadow-sm">
          <div className="w-12 h-12 bg-zinc-200 rounded-full flex items-center justify-center text-xl mb-4 shadow-inner">➖</div>
          <h4 className="font-black text-zinc-700 uppercase tracking-widest text-xs mb-1">Unchanged</h4>
          <p className="text-4xl font-black text-zinc-600">{cohorts.stable}%</p>
        </div>

        <div className="bg-rose-50 rounded-xl border border-rose-200 p-6 flex flex-col items-center text-center shadow-sm">
          <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center text-xl mb-4 shadow-inner">📉</div>
          <h4 className="font-black text-rose-900 uppercase tracking-widest text-xs mb-1">Declined</h4>
          <p className="text-4xl font-black text-rose-600">{cohorts.declined}%</p>
        </div>
      </div>
    </div>
  );
}

const PageMicro = ({ initialPopulation, baselinePopulation, finalPopulation, currentCycle, setPageReady }: any) => {
  const [hoveredPolicyId, setHoveredPolicyId] = useState<string | null>(null);

  useEffect(() => {
    setPageReady(true);
  }, [setPageReady]);

  const getVoterStory = (citizen: any, cycle: ElectionCycle, setHover: (id: string | null) => void) => {
    const cycleLedger = citizen.historicalLedger?.find((l: any) => l.cycle === cycle);
    
    if (!cycleLedger || cycleLedger.turns.length < 2) {
      return { emoji: '😐', text: <>Honestly, my life hasn't changed much at all. The politicians' arguments haven't really affected my day-to-day.</>, referencedPolicyIds: [] };
    }

    let bestPolicy = { name: '', id: null as string | null, delta: -Infinity };
    let worstPolicy = { name: '', id: null as string | null, delta: Infinity };

    for (let i = 1; i < cycleLedger.turns.length; i++) {
      const prev = cycleLedger.turns[i-1].ls;
      const curr = cycleLedger.turns[i].ls;
      const delta = curr - prev;
      const policyName = cycleLedger.turns[i].policyName || '';
      const policyId = cycleLedger.turns[i].policyId;

      if (delta > bestPolicy.delta) bestPolicy = { name: policyName, id: policyId, delta };
      if (delta < worstPolicy.delta) worstPolicy = { name: policyName, id: policyId, delta };
    }

    const totalDiff = citizen.lsDiff;
    const referencedPolicyIds: string[] = [];

    const InteractivePolicy = ({ id, name }: { id: string | null, name: string }) => {
      if (!id || !name) return null;
      if (!referencedPolicyIds.includes(id)) referencedPolicyIds.push(id);
      return (
        <span 
          className="font-bold underline decoration-pink-300 decoration-2 underline-offset-2 text-pink-700 hover:text-pink-900 transition-colors cursor-pointer"
          onMouseEnter={() => setHover(id)}
          onMouseLeave={() => setHover(null)}
        >
          {name}
        </span>
      );
    };

    if (totalDiff <= -1.5) {
      return { 
        emoji: '😡', 
        text: <>Since this government took office, things have gotten really tough. {worstPolicy.delta < -0.05 && worstPolicy.name ? <>Having the <InteractivePolicy id={worstPolicy.id} name={worstPolicy.name} /> pass made it so much harder to get by.</> : "The policies completely ignored my needs."}</>, 
        referencedPolicyIds 
      };
    }
    if (totalDiff < -0.1) {
      return { 
        emoji: '😟', 
        text: <>I'm definitely worse off than I was. {worstPolicy.delta < -0.05 && worstPolicy.name ? <>The <InteractivePolicy id={worstPolicy.id} name={worstPolicy.name} /> really didn't help matters.</> : "The agenda just didn't work for me."}</>, 
        referencedPolicyIds 
      };
    }
    if (totalDiff < 0.1) {
      if (bestPolicy.delta > 0.1 && worstPolicy.delta < -0.1 && bestPolicy.name && worstPolicy.name) {
          return { 
            emoji: '😐', 
            text: <>Honestly, I haven't noticed much difference overall. The <InteractivePolicy id={bestPolicy.id} name={bestPolicy.name} /> helped a bit, but the <InteractivePolicy id={worstPolicy.id} name={worstPolicy.name} /> set me back just as much.</>, 
            referencedPolicyIds 
          };
      }
      return { 
        emoji: '😐', 
        text: <>Honestly, my life hasn't changed much at all. The politicians' arguments haven't really affected my day-to-day.</>, 
        referencedPolicyIds 
      };
    }
    if (totalDiff < 1.5) {
      return { 
        emoji: '🙂', 
        text: <>Things are looking up a bit. {bestPolicy.delta > 0.05 && bestPolicy.name ? <>The <InteractivePolicy id={bestPolicy.id} name={bestPolicy.name} /> actually made things easier for me.</> : "The agenda seems to be heading in a good direction."}</>, 
        referencedPolicyIds 
      };
    }
    return { 
      emoji: '😄', 
      text: <>I've seen a huge difference! {bestPolicy.delta > 0.05 && bestPolicy.name ? <>The <InteractivePolicy id={bestPolicy.id} name={bestPolicy.name} /> really helped me out and turned things around.</> : "The agenda directly enhanced my quality of life."}</>, 
      referencedPolicyIds 
    };
  };

  const voxPops = useMemo(() => {
    const sorted = finalPopulation.map((p: any, i: number) => {
      const baseline = baselinePopulation.find((b: any) => b.id === p.id) || initialPopulation[i];
      return { ...p, baselineLS: baseline.currentLS, finalLS: p.currentLS, lsDiff: p.currentLS - baseline.currentLS };
    }).sort((a: any, b: any) => a.lsDiff - b.lsDiff);
    
    const a = sorted[0]; 
    const c = sorted[sorted.length - 1]; 
    let bOptions = sorted.filter((s: any) => s.id !== a.id && s.id !== c.id);
    let b = bOptions.find((s: any) => Math.abs(s.lsDiff - a.lsDiff) > 0.02 && Math.abs(s.lsDiff - c.lsDiff) > 0.02 && Math.abs(s.lsDiff) < 0.2);
    if (!b) b = bOptions.sort((x: any, y: any) => Math.abs(x.lsDiff) - Math.abs(y.lsDiff))[0];

    return [a, b, c];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalPopulation, initialPopulation, baselinePopulation, currentCycle]);

  const referencedPolicyIds = useMemo(() => {
    const ids = new Set<string>();
    voxPops.forEach(vp => {
      const story = getVoterStory(vp, currentCycle, () => {});
      story.referencedPolicyIds.forEach(id => ids.add(id));
    });
    return Array.from(ids);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voxPops, currentCycle]);

  return (
    <div className="flex gap-6 w-full animate-in fade-in h-full">
      <div className="flex-1 flex flex-col gap-4 min-w-[500px]">
        <DPMMessage title="Voter Sentiment">
          We've tracked how your policies impacted individual voters. Hover over the policy names below to review the enacted legislation.
        </DPMMessage>
        
        <div className="flex flex-col gap-3 w-full">
          {voxPops.map((vp, idx) => {
            const story = getVoterStory(vp, currentCycle, setHoveredPolicyId);
            return (
              <div key={idx} className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 flex flex-col sm:flex-row gap-4 items-center w-full shadow-sm">
                <div className="flex flex-col items-center justify-center bg-white border border-zinc-200 rounded-full w-14 h-14 shrink-0 shadow-sm">
                  <span className="text-2xl">{story.emoji}</span>
                </div>
                
                <div className="flex-1 w-full min-w-0">
                  <div className="flex items-center justify-between mb-2 w-full">
                    <h4 className="font-bold text-zinc-900 text-base truncate pr-2">{vp.name}</h4>
                    
                    <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-md border border-zinc-200 shadow-sm shrink-0">
                      <span className="text-xs font-bold text-zinc-500">{vp.baselineLS.toFixed(1)}</span>
                      <span className="text-xs text-zinc-300 font-black">→</span>
                      <span className={`text-xs font-black ${vp.lsDiff > 0 ? 'text-emerald-600' : vp.lsDiff < 0 ? 'text-rose-600' : 'text-zinc-600'}`}>
                        {vp.finalLS.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-600 italic leading-snug">"{story.text}"</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="w-[320px] shrink-0 border-l border-zinc-200 pl-6 flex flex-col">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">Referenced Legislation</h4>
        <div className="flex flex-col gap-3 overflow-y-auto pr-2">
          {referencedPolicyIds.map(id => {
            const policy = availablePolicies.find(p => p.id === id);
            if (!policy) return null;
            const isHovered = hoveredPolicyId === id;
            
            return (
              <div 
                key={id} 
                className={`p-4 rounded-xl border transition-all duration-300 ${isHovered ? 'bg-pink-50 border-pink-400 shadow-md scale-[1.02]' : 'bg-white border-zinc-200 shadow-sm opacity-80'}`}
              >
                <span className="text-[9px] font-bold uppercase tracking-widest text-pink-500 block mb-1">Enacted</span>
                <p className="font-bold text-sm text-zinc-900 mb-1.5">{policy.policyName}</p>
                <p className="text-xs text-zinc-600 leading-relaxed line-clamp-3">{policy.description}</p>
              </div>
            );
          })}
          {referencedPolicyIds.length === 0 && (
            <div className="p-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-center">
              <span className="text-xs font-bold text-zinc-400">No specific policies referenced by these citizens.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const PageDebrief = ({ currentCycle, finalPopulation, setPageReady }: any) => {
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
      setPageReady(true);
    }
  }, [revealedBenthamA, revealedBenthamB, revealedCitizen1, revealedCitizen2, revealedEmpathy, currentCycle, setPageReady]);

  const benthamGraphA = useMemo(() => getDummyHistogram({ 5: 100 }), []);
  const benthamGraphB = useMemo(() => getDummyHistogram({ 0: 50, 10: 50 }), []);

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
            <div className={`h-[200px] pointer-events-none transition-opacity duration-500 ${revealedBenthamA ? 'opacity-20' : 'opacity-100'}`}><D3Chart plotType="1D" chartData={[]} histogramData={benthamGraphA} xAxisType={AxisVariable.LifeSatisfaction} yAxisType={AxisVariable.LifeSatisfaction} color="#d4d4d8" visualStyle='faces' yAxisMax={120} faceCols={1}/></div>
            {!revealedBenthamA && <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity"><span className="bg-white px-4 py-2 rounded-full text-xs font-bold shadow-sm text-pink-600">Calculate Average</span></div>}
            {revealedBenthamA && <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none animate-in zoom-in duration-300"><span className="text-xs font-bold text-pink-600 uppercase tracking-widest mb-1">Average LS</span><strong className="text-5xl font-black text-pink-700">5.0</strong></div>}
          </div>
          
          <div onClick={() => setRevealedBenthamB(true)} className={`p-4 rounded-xl border-2 transition-all relative overflow-hidden flex flex-col cursor-pointer ${revealedBenthamB ? 'border-pink-300 bg-pink-50' : 'border-zinc-200 bg-zinc-50 hover:border-pink-300 hover:bg-pink-50/50'}`}>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-center mb-2">Society B</h3>
            <div className={`h-[200px] pointer-events-none transition-opacity duration-500 ${revealedBenthamB ? 'opacity-20' : 'opacity-100'}`}><D3Chart plotType="1D" chartData={[]} histogramData={benthamGraphB} xAxisType={AxisVariable.LifeSatisfaction} yAxisType={AxisVariable.LifeSatisfaction} color="#d4d4d8" visualStyle='faces' yAxisMax={120} faceCols={1}/></div>
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

// --- Main Modal Component ---

export default function ElectionModal({ 
  currentMetricScore, currentCycle, approvalRating, cycleAttempts, 
  initialPopulation, baselinePopulation, finalPopulation, yAxisMax, onNextCycle, onReset, onFinish 
}: ElectionModalProps) {
  const [page, setPage] = useState(0);
  const [pageReady, setPageReady] = useState(false);
  
  const rule = FRAMEWORK_RULES[currentCycle];
  const won = approvalRating >= 51.0;
  const isFinalCycle = currentCycle === ElectionCycle.SocietalUtility;
  
  let canProceed = true;
  if (!won && cycleAttempts < 3) canProceed = false;

  const totalPages = canProceed ? 5 : 4;

  const getModalTitle = () => {
    if (page === 0) return "Term Summary";
    if (page === 1) return "Election Verdict";
    if (page === 2) return "Demographic Shifts";
    if (page === 3) return "Electorate Feedback";
    if (page === 4) return "Academic Debrief";
    return "Election Sequence";
  };

  const getModalWidth = () => {
    if (page === 0) return "max-w-3xl"; 
    if (page === 1) return "max-w-xl";  
    if (page === 2) return "max-w-3xl"; 
    if (page === 3) return "max-w-5xl"; // Dynamically expands to fit the right-hand policy sidebar
    if (page === 4) return "max-w-3xl"; 
    return "max-w-3xl";
  };

  return (
      <ModalContent maxWidth={getModalWidth()}>
        <ModalHeader title={getModalTitle()} subtitle={rule.frameworkTitle} />
        
        <motion.div className="flex-1 min-h-[450px] flex flex-col justify-center">
          {page === 0 && <PageMacro initialPopulation={initialPopulation} finalPopulation={finalPopulation} currentCycle={currentCycle} yAxisMax={yAxisMax} setPageReady={setPageReady} />}
          {page === 1 && <PageVerdict approvalRating={approvalRating} won={won} setPageReady={setPageReady} />}
          {page === 2 && <PageCohorts finalPopulation={finalPopulation} currentCycle={currentCycle} setPageReady={setPageReady} />}
          {page === 3 && <PageMicro initialPopulation={initialPopulation} baselinePopulation={baselinePopulation} finalPopulation={finalPopulation} currentCycle={currentCycle} setPageReady={setPageReady} />}
          {page === 4 && <PageDebrief currentCycle={currentCycle} finalPopulation={finalPopulation} setPageReady={setPageReady} />}
        </motion.div>

      <div className="flex justify-between items-center mt-4 pt-3 border-t border-zinc-100 shrink-0 h-12">
        {page > 0 ? (
          <button 
            onClick={() => { setPageReady(false); setPage(p => p - 1); }} 
            className="px-4 py-2 text-sm font-bold text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
          >
            &larr; Back
          </button>
        ) : <div />}

        {page < totalPages - 1 ? (
          <button 
            onClick={() => { setPageReady(false); setPage(p => p + 1); }} 
            disabled={!pageReady}
            className={`px-6 py-3 rounded-lg text-sm font-bold shadow-md transition-all duration-500 ${pageReady ? 'bg-zinc-900 text-white hover:bg-black opacity-100 cursor-pointer' : 'bg-zinc-200 text-zinc-400 opacity-50 cursor-not-allowed'}`}
          >
            {page === 0 ? "Continue to Verdict \u2192" : page === 1 ? "View Demographic Shifts \u2192" : page === 2 ? "Electorate Feedback \u2192" : "Academic Debrief \u2192"}
          </button>
        ) : (
          <div className="flex gap-3 animate-in fade-in slide-in-from-right-4">
            {!canProceed ? (
              <button onClick={onReset} className="px-6 py-2.5 bg-rose-600 text-white rounded-lg text-sm font-bold hover:bg-rose-700 shadow-md cursor-pointer">Mandate Failed - Restart Term</button>
            ) : (
              <>
                <button onClick={onReset} className="px-4 py-2.5 bg-zinc-100 text-zinc-700 rounded-lg text-sm font-bold hover:bg-zinc-200 transition-colors cursor-pointer">Restart Cycle</button>
                
                {!isFinalCycle && (
                  <button 
                    onClick={onNextCycle} 
                    disabled={!pageReady}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all ${pageReady ? 'bg-pink-600 text-white hover:bg-pink-700 cursor-pointer' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed opacity-50'}`}
                  >
                    Proceed to Next Term
                  </button>
                )}
                
                {isFinalCycle && onFinish && (
                  <button 
                    onClick={onFinish} 
                    disabled={!pageReady}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all ${pageReady ? 'bg-pink-600 text-white hover:bg-pink-700 cursor-pointer' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed opacity-50'}`}
                  >
                    Finish Game
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </ModalContent>
  );
}