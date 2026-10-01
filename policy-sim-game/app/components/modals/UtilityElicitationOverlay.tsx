import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../../context/GameStateContext';
import { track } from '../../client/telemetry';
import { InteractiveDPMEmail } from './SharedModalComponents';
import GambleScreen from '../elicitation/GambleScreen';
import { INTRO_EMAIL, PAUSE_CARD, TRANSITION_CARD } from '../elicitation/elicitationText';
import {
  ElicitationState, GambleBlock, GambleChoice, LADDER, applyChoice, nextRiskIndex,
} from '../../utils/ElicitationEngine';

type Stage = 'intro' | 'pause' | 'personal' | 'transition' | 'social';

const blockDone = (e: ElicitationState, b: GambleBlock) =>
  e[`${b}Order`].every((p) => e[b][p].done);
const blockStarted = (e: ElicitationState, b: GambleBlock) =>
  e[`${b}Order`].some((p) => e[b][p].steps.length > 0);

/** Where to pick up if the player refreshes part-way through. */
function resumeStage(e: ElicitationState): Stage {
  if (!blockStarted(e, 'personal')) return 'intro';
  if (!blockDone(e, 'personal')) return 'personal';
  if (!blockStarted(e, 'social')) return 'transition';
  return 'social';
}

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
  const [stage, setStage] = useState<Stage>(() => (elicitation ? resumeStage(elicitation) : 'intro'));
  const finished = useRef(false);

  useEffect(() => {
    track('elicitation_opened', { resumed: stage !== 'intro' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pass 2a: once both gamble blocks are done, carry on to the existing
  // intervention. Pass 2b inserts the sliders, comparison and questions here.
  useEffect(() => {
    if (!elicitation || finished.current) return;
    if (blockDone(elicitation, 'personal') && blockDone(elicitation, 'social')) {
      finished.current = true;
      completeElicitation();
    }
  }, [elicitation, completeElicitation]);

  if (!elicitation) return null;

  const block: GambleBlock | null = stage === 'personal' ? 'personal' : stage === 'social' ? 'social' : null;
  const order = block ? elicitation[`${block}Order`] : [];
  const orderIndex = block ? order.findIndex((p) => !elicitation[block][p].done) : -1;
  const point = orderIndex >= 0 ? order[orderIndex] : null;

  const handleChoice = (choice: GambleChoice, ms: number) => {
    if (!block || point === null) return;
    const record = elicitation[block][point];
    const riskIndex = nextRiskIndex(record);
    if (riskIndex === null) return;

    track('elicitation_gamble_choice', {
      block, point, risk: LADDER[riskIndex], choice, step_index: record.steps.length, time_to_choose_ms: ms,
    });

    const updated = applyChoice(record, choice, ms);
    updateElicitation((prev) => ({ ...prev, [block]: { ...prev[block], [point]: updated } }));

    if (updated.done) {
      track('elicitation_gamble_completed', {
        block, point, order_index: orderIndex,
        indifference_risk: updated.indifferenceRisk ?? 0, utility: updated.utility ?? 0,
      });
      if (block === 'personal' && orderIndex === order.length - 1) setStage('transition');
    }
  };

  const isOwnPoint = point !== null && point === elicitation.ownPoint
    && playerLS !== null && Math.round(playerLS) === point;

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
            key={`${stage}-${point ?? ''}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
          >
            {stage === 'intro' && (
              <div className="bg-white rounded-2xl shadow-2xl border-t-[6px] border-t-pink-600 p-5 md:p-6 max-w-xl mx-auto">
                <InteractiveDPMEmail
                  title={INTRO_EMAIL.title}
                  message={INTRO_EMAIL.message}
                  typeSpeed={25}
                  buttonText={INTRO_EMAIL.button}
                  onAcknowledge={() => setStage('pause')}
                />
              </div>
            )}

            {stage === 'pause' && <InfoCard {...PAUSE_CARD} onNext={() => setStage('personal')} />}

            {stage === 'transition' && <InfoCard {...TRANSITION_CARD} onNext={() => setStage('social')} />}

            {block && point !== null && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 md:p-8">
                <GambleScreen
                  block={block}
                  record={elicitation[block][point]}
                  orderIndex={orderIndex}
                  total={order.length}
                  fullByDefault={orderIndex === 0}
                  isOwnPoint={isOwnPoint}
                  onChoice={handleChoice}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}