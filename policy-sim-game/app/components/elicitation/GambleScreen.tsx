import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IMPACT_COLORS } from '../../utils/uiHelpers';
import {
  GambleBlock, GambleChoice, GambleRecord, LADDER, LADDER_LABELS, nextRiskIndex,
} from '../../utils/ElicitationEngine';
import { BLOCK_TEXT, OWN_POINT_NOTE } from './elicitationText';

const SUCCESS = IMPACT_COLORS['Will improve'];
const FAILURE = IMPACT_COLORS['Will worsen'];

/** 100 dots, with the failures highlighted (Cooper used pictograms too). */
function OddsGrid({ risk }: { risk: number }) {
  const failures = Math.max(1, Math.round(risk * 100));
  return (
    <div className="grid gap-[3px]" style={{ gridTemplateColumns: 'repeat(20, minmax(0, 1fr))' }} aria-hidden>
      {Array.from({ length: 100 }, (_, i) => (
        <motion.span
          key={i}
          className="aspect-square rounded-full"
          animate={{ backgroundColor: i < failures ? FAILURE : SUCCESS, opacity: i < failures ? 1 : 0.55 }}
          transition={{ duration: 0.35, delay: (i % 20) * 0.005 }}
        />
      ))}
    </div>
  );
}

interface GambleScreenProps {
  block: GambleBlock;
  record: GambleRecord;
  orderIndex: number;
  total: number;
  /** Show the full scenario text by default (first gamble of the block). */
  fullByDefault: boolean;
  isOwnPoint: boolean;
  onChoice: (choice: GambleChoice, ms: number) => void;
}

export default function GambleScreen({
  block, record, orderIndex, total, fullByDefault, isOwnPoint, onChoice,
}: GambleScreenProps) {
  const t = BLOCK_TEXT[block];
  const x = record.point;
  const riskIndex = nextRiskIndex(record);
  const [showFull, setShowFull] = useState(fullByDefault);
  const shownAt = useRef(Date.now());
  // Brief lock after new odds appear, so a double-click can't answer twice.
  const [locked, setLocked] = useState(true);

  // Restart the timer each time new odds are shown.
  useEffect(() => {
    shownAt.current = Date.now();
    setLocked(true);
    const id = setTimeout(() => setLocked(false), 500);
    return () => clearTimeout(id);
  }, [riskIndex, record.point]);

  useEffect(() => {
    setShowFull(fullByDefault);
  }, [record.point, fullByDefault]);

  if (riskIndex === null) return null;
  const risk = LADDER[riskIndex];
  const label = LADDER_LABELS[riskIndex];
  const lastChoice = record.steps.length > 0 ? record.steps[record.steps.length - 1].choice : null;

  const choose = (c: GambleChoice) => {
    if (locked) return;
    setLocked(true);
    onChoice(c, Date.now() - shownAt.current);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-pink-400">{t.progress(orderIndex + 1, total)}</span>
        <div className="flex gap-1">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`h-1.5 w-6 rounded-full ${i <= orderIndex ? 'bg-pink-500' : 'bg-zinc-700'}`} />
          ))}
        </div>
      </div>

      {/* Scenario */}
      <div className="flex flex-col gap-2">
        {showFull ? (
          <p className="text-base text-zinc-200 leading-relaxed whitespace-pre-line">{t.scenario(x)}</p>
        ) : (
          <p className="text-base text-zinc-200 leading-relaxed">{t.compact(x)}</p>
        )}
        {!fullByDefault && (
          <button
            type="button"
            onClick={() => setShowFull((v) => !v)}
            className="self-start text-xs font-bold text-zinc-400 hover:text-zinc-200 underline underline-offset-2 cursor-pointer"
          >
            {showFull ? t.hideFull : t.showFull}
          </button>
        )}
        {isOwnPoint && <p className="text-sm text-pink-300">{OWN_POINT_NOTE}</p>}
      </div>

      {/* Follow-up line after the first choice */}
      <AnimatePresence mode="wait">
        {lastChoice && lastChoice !== 'unsure' && (
          <motion.p
            key={`${record.steps.length}`}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-sm font-semibold text-amber-300"
          >
            {lastChoice === 'A' ? t.followUp.afterA : t.followUp.afterB}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-zinc-700 bg-zinc-950/60 p-5 flex flex-col gap-3">
          <span className="text-sm font-black text-white">{t.optionA.name}</span>
          <p className="text-sm text-zinc-400 leading-relaxed">{t.optionA.detail(x)}</p>
          <div className="mt-auto rounded-lg bg-zinc-900 border border-zinc-800 py-4 text-center">
            <span className="text-xs text-zinc-500 block mb-1">Certain</span>
            <span className="text-3xl font-black text-white tabular-nums">LS {x}</span>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-700 bg-zinc-950/60 p-5 flex flex-col gap-3">
          <span className="text-sm font-black text-white">{t.optionB.name}</span>
          <p className="text-sm text-zinc-400 leading-relaxed">{t.optionB.detail}</p>
          <motion.div
            key={riskIndex}
            initial={{ scale: 0.98, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mt-auto rounded-lg bg-zinc-900 border border-amber-500/40 p-3 flex flex-col gap-2"
          >
            <p className="text-sm font-bold text-amber-300 text-center">{t.oddsLine(label)}</p>
            <OddsGrid risk={risk} />
            <div className="flex justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SUCCESS }} /> {t.successLegend}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: FAILURE }} /> {t.failureLegend}
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {t.veil && <p className="text-sm italic text-zinc-400">{t.veil}</p>}

      {/* Choice */}
      <div className="flex flex-col gap-3 pt-2 border-t border-zinc-800">
        <span className="text-base font-bold text-white">{t.question}</span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => choose('A')}
            className="px-4 py-3 rounded-xl font-bold bg-zinc-100 text-zinc-900 hover:bg-white transition-colors cursor-pointer disabled:opacity-60"
            disabled={locked}
          >
            {t.buttons.a}
          </button>
          <button
            type="button"
            onClick={() => choose('B')}
            className="px-4 py-3 rounded-xl font-bold bg-pink-600 text-white hover:bg-pink-500 transition-colors cursor-pointer disabled:opacity-60"
            disabled={locked}
          >
            {t.buttons.b}
          </button>
          <button
            type="button"
            onClick={() => choose('unsure')}
            className="px-4 py-3 rounded-xl font-bold bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 transition-colors cursor-pointer disabled:opacity-60"
            disabled={locked}
          >
            {t.buttons.unsure}
          </button>
        </div>
      </div>
    </div>
  );
}