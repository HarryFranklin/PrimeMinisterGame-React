import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as d3 from 'd3';
import { useGame } from '../../context/GameStateContext';
import { track } from '../../client/telemetry';

// --- STEP 1: D3 CURVE COMPONENT ---
const AnimatedUtilityCurve = ({ onAnimationComplete }: { onAnimationComplete: () => void }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || !svgRef.current) return;

    const W = containerRef.current.clientWidth;
    const H = 320;
    const margin = { top: 30, right: 30, bottom: 50, left: 85 };
    const width = W - margin.left - margin.right;
    const height = H - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr('width', W)
      .attr('height', H);

    svg.selectAll('*').remove();

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear().domain([2, 10]).range([0, width]);
    const yScale = d3.scaleLinear().domain([0, 10]).range([height, 0]);

    const xAxis = g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(8));

    const yAxis = g.append('g')
      .call(d3.axisLeft(yScale).ticks(5));

    [xAxis, yAxis].forEach(axis => {
      axis.select('.domain').attr('stroke', '#52525b').attr('stroke-width', 2);
      axis.selectAll('.tick line').attr('stroke', '#52525b');
      axis.selectAll('text').attr('fill', '#a1a1aa').style('font-size', '12px').style('font-weight', 'bold');
    });

    g.append('text')
      .attr('x', width / 2)
      .attr('y', height + 40)
      .attr('fill', '#d4d4d8')
      .style('text-anchor', 'middle')
      .style('font-weight', 'bold')
      .text('Life Satisfaction (Objective)');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -60)
      .attr('fill', '#d4d4d8')
      .style('text-anchor', 'middle')
      .style('font-weight', 'bold')
      .text('Utility Value (Subjective)');

    const data = [
      { x: 2, y: 0 },
      { x: 3, y: 2.5 },
      { x: 4, y: 5 },
      { x: 5, y: 7.5 },
      { x: 6, y: 8.8 },
      { x: 7, y: 9.5 },
      { x: 8, y: 9.8 },
      { x: 9, y: 9.9 },
      { x: 10, y: 10 }
    ];

    const line = d3.line<{x: number, y: number}>()
      .x(d => xScale(d.x))
      .y(d => yScale(d.y))
      .curve(d3.curveMonotoneX);

    const path = g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#ec4899')
      .attr('stroke-width', 4)
      .attr('d', line);

    const pathLength = path.node()?.getTotalLength() || 0;

    path
      .attr('stroke-dasharray', pathLength)
      .attr('stroke-dashoffset', pathLength)
      .transition()
      .duration(1500)
      .ease(d3.easeCubicOut)
      .attr('stroke-dashoffset', 0);

    const plotPoints = [
      { ls: 6, u: 8.8, color: '#ffffff', label: 'Start (LS 6)', delay: 1500 },
      { ls: 8, u: 9.8, color: '#34d399', label: '+2 LS Win', delay: 2500 },
      { ls: 4, u: 5.0, color: '#fb7185', label: '-2 LS Loss', delay: 3500 },
    ];

    plotPoints.forEach((pt) => {
      g.append('line')
        .attr('x1', xScale(pt.ls)).attr('x2', xScale(pt.ls))
        .attr('y1', height).attr('y2', yScale(pt.u))
        .attr('stroke', pt.color).attr('stroke-dasharray', '4,4').attr('stroke-width', 1.5)
        .style('opacity', 0)
        .transition().delay(pt.delay).duration(500).style('opacity', 0.5);

      g.append('line')
        .attr('x1', 0).attr('x2', xScale(pt.ls))
        .attr('y1', yScale(pt.u)).attr('y2', yScale(pt.u))
        .attr('stroke', pt.color).attr('stroke-dasharray', '4,4').attr('stroke-width', 1.5)
        .style('opacity', 0)
        .transition().delay(pt.delay).duration(500).style('opacity', 0.5);

      g.append('circle')
        .attr('cx', xScale(pt.ls))
        .attr('cy', yScale(pt.u))
        .attr('r', 6)
        .attr('fill', '#18181b')
        .attr('stroke', pt.color)
        .attr('stroke-width', 3)
        .style('opacity', 0)
        .transition().delay(pt.delay).duration(500).style('opacity', 1);

      g.append('text')
        .attr('x', xScale(pt.ls) + 10)
        .attr('y', yScale(pt.u) + 5)
        .attr('fill', pt.color)
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .text(pt.label)
        .style('opacity', 0)
        .transition().delay(pt.delay).duration(500).style('opacity', 1);
    });

    g.append('path')
      .attr('d', `M -10 ${yScale(8.8)} Q -25 ${yScale(9.3)} -10 ${yScale(9.8)}`)
      .attr('fill', 'none').attr('stroke', '#34d399').attr('stroke-width', 2)
      .style('opacity', 0).transition().delay(3000).duration(500).style('opacity', 1);

    g.append('text')
      .attr('x', -30).attr('y', yScale(9.3)).attr('fill', '#34d399')
      .style('font-size', '11px').style('font-weight', 'black').style('text-anchor', 'end').attr('alignment-baseline', 'middle')
      .text('+1.0 U')
      .style('opacity', 0).transition().delay(3000).duration(500).style('opacity', 1);

    g.append('path')
      .attr('d', `M -10 ${yScale(8.8)} Q -35 ${yScale(6.9)} -10 ${yScale(5)}`)
      .attr('fill', 'none').attr('stroke', '#fb7185').attr('stroke-width', 2)
      .style('opacity', 0).transition().delay(4000).duration(500).style('opacity', 1);

    g.append('text')
      .attr('x', -40).attr('y', yScale(6.9)).attr('fill', '#fb7185')
      .style('font-size', '11px').style('font-weight', 'black').style('text-anchor', 'end').attr('alignment-baseline', 'middle')
      .text('-3.8 U')
      .style('opacity', 0).transition().delay(4000).duration(500).style('opacity', 1);

    const animTimer = setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true;
        onAnimationComplete();
      }
    }, 4600);

    return () => clearTimeout(animTimer);
  }, []);

  return <div ref={containerRef} className="w-full h-full"><svg ref={svgRef}></svg></div>;
};

