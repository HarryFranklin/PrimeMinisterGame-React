import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CYCLE_COLORS } from '../../../utils/uiHelpers'; 

// Reuses the same four framework colours everywhere else in the app, plus one
// extra celebratory accent (amber) not tied to any specific cycle.
const CONFETTI_COLORS = [...Object.values(CYCLE_COLORS), '#f59e0b'];

const Confetti = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-[9999] flex justify-center">
    {Array.from({ length: 100 }).map((_, i) => (
      <motion.div
        key={i}
        initial={{ y: -50, x: 0, opacity: 1, rotate: 0 }}
        animate={{
          y: window.innerHeight + 50,
          x: (Math.random() - 0.5) * window.innerWidth * 0.8,
          opacity: [1, 1, 0],
          rotate: 360 + Math.random() * 720,
        }}
        transition={{ duration: 2.5 + Math.random() * 2, ease: 'easeOut', delay: Math.random() * 0.4 }}
        className="absolute w-3 h-3"
        style={{
          backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          borderRadius: i % 3 === 0 ? '50%' : '2px',
          top: '-20px',
        }}
      />
    ))}
  </div>
);

interface StageVerdictProps {
  approvalRating: number;
  won: boolean;
  onReady: () => void;
}

export default function StageVerdict({ approvalRating, won, onReady }: StageVerdictProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);
  const [showReplay, setShowReplay] = useState(false);
  
  const cleanupRef = useRef<(() => void) | null>(null);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    let start = 0;
    const DURATION = 4000;
    const DELAY = 1500;
    let rafId: number;
    let timeoutId: ReturnType<typeof setTimeout>;

    const animate = (now: number) => {
      if (!start) start = now;
      const elapsed = now - start;

      if (elapsed < DELAY) {
        rafId = requestAnimationFrame(animate);
        return;
      }

      const progress = Math.min((elapsed - DELAY) / DURATION, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setDisplayScore(eased * approvalRating);

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      } else {
        setIsDone(true);
        timeoutId = setTimeout(() => onReadyRef.current(), 2000);
      }
    };

    rafId = requestAnimationFrame(animate);

    cleanupRef.current = () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
    };

    return () => {
      if (cleanupRef.current) cleanupRef.current();
    };
  }, [approvalRating]);

  const showSuccess = isDone && won;
  const showFailure = isDone && !won;

  // Reveal the replay button only after the confetti finishes (~4.5s)
  useEffect(() => {
    if (showSuccess) {
      setShowReplay(false);
      const timer = setTimeout(() => setShowReplay(true), 4500);
      return () => clearTimeout(timer);
    }
  }, [showSuccess, confettiKey]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full relative">
      {showSuccess && <Confetti key={confettiKey} />}

      <div className="h-10 flex items-center justify-center shrink-0">
        {showSuccess && (
          <div className="bg-emerald-500 text-white py-1 px-4 rounded-full font-black uppercase tracking-widest text-[10px] shadow-lg animate-bounce z-50">
            Election Won
          </div>
        )}
        {showFailure && (
          <div className="bg-rose-600 text-white py-1 px-4 rounded-full font-black uppercase tracking-widest text-[10px] shadow-lg z-50">
            Election Lost
          </div>
        )}
      </div>

      <motion.div
        layout
        className={`p-8 md:p-10 w-full max-w-lg flex flex-col items-center justify-center text-center rounded-3xl border-4 transition-all duration-700 ${
          showSuccess
            ? 'bg-emerald-50 border-emerald-200 shadow-xl'
            : showFailure
            ? 'bg-zinc-100 border-zinc-300 shadow-md'
            : 'bg-zinc-50 border-zinc-200'
        }`}
      >
        <motion.div layout className="flex flex-col items-center">
          <h1
            className={`text-4xl md:text-5xl font-black mb-2 transition-colors duration-500 ${
              showSuccess ? 'text-emerald-700' : showFailure ? 'text-zinc-700' : 'text-zinc-800'
            }`}
          >
            {showSuccess ? 'Re-Elected' : showFailure ? 'Voted Out' : 'Counting Votes'}
          </h1>
          <p className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-6 transition-opacity duration-500">
            {showSuccess
              ? 'The public has backed our vision for the country.'
              : showFailure
              ? "The public feels we didn't do enough to address their concerns."
              : 'Awaiting final tally'}
          </p>
          <div className="flex flex-col items-center justify-center gap-1">
            <span className="text-sm md:text-base font-black text-zinc-400 uppercase tracking-widest">
              Final Approval
            </span>
            <span
              className={`text-8xl font-black tabular-nums transition-colors duration-300 ${
                showSuccess ? 'text-emerald-600' : showFailure ? 'text-zinc-600' : 'text-zinc-800'
              }`}
            >
              {displayScore.toFixed(1) === '100.0' ? '100' : displayScore.toFixed(1)}%
            </span>
            <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest mt-2">Required: 51.0%</span>
            
            {/* The Replay Button */}
            <div className="h-8 mt-3 flex items-center justify-center">
              <AnimatePresence>
                {showReplay && showSuccess && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={() => setConfettiKey(k => k + 1)}
                    className="flex items-center gap-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer"
                  >
                    <span className="text-base">🎉</span> Replay
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}