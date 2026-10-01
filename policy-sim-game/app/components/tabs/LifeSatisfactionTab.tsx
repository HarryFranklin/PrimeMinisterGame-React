import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui';
import D3Chart from '../D3Chart';
import { AxisVariable } from '../../utils/types';
import { loadPopulation } from '../../utils/dataLoader';
import { track } from '../../client/telemetry';

// ---------------------------------------------------------------------------
// On-screen text. The question wording is the ONS / previous-study wording;
// the UK context follows Layard & Oparina's preamble (softened so a player
// with a low score isn't told they are "in misery").
// ---------------------------------------------------------------------------
const TEXT = {
  title: 'Before we begin',
  question: 'Overall, how satisfied are you with your life nowadays?',
  scaleHint: "0 means 'not at all' and 10 means 'completely'.",
  lowLabel: 'Not at all',
  highLabel: 'Completely',
  explainTitle: (ls: number) => `You answered ${ls}. That is your life satisfaction.`,
  explainBody:
    'Life satisfaction (LS) is how people rate their life overall, from 0 to 10. Governments use this exact question: the Office for National Statistics asks it in the UK’s largest household survey, and it is the score your citizens will report throughout this game.',
  chartTitle: 'Where you would sit among your citizens',
  context:
    'Over half of people in the UK score 7 or 8. Scores of 4 or below are less common, about 1 in 20 people. Around a quarter score 9 or 10.',
  continue: 'Continue',
};

const SCALE = Array.from({ length: 11 }, (_, i) => i);

interface LifeSatisfactionTabProps {
  onSubmit: (ls: number) => void;
}

export default function LifeSatisfactionTab({ onSubmit }: LifeSatisfactionTabProps) {
  const [ls, setLs] = useState<number | null>(null);
  const changes = useRef(0);
  const openedAt = useRef(Date.now());

  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  const histogram = useMemo(() => {
    const pop = loadPopulation();
    return SCALE.map((i) => ({ name: i, count: pop.filter((r) => Math.round(r.currentLS) === i).length }));
  }, []);
  const yAxisMax = useMemo(
    () => Math.max(20, Math.ceil(Math.max(...histogram.map((h) => h.count)) / 20) * 20),
    [histogram],
  );

  const handleSelect = (value: number) => {
    if (ls !== null && ls !== value) changes.current += 1;
    setLs(value);
  };

  const handleContinue = () => {
    if (ls === null) return;
    track('life_satisfaction_submitted', {
      ls,
      changed_answer_count: changes.current,
      dwell_ms: Date.now() - openedAt.current,
    });
    onSubmit(ls);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-zinc-950 p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col gap-6"
      >
        <div>
          <h2 className="text-xl font-black text-white tracking-tight mb-3">{TEXT.title}</h2>
          <p className="text-lg text-zinc-200 font-semibold leading-snug">{TEXT.question}</p>
          <p className="text-sm text-zinc-400 mt-1">{TEXT.scaleHint}</p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-11 gap-1.5" role="radiogroup" aria-label={TEXT.question}>
            {SCALE.map((v) => {
              const selected = ls === v;
              return (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => handleSelect(v)}
                  className={`h-11 rounded-lg border text-sm font-black tabular-nums transition-colors cursor-pointer ${
                    selected
                      ? 'bg-pink-600 border-pink-500 text-white'
                      : 'bg-zinc-950 border-zinc-700 text-zinc-300 hover:border-pink-500/60 hover:text-white'
                  }`}
                >
                  {v}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-zinc-500 px-1">
            <span>{TEXT.lowLabel}</span>
            <span>{TEXT.highLabel}</span>
          </div>
        </div>

        <AnimatePresence>
          {ls !== null && (
            <motion.div
              key="explain"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="flex flex-col gap-4 overflow-hidden"
            >
              <div className="rounded-xl border border-pink-500/30 bg-pink-500/10 p-4">
                <p className="text-base font-bold text-white mb-1">{TEXT.explainTitle(ls)}</p>
                <p className="text-sm text-zinc-300 leading-relaxed">{TEXT.explainBody}</p>
              </div>

              <div className="h-56 bg-zinc-950 rounded-lg border border-zinc-800 p-2 pt-7 relative overflow-hidden">
                <span className="absolute top-2 left-3 text-xs font-bold text-zinc-400 z-10">{TEXT.chartTitle}</span>
                <D3Chart
                  plotType="1D"
                  chartData={[]}
                  histogramData={histogram}
                  xAxisType={AxisVariable.LifeSatisfaction}
                  yAxisType={AxisVariable.LifeSatisfaction}
                  color="#71717a"
                  visualStyle="solid"
                  yAxisMax={yAxisMax}
                  markers={[{ value: ls, label: 'You', color: '#ec4899' }]}
                  theme="dark"
                />
              </div>

              <p className="text-sm text-zinc-400 leading-relaxed">{TEXT.context}</p>

              <Button variant="accent" size="lg" loud fullWidth onClick={handleContinue}>
                {TEXT.continue}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
