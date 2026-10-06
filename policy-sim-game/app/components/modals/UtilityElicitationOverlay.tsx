import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../../context/GameStateContext';
import { track } from '../../client/telemetry';
import { InteractiveDPMEmail } from './SharedModalComponents';
import GambleScreen from '../elicitation/GambleScreen';
import { INTRO_EMAIL, PAUSE_CARD } from '../elicitation/elicitationText';
import {
  BlockState, GambleBlock, GambleChoice, LADDER,
  applyChoice, blockStarted, canUndo, chainedCurve, currentGambleIndex, nextRiskIndex, undoLastChoice,
} from '../../utils/ElicitationEngine';

type Stage = 'intro' | 'gambles';

function InfoCard({ kicker, title, body, button, onNext }: {
  kicker: string; title: string; body: string; button: string; onNext: () => void;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-8 flex flex-col gap-4 max-w-xl mx-auto">
      <span className="text-sm font-bold text-pink-500">{kicker}</span>
      <h1 className="text-2xl md:text-3xl font-black text-white">{title}</h1>
      <p className="text-base text-zinc-300 leading-relaxed">{body}</p>
      <button
        type="button"
        onClick={onNext}
        className="self-end mt-2 px-8 py-3 rounded-xl font-black bg-pink-600 hover:bg-pink-500 text-white transition-colors cursor-pointer"
      >
        {button}
      </button>
    </div>
  );
}

export default function UtilityElicitationOverlay() {
  const { elicitation, updateElicitation, completeElicitation, playerLS } = useGame();
  // Social block runs before Level 3, personal before Level 4. Fixed on mount
  // so the overlay doesn't flip blocks while it animates out.
  const [block] = useState<GambleBlock>(() => (elicitation?.social.completed ? 'personal' : 'social'));
  const [stage, setStage] = useState<Stage>(() =>
    elicitation && blockStarted(elicitation[block]) ? 'gambles' : 'intro');
  const finished = useRef(false);

  useEffect(() => {
    track('elicitation_opened', { block, resumed: stage !== 'intro' });
    updateElicitation((prev) => (prev[block].startedAt !== null ? prev
      : { ...prev, [block]: { ...prev[block], startedAt: Date.now() } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const state = elicitation?.[block];
  const orderIndex = state ? currentGambleIndex(state) : -1;
  const point = state && orderIndex >= 0 ? state.order[orderIndex] : null;

  /** Sends the block's rollup (the one the server stores), then moves on. */
  const finish = (s: BlockState) => {
    if (finished.current) return;
    finished.current = true;
    const curve = chainedCurve(s.records);
    track('elicitation_completed', {
      block,
      player_ls: playerLS,
      loss_risks: Object.fromEntries(s.order.map((p) => [String(p), s.records[p].lossRisk])),
      utilities: curve ? Object.fromEntries(curve.map((c) => [String(c.ls), c.u])) : null,
      undo_count: s.undoCount,
      dwell_ms: s.startedAt !== null ? Date.now() - s.startedAt : 0,
    });
    completeElicitation(block);
  };

  // Refreshed after the last answer but before the block was marked done.
  useEffect(() => {
    if (state && stage === 'gambles' && orderIndex === -1 && !state.completed) finish(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, stage, orderIndex]);

  if (!elicitation || !state) return null;

  const handleChoice = (choice: GambleChoice, ms: number) => {
    if (point === null) return;
    const record = state.records[point];
    const riskIndex = nextRiskIndex(record);
    if (riskIndex === null) return;

    track('elicitation_gamble_choice', {
      block, point, risk: LADDER[riskIndex], choice, step_index: record.steps.length, time_to_choose_ms: ms,
    });

    const updated = applyChoice(record, choice, ms);
    const next: BlockState = { ...state, records: { ...state.records, [point]: updated } };
    updateElicitation((prev) => ({ ...prev, [block]: next }));

    if (updated.done) {
      track('elicitation_gamble_completed', {
        block, point, order_index: orderIndex, loss_risk: updated.lossRisk ?? 0,
      });
      if (orderIndex === state.order.length - 1) finish(next);
    }
  };

  const handleBack = () => {
    const undone = undoLastChoice(state);
    if (!undone) return;
    track('elicitation_gamble_undone', { block, point: undone.point, step_index: undone.stepIndex });
    updateElicitation((prev) => ({ ...prev, [block]: undone.state }));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="fixed inset-0 z-[9999] bg-zinc-950 text-zinc-200 flex flex-col p-6 md:p-12 overflow-y-auto"
    >
      <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col justify-center gap-6 my-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${block}-${stage}-${point ?? ''}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
          >
            {stage === 'intro' && block === 'social' && (
              <div className="bg-white rounded-2xl shadow-2xl border-t-[6px] border-t-pink-600 p-5 md:p-6 max-w-xl mx-auto">
                <InteractiveDPMEmail
                  title={INTRO_EMAIL.title}
                  message={INTRO_EMAIL.message}
                  typeSpeed={25}
                  buttonText={INTRO_EMAIL.button}
                  onAcknowledge={() => setStage('gambles')}
                />
              </div>
            )}

            {stage === 'intro' && block === 'personal' && (
              <InfoCard {...PAUSE_CARD} onNext={() => setStage('gambles')} />
            )}

            {stage === 'gambles' && point !== null && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 md:p-8">
                <GambleScreen
                  block={block}
                  record={state.records[point]}
                  orderIndex={orderIndex}
                  total={state.order.length}
                  fullByDefault={orderIndex === 0}
                  onChoice={handleChoice}
                  onBack={canUndo(state) ? handleBack : undefined}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}