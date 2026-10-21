'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import D3Chart from '@/components/D3Chart';
import { AxisVariable } from '@/utils/types';
import { useTelemetrySession } from '@/context/TelemetryContext';
import { getLsIntro, recordLsIntroShown, recordLsIntroDone, syncPayload } from '@/lib/telemetry';
import { getBaselineLS } from '@study';

// ---------------------------------------------------------------------------
// Life satisfaction intro, shown once before reading. This is the same screen
// the game shows "before you take office" (game: LifeSatisfactionTab.tsx), so
// both study arms get the same LS introduction. Only the `wiki` line differs.
//
// The LS question is asked in the baseline questions (shared study screens).
// If they chose "Prefer not to say", the screen shows without their number;
// if there's no baseline answer at all (dev/testing) it is asked here.
// ---------------------------------------------------------------------------
const TEXT = {
  titleKnown: 'Before you start reading',
  introKnown: 'Life satisfaction (LS) is how a person rates their life as a whole, on a scale from 0 to 10.',
  knownTitle: (ls: number) => `Earlier, you told us your life satisfaction is ${ls} out of 10.`,
  title: 'One question before you start reading',
  intro:
    'Life satisfaction (LS) is how a person rates their life as a whole, on a scale from 0 to 10. Let’s start with yours.',
  question: 'Overall, how satisfied are you with your life nowadays?',
  scaleHint: "0 means 'not at all' and 10 means 'completely'.",
  lowLabel: 'Not at all',
  highLabel: 'Completely',
  explainTitle: (ls: number) => `You answered ${ls}. That is your life satisfaction.`,
  policy:
    'Governments increasingly use this same question to judge whether their policies work. The Office for National Statistics asks it in the UK’s largest household survey, the Treasury’s guidance for appraising new policies draws on it, and almost 90% of OECD governments now ask it.',
  wiki: 'The pages in this wiki explain how a government can use LS scores like these to judge whether its policies are working.',
  chartTitle: 'Where you would sit in a population with UK-like scores',
  context:
    'Over half of people in the UK score 7 or 8. Scores of 4 or below are less common, about 1 in 20 people. Around a quarter score 9 or 10.',
  continue: 'Continue',
};

const SCALE = Array.from({ length: 11 }, (_, i) => i);

/** The game's starting population (261 citizens) binned by rounded LS, 0-10.
 * Hard-coded from the game's dataLoader so the chart matches the game's
 * exactly without shipping its data files. */
const HISTOGRAM_COUNTS = [0, 0, 5, 5, 11, 9, 41, 70, 68, 37, 15];
const HISTOGRAM = HISTOGRAM_COUNTS.map((count, name) => ({ name, count }));
const Y_AXIS_MAX = Math.max(20, Math.ceil(Math.max(...HISTOGRAM_COUNTS) / 20) * 20);

export default function LSIntroModal() {
  const { session, isInitialised } = useTelemetrySession();
  const [open, setOpen] = useState(false);
  const [baselineLS, setBaselineLS] = useState<number | null>(null);
  const [preferNot, setPreferNot] = useState(false);
  const [ls, setLs] = useState<number | null>(null);
  const changes = useRef(0);
  const openedAt = useRef(0);

  // Open once per participant, after the ID check, unless already done
  // (the done flag lives in the payload, so a refresh doesn't re-show it).
  useEffect(() => {
    if (!isInitialised || !session) return;
    if (getLsIntro().done_at !== null) return;
    const baseline = getBaselineLS();
    const fromBaseline = baseline.status === 'answered' ? baseline.ls : null;
    setBaselineLS(fromBaseline);
    setPreferNot(baseline.status === 'prefer_not');
    setLs(fromBaseline);
    changes.current = 0;
    openedAt.current = Date.now();
    recordLsIntroShown();
    setOpen(true);
  }, [isInitialised, session]);

  if (!open || !session) return null;

  const known = baselineLS !== null;

  const handleSelect = (value: number) => {
    if (ls !== null && ls !== value) changes.current += 1;
    setLs(value);
  };

  const handleContinue = () => {
    if (ls === null && !preferNot) return;
    recordLsIntroDone(ls, known ? 'baseline' : preferNot ? 'prefer_not' : 'asked', changes.current, Date.now() - openedAt.current);
    syncPayload(session); // one row written; keeps the answer even if they leave straight away
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[9998] bg-zinc-950/90 backdrop-blur-md overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col gap-6 text-zinc-100"
        >
          {known || preferNot ? (
            <div>
              <h2 className="text-xl font-black text-white tracking-tight mb-3">{TEXT.titleKnown}</h2>
              <p className="text-sm text-zinc-300 leading-relaxed">{TEXT.introKnown}</p>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight mb-3">{TEXT.title}</h2>
                <p className="text-sm text-zinc-300 leading-relaxed mb-4">{TEXT.intro}</p>
                <p className="text-lg text-zinc-200 font-semibold leading-snug">{TEXT.question}</p>
                <p className="text-sm text-zinc-300 mt-1">{TEXT.scaleHint}</p>
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
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-zinc-950 border-zinc-700 text-zinc-300 hover:border-indigo-500/60 hover:text-white'
                        }`}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-between text-sm text-zinc-300 px-1">
                  <span>{TEXT.lowLabel}</span>
                  <span>{TEXT.highLabel}</span>
                </div>
              </div>
            </>
          )}

          <AnimatePresence>
            {(ls !== null || preferNot) && (
              <motion.div
                key="explain"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="flex flex-col gap-4 overflow-hidden"
              >
                <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4">
                  {ls !== null && (
                    <p className="text-base font-bold text-white mb-1">
                      {known ? TEXT.knownTitle(ls) : TEXT.explainTitle(ls)}
                    </p>
                  )}
                  <p className="text-sm text-zinc-300 leading-relaxed mb-2">{TEXT.policy}</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{TEXT.wiki}</p>
                </div>

                <div className="h-56 bg-zinc-950 rounded-lg border border-zinc-800 p-2 pt-7 relative overflow-hidden">
                  <span className="absolute top-2 left-3 text-xs font-bold text-zinc-400 z-10">{TEXT.chartTitle}</span>
                  <D3Chart
                    plotType="1D"
                    chartData={[]}
                    histogramData={HISTOGRAM}
                    xAxisType={AxisVariable.LifeSatisfaction}
                    yAxisType={AxisVariable.LifeSatisfaction}
                    color="#71717a"
                    visualStyle="solid"
                    yAxisMax={Y_AXIS_MAX}
                    markers={ls !== null ? [{ value: ls, label: 'You', color: '#818cf8' }] : []}
                    theme="dark"
                  />
                </div>

                <p className="text-sm text-zinc-300 leading-relaxed">{TEXT.context}</p>

                <button
                  type="button"
                  onClick={handleContinue}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl uppercase tracking-widest text-xs transition-colors shadow-lg cursor-pointer"
                >
                  {TEXT.continue}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
