import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IMPACT_COLORS } from '../../utils/uiHelpers';
import {
  GambleBlock, GambleChoice, GambleRecord, LADDER, LADDER_LABELS, nextRiskIndex,
} from '../../utils/ElicitationEngine';
import { BLOCK_TEXT, GAMBLE_UI } from './elicitationText';

const SUCCESS = IMPACT_COLORS['Will improve'];
const FAILURE = IMPACT_COLORS['Will worsen'];

/** Slide in from the right for new odds or a new gamble, from the left
 * after going back. Pass the direction (1 or -1) as `custom`. */
export const SLIDE = {
  enter: (d: number) => ({ opacity: 0, x: 80 * d }),
  center: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: -80 * d }),
};

/** Down to 1 in 100: 100 dots with the failures highlighted (Cooper used
 * pictograms too). Rarer risks: squares of 100 people each, with the one
 * square holding the single failure outlined. */
function OddsGrid({ risk }: { risk: number }) {
  if (risk >= 1 / 100) {
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

  const squares = Math.round(1 / risk / 100);
  const cols = squares >= 100 ? 20 : 10;
  const failAt = Math.floor(squares / 2);
  return (
    <div className="flex flex-col gap-1.5" aria-hidden>
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: squares }, (_, i) => (
          <span
            key={i}
            className="relative aspect-square rounded-sm"
            style={i === failAt ? { outline: `2px solid ${FAILURE}`, outlineOffset: '1px' } : undefined}
          >
            <span
              className="absolute inset-0 rounded-sm"
              style={{
                backgroundImage: `radial-gradient(circle, ${SUCCESS} 40%, transparent 45%)`,
                backgroundSize: '10% 10%',
                opacity: 0.55,
              }}
            />
            {i === failAt && (
              <span className="absolute top-[45%] left-[45%] w-[10%] h-[10%] rounded-full" style={{ backgroundColor: FAILURE }} />
            )}
          </span>
        ))}
      </div>
      <span className="text-[11px] text-zinc-500 text-center">{GAMBLE_UI.squaresNote}</span>
    </div>
  );
}

/** A whole option as one clickable card. */
function OptionCard({ name, detail, disabled, onClick, children }: {
  name: string; detail: string; disabled: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group text-left rounded-xl border-2 border-zinc-700 bg-zinc-950/60 p-5 flex flex-col gap-3 transition-all cursor-pointer
        enabled:hover:border-pink-500 enabled:hover:bg-zinc-900 enabled:hover:-translate-y-0.5
        focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 disabled:cursor-default"
    >
      <span className="text-sm font-black text-white">{name}</span>
      <span className="text-sm text-zinc-400 leading-relaxed">{detail}</span>
      <span className="mt-auto flex flex-col gap-3 w-full">
        {children}
        <span className="self-end text-xs font-black text-pink-400/60 group-enabled:group-hover:text-pink-400 transition-colors">
          {GAMBLE_UI.choose} {name} →
        </span>
      </span>
    </button>
  );
}

interface GambleScreenProps {
  block: GambleBlock;
  record: GambleRecord;
  orderIndex: number;
  total: number;
  /** Show the full scenario text by default (first gamble of the block). */
  fullByDefault: boolean;
  onChoice: (choice: GambleChoice, ms: number) => void;
  /** Steps back one choice; undefined when there's nothing to undo. */
  onBack?: () => void;
}

export default function GambleScreen({
  block, record, orderIndex, total, fullByDefault, onChoice, onBack,
}: GambleScreenProps) {
  const t = BLOCK_TEXT[block];
  const x = record.point;
  const riskIndex = nextRiskIndex(record);
  const [showFull, setShowFull] = useState(fullByDefault);
  const shownAt = useRef(Date.now());
  // Brief lock after new odds appear, so a double-click can't answer twice.
  const [locked, setLocked] = useState(true);

  // Going back within this gamble slides the odds in from the left.
  const prevSteps = useRef(record.steps.length);
  const direction = record.steps.length < prevSteps.current ? -1 : 1;
  useEffect(() => {
    prevSteps.current = record.steps.length;
  }, [record.steps.length]);

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
  const turnedDown = record.steps.length > 0;

  const choose = (c: GambleChoice) => {
    if (locked) return;
    setLocked(true);
    onChoice(c, Date.now() - shownAt.current);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-bold text-zinc-400 hover:text-zinc-200 cursor-pointer"
          >
            ← {GAMBLE_UI.back}
          </button>
        ) : <span />}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-pink-400">{t.progress(orderIndex + 1, total)}</span>
          <div className="flex gap-1">
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className={`h-1.5 w-6 rounded-full ${i <= orderIndex ? 'bg-pink-500' : 'bg-zinc-700'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Scenario */}
      <div className="flex flex-col gap-2">
        <p className="text-base text-zinc-200 leading-relaxed whitespace-pre-line">
          {showFull ? t.scenario(x) : t.compact(x)}
        </p>
        {!fullByDefault && (
          <button
            type="button"
            onClick={() => setShowFull((v) => !v)}
            className="self-start text-xs font-bold text-zinc-400 hover:text-zinc-200 underline underline-offset-2 cursor-pointer"
          >
            {showFull ? GAMBLE_UI.hideFull : GAMBLE_UI.showFull}
          </button>
        )}
      </div>

      {t.veil && <p className="text-sm italic text-zinc-400">{t.veil}</p>}

      <span className="text-base font-bold text-white">{t.question}</span>

      {/* Odds and options: slide in each time the odds change */}
      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={riskIndex}
          custom={direction}
          variants={SLIDE}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="flex flex-col gap-3"
        >
          {turnedDown && <p className="text-sm font-semibold text-amber-300">{t.followUp}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <OptionCard name={t.optionA.name} detail={t.optionA.detail(x)} disabled={locked} onClick={() => choose('A')}>
              <span className="rounded-lg bg-zinc-900 border border-zinc-800 py-4 text-center block">
                <span className="text-xs text-zinc-500 block mb-1">{GAMBLE_UI.certain}</span>
                <span className="text-3xl font-black text-white tabular-nums">LS {x}</span>
              </span>
            </OptionCard>

            <OptionCard name={t.optionB.name} detail={t.optionB.detail(x)} disabled={locked} onClick={() => choose('B')}>
              <span className="rounded-lg bg-zinc-900 border border-amber-500/40 p-3 flex flex-col gap-2">
                <span className="text-sm font-bold text-amber-300 text-center">{t.oddsLine(label, x)}</span>
                <OddsGrid risk={risk} />
                <span className="flex justify-between text-xs text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SUCCESS }} /> {t.successLegend(x)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: FAILURE }} /> {t.failureLegend(x)}
                  </span>
                </span>
              </span>
            </OptionCard>
          </div>
        </motion.div>
      </AnimatePresence>

      <button
        type="button"
        onClick={() => choose('equal')}
        disabled={locked}
        className="self-center px-6 py-2.5 rounded-xl font-bold bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-default"
      >
        {GAMBLE_UI.equal}
      </button>
    </div>
  );
}