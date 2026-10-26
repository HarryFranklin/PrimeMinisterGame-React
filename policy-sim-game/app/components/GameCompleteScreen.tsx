'use client';
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../context/GameStateContext';
import { PM_PROFILES } from '../utils/pmProfiles';
import { track } from '../client/telemetry';
import { finishActivity, getStudyState } from '@study';
import { exitFullscreen } from '../client/fullscreen';

/**
 * "Game complete!" – after the final debrief. A short overview of the four
 * terms, then "Continue to the final questions" fades to black and hands back
 * to the study (the post-test).
 *
 * Telemetry: game_complete_shown, game_complete_continue_clicked {dwell_ms}.
 */
export default function GameCompleteScreen() {
  const { completedRuns } = useGame();
  const [leaving, setLeaving] = useState(false);
  const shownAt = useRef(Date.now());

  useEffect(() => {
    shownAt.current = Date.now();
    track('game_complete_shown', {});
  }, []);

  // Terms played, including retries (from the saved game record).
  const path = (getStudyState().cells.activity as { path?: string[] } | undefined)?.path ?? [];
  const runs = PM_PROFILES.map((pm) => ({ pm, run: completedRuns.find((r) => r.cycle === pm.cycle) }));
  const won = runs.filter((r) => r.run && r.run.approvalRating >= 51).length;

  const continueOn = () => {
    if (leaving) return;
    track('game_complete_continue_clicked', { dwell_ms: Date.now() - shownAt.current });
    setLeaving(true);
    exitFullscreen(); // the questionnaire is shown in the normal window
    setTimeout(finishActivity, 1000);
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black text-white overflow-y-auto select-none">
      <motion.div
        className="min-h-full flex flex-col items-center justify-center gap-10 px-6 py-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: leaving ? 0 : 1 }}
        transition={{ duration: leaving ? 0.9 : 1 }}
      >
        <div className="text-center">
          <motion.p
            initial={{ opacity: 0, letterSpacing: '0.6em' }}
            animate={{ opacity: 1, letterSpacing: '0.35em' }}
            transition={{ duration: 1 }}
            className="text-sm font-black uppercase text-pink-500"
          >
            Prime Minister Game
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
            className="mt-3 text-5xl md:text-7xl font-black tracking-tight"
          >
            Game complete!
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-4 text-lg text-zinc-300">
            You served as all four Prime Ministers{path.length > 0 ? ` over ${path.length} term${path.length === 1 ? '' : 's'}` : ''}, winning {won} of 4 elections.
          </motion.p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">
          {runs.map(({ pm, run }, i) => {
            const approval = run?.approvalRating ?? null;
            const didWin = approval !== null && approval >= 51;
            return (
              <motion.div
                key={pm.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 + i * 0.15 }}
                className="rounded-2xl border bg-zinc-950 p-5 flex flex-col items-center gap-2 text-center"
                style={{ borderColor: pm.color, boxShadow: `0 0 30px ${pm.color}33` }}
              >
                <span className="text-5xl">{pm.emoji}</span>
                <span className="text-sm font-black" style={{ color: pm.color }}>{pm.name}</span>
                <span className="text-xs text-zinc-400">{pm.philosophy}</span>
                {approval !== null && (
                  <>
                    <span className="text-2xl font-black tabular-nums">{approval.toFixed(1)}%</span>
                    <span className={`text-xs font-black uppercase tracking-widest ${didWin ? 'text-emerald-400' : 'text-rose-400'}`}>{didWin ? 'Won' : 'Lost'}</span>
                  </>
                )}
              </motion.div>
            );
          })}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }} className="flex flex-col items-center gap-3">
          <p className="text-zinc-400 text-sm">Thank you for playing. There are a few final questions to finish the study.</p>
          <button
            type="button"
            onClick={continueOn}
            className="px-10 py-4 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-black uppercase tracking-widest shadow-[0_0_40px_rgba(236,72,153,0.4)] transition-colors cursor-pointer"
          >
            Continue to the final questions
          </button>
        </motion.div>
      </motion.div>

      {/* Fade to black, then the questionnaire */}
      <motion.div className="fixed inset-0 bg-black pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: leaving ? 1 : 0 }} transition={{ duration: 0.9 }} />
    </div>
  );
}