// --- STEP 2: DYNAMIC CITIZEN CARD & DIFF BAR ---
const CitizenCard = ({
  name, title, ls, u, prevLs, prevU, showDiff
}: {
  name: string; title: string; ls: number; u: number; prevLs: number; prevU: number; showDiff: boolean;
}) => {
  const lsDiff = ls - prevLs;
  const uDiff = u - prevU;

  // Reusable function to render the stacked bar with contextual animations
  const renderBar = (current: number, prev: number, diff: number, isUtility: boolean) => {
    const isGain = diff > 0;
    const color1 = isGain ? '#34d399' : '#fb7185';
    const color2 = isGain ? '#059669' : '#e11d48';
    
    const bgImage = `repeating-linear-gradient(45deg, ${color1}, ${color1} 6px, ${color2} 6px, ${color2} 12px)`;
    const baseClass = isUtility ? 'bg-pink-500' : 'bg-zinc-300';
    
    const delay = isUtility ? 0.2 : 0;
    // Slower animation duration for losses to make it clearer to the user
    const animDuration = (showDiff && !isGain) ? 2.5 : 0.8;

    return (
      <div className="h-4 bg-zinc-900 rounded-full relative border border-zinc-700 w-full overflow-hidden shadow-inner">
        
        {/* Stripe Layer (Bottom) */}
        {showDiff && diff !== 0 && (
          <motion.div
            className="absolute top-0 left-0 bottom-0 rounded-full"
            style={{ backgroundImage: bgImage }}
            initial={{ 
              width: `${(prev / 10) * 100}%`, 
              opacity: isGain ? 0 : 1 
            }}
            animate={
              isGain 
                // For a gain, animate the width outwards
                ? { width: `${(current / 10) * 100}%`, opacity: 1 }
                // For a loss, keep width at prev, but pulse the opacity after the base bar has shrunk
                : { width: `${(prev / 10) * 100}%`, opacity: [1, 0.3, 1] }
            }
            transition={
              isGain
                ? { duration: animDuration, ease: "easeOut", delay }
                : {
                    opacity: {
                      repeat: Infinity,
                      duration: 2, // Slow 2 second pulse
                      ease: "easeInOut",
                      delay: animDuration + delay // Wait until the base bar finishes revealing it
                    }
                  }
            }
          />
        )}
        
        {/* Base Solid Layer (Top) */}
        <motion.div
          className={`absolute top-0 left-0 bottom-0 rounded-full ${baseClass} shadow-[2px_0_4px_rgba(0,0,0,0.3)]`}
          initial={{ width: `${(prev / 10) * 100}%` }}
          animate={{ 
            width: (showDiff && isGain) ? `${(prev / 10) * 100}%` : `${(current / 10) * 100}%` 
          }}
          transition={{ duration: animDuration, ease: "easeOut", delay }}
        />
      </div>
    );
  };

  return (
    <div className="bg-zinc-800 border border-zinc-700 p-5 rounded-2xl flex flex-col gap-4">
      <div>
        <h3 className="text-zinc-400 font-bold uppercase tracking-widest text-xs mb-1">{title}</h3>
        <p className="text-white font-black text-2xl">{name}</p>
      </div>

      <div>
        <div className="flex justify-between items-end mb-1">
          <span className="text-sm font-bold text-zinc-300">Life Satisfaction</span>
          <div className="flex items-center gap-2">
            {showDiff && (
              <span className={`text-sm font-black ${lsDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {lsDiff >= 0 ? '+' : ''}{lsDiff.toFixed(1)}
              </span>
            )}
            <span className="text-xl font-black text-white">{ls.toFixed(1)} <span className="text-zinc-500 font-medium text-sm">/ 10</span></span>
          </div>
        </div>
        {renderBar(ls, prevLs, lsDiff, false)}
      </div>

      <div>
        <div className="flex justify-between items-end mb-1">
          <span className="text-sm font-bold text-pink-300">Utility (Subjective Value)</span>
          <div className="flex items-center gap-2">
            {showDiff && (
              <span className={`text-sm font-black ${uDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {uDiff >= 0 ? '+' : ''}{uDiff.toFixed(1)} U
              </span>
            )}
            <span className="text-xl font-black text-pink-400">{u.toFixed(1)} <span className="text-zinc-500 font-medium text-sm">/ 10</span></span>
          </div>
        </div>
        {renderBar(u, prevU, uDiff, true)}
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
export default function UtilityInterventionOverlay() {
  const { currentCycle, setHasSeenUtilityIntervention, startCycle } = useGame();

  const [step, setStep] = useState(0);
  const [gambleIndex, setGambleIndex] = useState(0);
  const [votes, setVotes] = useState<{ personal: boolean | null, societal: boolean | null }>({ personal: null, societal: null });
  const [demoIndex, setDemoIndex] = useState(0);
  const [replayKey, setReplayKey] = useState(0);

  // ── Telemetry refs ──────────────────────────────────────────────────────
  const openedAt = useRef(Date.now());
  const stepStartedAt = useRef(Date.now());
  const scenarioStartedAt = useRef(Date.now());
  const graphShownAt = useRef<number | null>(null);
  const graphAnimationFinished = useRef(false);

  useEffect(() => {
    openedAt.current = Date.now();
    track('utility_intervention_opened', { after_cycle: 'Rawlsian' });
  }, []);

  useEffect(() => {
    stepStartedAt.current = Date.now();
    if (step === 1) {
      graphShownAt.current = Date.now();
      graphAnimationFinished.current = false;
    }
  }, [step]);

  useEffect(() => {
    scenarioStartedAt.current = Date.now();
  }, [gambleIndex]);
  // ────────────────────────────────────────────────────────────────────────

  const handleVote = (type: 'personal' | 'societal', vote: boolean) => {
    const scenarioIndex = gambleIndex; 
    const timeToAnswer = Date.now() - scenarioStartedAt.current;
    const answerText = vote ? 'FOR' : 'AGAINST';

    track('utility_scenario_answered', {
      scenario_index: scenarioIndex,
      answer_given: answerText,
      time_to_answer_ms: timeToAnswer,
    });

    setVotes(prev => ({ ...prev, [type]: vote }));
    setGambleIndex(prev => prev + 1);
  };

  const handleSeeTheMaths = () => {
    track('utility_maths_seen', {
      scenario_index: 1, 
      time_to_maths_ms: Date.now() - stepStartedAt.current,
    });
    setStep(1);
  };

  const handleGraphProceed = () => {
    if (graphShownAt.current) {
      track('utility_graph_animation_awaited', {
        scenario_index: 0,
        dwell_ms: Date.now() - graphShownAt.current,
        animation_finished: graphAnimationFinished.current,
      });
    }
    setStep(2);
  };

  const handleDemoProceed = () => {
    track('utility_objective_subjective_proceeded', {
      scenario_index: demoIndex === 1 ? 0 : 1,
      dwell_ms: Date.now() - stepStartedAt.current,
    });
    setDemoIndex(prev => prev + 1);
  };

  const handleReplay = () => {
    const currentScenarioIndex = demoIndex === 1 ? 0 : 1;
    track('utility_demo_replayed', {
      scenario_index: currentScenarioIndex,
      ts: Date.now()
    });
    // Incrementing the key forces Framer Motion to unmount and remount the components,
    // re-triggering their 'initial' states and animations.
    setReplayKey(prev => prev + 1);
  };

  const handleComplete = () => {
    track('utility_objective_subjective_proceeded', {
      scenario_index: 1,
      dwell_ms: Date.now() - stepStartedAt.current,
    });
    track('utility_intervention_completed', {
      total_scenarios: 2,
      dwell_ms: Date.now() - openedAt.current,
    });
    track('utility_resume_clicked', { ts: Date.now() });
    setHasSeenUtilityIntervention(true);
    startCycle(currentCycle);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
      className="fixed inset-0 z-[9999] bg-zinc-950 text-zinc-200 flex flex-col p-6 md:p-12 overflow-y-auto"
    >
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col justify-center mt-12">
        <AnimatePresence mode="wait">

          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-6"
            >
              <div>
                <h2 className="text-pink-500 font-black uppercase tracking-widest text-sm mb-2">
                  Simulation Paused
                </h2>
                <h1 className="text-3xl md:text-4xl font-black text-white">
                  You are no longer the Prime Minister.
                </h1>
              </div>
              <p className="text-lg text-zinc-400 leading-relaxed mb-4">
                For a moment, you are an average citizen. We need to see how you evaluate risk.
              </p>

              <div className="bg-zinc-900 border border-zinc-800 p-6 md:p-8 rounded-2xl relative overflow-hidden min-h-[320px] flex flex-col justify-center shadow-2xl">
                <AnimatePresence mode="wait">

                  {gambleIndex === 0 && (
                    <motion.div
                      key="gamble1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex flex-col gap-6"
                    >
                      <div className="flex items-center gap-3 mb-1">
                        <span className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-purple-500/30">
                          Scenario 1: Personal Risk
                        </span>
                      </div>
                      <p className="text-xl text-zinc-200 leading-snug">
                        Your Life Satisfaction is currently a secure <strong className="text-white">6 out of 10</strong>.
                      </p>
                      <p className="text-lg text-zinc-300 leading-relaxed">
                        The government proposes a radical economic policy. It has a <strong className="text-emerald-400">50% chance to boost you to LS 8</strong>, and a <strong className="text-rose-400">50% chance to crash you down to LS 4</strong>.
                      </p>
                      <p className="text-sm text-zinc-500 italic">
                        Mathematically, the average outcome is exactly +0. Do you take the risk?
                      </p>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <button
                          onClick={() => handleVote('personal', true)}
                          className="p-4 rounded-xl border-2 border-emerald-900/50 bg-emerald-950/20 hover:bg-emerald-900/40 text-emerald-400 font-bold transition-all cursor-pointer"
                        >
                          Vote FOR policy
                        </button>
                        <button
                          onClick={() => handleVote('personal', false)}
                          className="p-4 rounded-xl border-2 border-rose-900/50 bg-rose-950/20 hover:bg-rose-900/40 text-rose-400 font-bold transition-all cursor-pointer"
                        >
                          Vote AGAINST policy
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {gambleIndex === 1 && (
                    <motion.div
                      key="gamble2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex flex-col gap-6"
                    >
                      <div className="flex items-center gap-3 mb-1">
                        <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/30">
                          Scenario 2: Societal Risk
                        </span>
                      </div>
                      <p className="text-xl text-zinc-200 leading-snug">
                        You are securely insulated at <strong className="text-white">LS 8</strong>.
                      </p>
                      <p className="text-lg text-zinc-300 leading-relaxed">
                        A policy is proposed that affects a struggling stranger. It has a <strong className="text-emerald-400">50% chance to raise them from LS 4 to LS 6</strong>, and a <strong className="text-rose-400">50% chance to drop them from LS 4 to LS 2</strong> (the absolute baseline of survival).
                      </p>
                      <p className="text-sm text-zinc-500 italic">
                        Again, the mathematical average is +0. Do you gamble on their behalf?
                      </p>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <button
                          onClick={() => handleVote('societal', true)}
                          className="p-4 rounded-xl border-2 border-emerald-900/50 bg-emerald-950/20 hover:bg-emerald-900/40 text-emerald-400 font-bold transition-all cursor-pointer"
                        >
                          Vote FOR policy
                        </button>
                        <button
                          onClick={() => handleVote('societal', false)}
                          className="p-4 rounded-xl border-2 border-rose-900/50 bg-rose-950/20 hover:bg-rose-900/40 text-rose-400 font-bold transition-all cursor-pointer"
                        >
                          Vote AGAINST policy
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {gambleIndex === 2 && (
                    <motion.div
                      key="gambleResult"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col gap-5"
                    >
                      <h3 className="text-2xl font-black text-white">The Psychology of the Vote</h3>
                      <p className="text-zinc-300 text-lg leading-relaxed border-b border-zinc-800 pb-5">
                        You voted <strong className={votes.personal ? 'text-emerald-400' : 'text-rose-400'}>{votes.personal ? 'FOR' : 'AGAINST'}</strong> personal risk, and <strong className={votes.societal ? 'text-emerald-400' : 'text-rose-400'}>{votes.societal ? 'FOR' : 'AGAINST'}</strong> societal risk.
                      </p>
                      <p className="text-zinc-400 text-base leading-relaxed">
                        If you rejected these gambles, you acted like a typical voter. We feel the pain of a loss much more sharply than the joy of an equivalent gain—this is called <strong>Loss Aversion</strong>. Furthermore, we are extremely unwilling to risk pushing someone into absolute deprivation, demonstrating <strong>Inequality Aversion</strong>.
                      </p>
                      <p className="text-pink-400 font-bold text-lg mt-2">
                        This shows that people value a "-2 LS" change much greater than a "+2 LS" change. The scale is not linear.
                      </p>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>

              <AnimatePresence>
                {gambleIndex === 2 && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={handleSeeTheMaths}
                    className="mt-4 self-end px-8 py-4 bg-zinc-100 hover:bg-white text-zinc-900 font-black tracking-widest uppercase text-sm rounded-xl transition-colors shadow-xl cursor-pointer"
                  >
                    See the Maths &rarr;
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-8"
            >
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
                  Diminishing Returns
                </h1>
                <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl">
                  This curve represents the subjective value of Life Satisfaction. Notice how the climb from struggling (LS 2) to stable (LS 6) is steep, but it quickly flattens out as a citizen reaches luxury.
                </p>
              </div>

              <div className="h-[340px] bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center shadow-2xl overflow-hidden">
                <AnimatedUtilityCurve
                  onAnimationComplete={() => { graphAnimationFinished.current = true; }}
                />
              </div>

              <div className="flex justify-between items-center mt-2">
                <p className="text-zinc-500 italic max-w-md text-sm">
                  Notice how the curve flattens out at higher levels. Gaining an extra point of satisfaction when you are already secure offers very little actual value compared to the devastation of losing it.
                </p>
                <button
                  onClick={handleGraphProceed}
                  className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Proceed &rarr;
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-8"
            >
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
                  Objective vs Subjective Value
                </h1>
                <p className="text-lg text-zinc-400 leading-relaxed">
                  Let's apply this to the electorate. Watch how identical policies impact citizens depending on where they currently sit on the curve.
                </p>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-2xl min-h-[380px] flex flex-col">
                <AnimatePresence mode="wait">

                  {(demoIndex === 0 || demoIndex === 1) && (
                    <motion.div
                      key="demo-plus"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex flex-col h-full"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <span className="bg-emerald-500/20 text-emerald-400 px-4 py-1.5 rounded-full text-sm font-black uppercase tracking-widest border border-emerald-500/30">
                          Scenario A: Apply +1 LS
                        </span>
                        {demoIndex === 1 && (
                          <span className="text-sm font-bold text-emerald-400 animate-pulse">
                            Policy Enacted Successfully
                          </span>
                        )}
                      </div>

                      <div key={replayKey} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <CitizenCard
                          title="Struggling Citizen" name="Citizen A"
                          ls={demoIndex === 1 ? 4 : 3} u={demoIndex === 1 ? 5.0 : 2.5}
                          prevLs={3} prevU={2.5} showDiff={demoIndex === 1}
                        />
                        <CitizenCard
                          title="Comfortable Citizen" name="Citizen B"
                          ls={demoIndex === 1 ? 8 : 7} u={demoIndex === 1 ? 9.8 : 9.5}
                          prevLs={7} prevU={9.5} showDiff={demoIndex === 1}
                        />
                      </div>

                      <div className="mt-auto flex justify-between items-end">
                        {demoIndex === 0 ? (
                          <p className="text-zinc-500 italic text-base">
                            Click to apply a flat +1 LS increase to both citizens.
                          </p>
                        ) : (
                          <p className="text-zinc-300 font-medium text-base w-full pr-4">
                            Citizen A's utility skyrocketed because the +1 lifted them out of hardship. Citizen B barely noticed the same +1 increase.
                          </p>
                        )}

                        <div className="flex items-center gap-3 shrink-0">
                          {demoIndex === 1 && (
                            <button
                              onClick={handleReplay}
                              className="px-4 py-3 border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl transition-colors cursor-pointer text-sm"
                            >
                              ↺ Replay
                            </button>
                          )}
                          {demoIndex === 0 ? (
                            <button
                              onClick={() => setDemoIndex(1)}
                              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors shadow-lg cursor-pointer"
                            >
                              Apply +1 LS to Both
                            </button>
                          ) : (
                            <button
                              onClick={handleDemoProceed}
                              className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
                            >
                              Next Scenario &rarr;
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {(demoIndex === 2 || demoIndex === 3) && (
                    <motion.div
                      key="demo-minus"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex flex-col h-full"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <span className="bg-rose-500/20 text-rose-400 px-4 py-1.5 rounded-full text-sm font-black uppercase tracking-widest border border-rose-500/30">
                          Scenario B: Apply -1 LS
                        </span>
                        {demoIndex === 3 && (
                          <span className="text-sm font-bold text-rose-400 animate-pulse">
                            Policy Enacted Successfully
                          </span>
                        )}
                      </div>

                      <div key={replayKey} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <CitizenCard
                          title="Lower-Middle Citizen" name="Citizen C"
                          ls={demoIndex === 3 ? 3 : 4} u={demoIndex === 3 ? 2.5 : 5.0}
                          prevLs={4} prevU={5.0} showDiff={demoIndex === 3}
                        />
                        <CitizenCard
                          title="Upper-Middle Citizen" name="Citizen D"
                          ls={demoIndex === 3 ? 5 : 6} u={demoIndex === 3 ? 7.5 : 8.8}
                          prevLs={6} prevU={8.8} showDiff={demoIndex === 3}
                        />
                      </div>

                      <div className="mt-auto flex justify-between items-end">
                        {demoIndex === 2 ? (
                          <p className="text-zinc-500 italic text-base">
                            Click to apply a flat -1 LS penalty to both citizens.
                          </p>
                        ) : (
                          <p className="text-zinc-300 font-medium text-base w-full pr-4">
                            Citizen C suffered a massive drop in subjective value because they fell into the steep part of the curve. Citizen D absorbed the -1 with minimal issue.
                          </p>
                        )}

                        <div className="flex items-center gap-3 shrink-0">
                          {demoIndex === 3 && (
                            <button
                              onClick={handleReplay}
                              className="px-4 py-3 border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl transition-colors cursor-pointer text-sm"
                            >
                              ↺ Replay
                            </button>
                          )}
                          {demoIndex === 2 ? (
                            <button
                              onClick={() => setDemoIndex(3)}
                              className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-colors shadow-lg cursor-pointer"
                            >
                              Apply -1 LS to Both
                            </button>
                          ) : (
                            <button
                              onClick={handleComplete}
                              className="px-6 py-3 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-xl transition-colors cursor-pointer"
                            >
                              Resume Simulation
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  );
}