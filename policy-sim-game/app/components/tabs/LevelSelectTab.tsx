import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../../context/GameStateContext';
import { ElectionCycle, GamePhase } from '../../utils/types';
import { FRAMEWORK_RULES } from '../../utils/frameworkRules';
import { PM_PROFILES } from '../../utils/pmProfiles';
import { WIN_THRESHOLD } from '../../utils/polls';
import { takePendingStart } from '../../utils/pendingStart';
import { SavingIndicator } from '../../client/SavingIndicator';
import { track } from '../../client/telemetry';
import RunnersAndRiders, { type RunnerEntry } from '../paper/RunnersAndRiders';

/**
 * The level select: The Daily Ledger's back cover, "Runners and riders", lying on the desk.
 * The same page closes the morning paper after every term. Played terms show their result
 * and final life satisfaction; the next term can be started; later candidates stay blurred.
 */
const STAGE_W = 1440;
const STAGE_H = 900;

export default function LevelSelectTab() {
  const { completedRuns, startLevel, setGamePhase } = useGame();
  const unlockedIndex = completedRuns.length;
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Scale the 1440 × 900 desk to the space we have
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: STAGE_W, h: STAGE_H });
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = Math.min(size.w / STAGE_W, size.h / STAGE_H);

  // Track how long they spend on this screen before starting a term
  const arrivedAt = useRef(Date.now());
  const startedRef = useRef(false);

  const handleStartLevel = (cycle: ElectionCycle) => {
    if (startedRef.current) return;
    startedRef.current = true;
    track('level_select_continue_clicked', {
      level_id: ElectionCycle[cycle],
      dwell_ms: Date.now() - arrivedAt.current,
      opened_details: false,
    });
    setIsTransitioning(true);
    setTimeout(() => {
      startLevel(cycle);
    }, 4000);
  };

  useEffect(() => {
    arrivedAt.current = Date.now();
    track('level_select_viewed', { terms_completed: completedRuns.length });
    // "Start term n" was pressed on the morning paper's back cover: go straight on
    const pending = takePendingStart();
    const next = PM_PROFILES[unlockedIndex];
    if (pending !== null && next && pending === next.cycle) {
      const t = setTimeout(() => handleStartLevel(pending), 0);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entries: RunnerEntry[] = PM_PROFILES.map((p, i) => {
    const r = FRAMEWORK_RULES[p.cycle];
    const run = completedRuns.find((c) => c.cycle === p.cycle);
    if (run) {
      const won = run.approvalRating >= WIN_THRESHOLD;
      return {
        cycle: p.cycle, status: won ? 'won' : 'lost', population: run.finalPopulation,
        result: `${won ? 'Won' : 'Lost'} · ${r.targetMetricAbbreviation} ${run.finalScore.toFixed(2)} vs target ${run.targetScore.toFixed(2)}`,
        onReplay: () => handleStartLevel(p.cycle),
      };
    }
    if (i === unlockedIndex) {
      return { cycle: p.cycle, status: 'next', action: { label: `Start term ${i + 1} ▶`, onClick: () => handleStartLevel(p.cycle) } };
    }
    return { cycle: p.cycle, status: 'locked' };
  });

  return (
    <div ref={box} className="absolute inset-0 overflow-hidden desk-wood">
      <div className="absolute top-4 right-4 z-50">
        <SavingIndicator />
      </div>

      <div
        className="absolute left-1/2 top-1/2"
        style={{ width: STAGE_W, height: STAGE_H, transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {/* The closed paper, back cover up */}
        <motion.div
          initial={{ opacity: 0, y: -24, rotate: -1.5 }}
          animate={{ opacity: 1, y: 0, rotate: -0.6 }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.25, 1] }}
          className="paper-page"
          style={{ left: 400, top: 35, boxShadow: '0 24px 50px rgba(0,0,0,.5)' }}
        >
          <RunnersAndRiders
            entries={entries}
            resultsSoFar={unlockedIndex}
            footer={unlockedIndex >= 4 ? (
              <button
                type="button"
                onClick={() => setGamePhase(GamePhase.Debrief)}
                className="paper-btn shrink-0 bg-[#d6b25e] text-stone-900 py-3 font-black text-[14px] tracking-[.06em] uppercase"
              >
                All four terms played · Read the final debrief ▶
              </button>
            ) : undefined}
          />
        </motion.div>
      </div>

      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] bg-zinc-950 flex flex-col items-center justify-center pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.6, duration: 1.2 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="w-12 h-12 border-4 border-zinc-800 border-t-pink-600 rounded-full animate-spin" />
              <h2 className="text-zinc-400 font-bold uppercase tracking-widest text-sm animate-pulse">
                Commencing Term
              </h2>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}