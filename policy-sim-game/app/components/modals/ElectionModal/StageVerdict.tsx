/**
 * Page 2 of the election sequence.
 * Animates the approval score counting up, then reveals the win/loss result.
 * Fires confetti on a win or rain on loss. Calls onReady() ~2 s after the animation completes.
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

// ---------------------------------------------------------------------------
// Confetti
// ---------------------------------------------------------------------------

const CONFETTI_COLORS = ['#ec4899', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];

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
        style={{ backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length], borderRadius: i % 3 === 0 ? '50%' : '2px', top: '-20px' }}
      />
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// Rain
// ---------------------------------------------------------------------------

const RainEffect = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-[9999] flex justify-center">
    {Array.from({ length: 60 }).map((_, i) => (
      <motion.div
        key={i}
        initial={{ y: -20, opacity: 0.6 }}
        animate={{ y: window.innerHeight + 20, opacity: 0 }}
        transition={{ duration: 3 + Math.random() * 2, ease: 'linear', repeat: Infinity, delay: Math.random() * 2 }}
        className="absolute w-0.5 h-8 bg-rose-500"
        style={{ left: `${Math.random() * 100}%` }}
      />
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface StageVerdictProps {
  approvalRating: number;
  won: boolean;
  onReady: () => void;
}

export default function StageVerdict({ approvalRating, won, onReady }: StageVerdictProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const onReadyRef = useRef(onReady);

  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);

  useEffect(() => {
    let start = 0;
    const DURATION = 4000;
    const DELAY = 1500;
    let rafId: number;
    let timeoutId: ReturnType<typeof setTimeout>;

    const animate = (now: number) => {
      if (!start) start = now;
      const elapsed = now - start;
      if (elapsed < DELAY) { rafId = requestAnimationFrame(animate); return; }
      const progress = Math.min((elapsed - DELAY) / DURATION, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(eased * approvalRating);
      if (progress < 1) rafId = requestAnimationFrame(animate);
      else { setIsDone(true); timeoutId = setTimeout(() => onReadyRef.current(), 2000); }
    };
    rafId = requestAnimationFrame(animate);
    cleanupRef.current = () => { cancelAnimationFrame(rafId); clearTimeout(timeoutId); };
    return () => { if (cleanupRef.current) cleanupRef.current(); };
  }, [approvalRating]);

  const showSuccess = isDone && won;
  const showFailure = isDone && !won;

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-2 mt-2 w-full relative animate-in zoom-in duration-500 overflow-hidden">
      {showSuccess && <Confetti />}
      {showFailure && <RainEffect />}

      {showSuccess && (
        <div className="my-2 bg-emerald-500 text-white py-1 px-4 rounded-full font-black uppercase tracking-widest text-[10px] shadow-lg animate-bounce z-10">
          Majority Secured
        </div>
      )}
      
      {showFailure && (
        <div className="my-2 bg-rose-600 text-white py-1 px-4 rounded-full font-black uppercase tracking-widest text-[10px] shadow-lg z-10">
          Mandate Lost
        </div>
      )}

      <motion.div
        layout
        className={`p-10 w-full max-w-lg min-h-[300px] flex flex-col items-center justify-center text-center rounded-3xl border-4 transition-all duration-700 ${
          showSuccess ? 'bg-emerald-50 border-emerald-200' : showFailure ? 'bg-rose-50 border-rose-200' : 'bg-zinc-50 border-zinc-200'
        }`}
      >
        <motion.div layout className="flex flex-col items-center">
          <h1 className={`text-4xl md:text-5xl font-black mb-2 transition-colors duration-500 ${showSuccess ? 'text-emerald-700' : showFailure ? 'text-rose-700' : 'text-zinc-800'}`}>
            {showSuccess ? 'Re-Elected' : showFailure ? 'Voted Out' : 'Counting Votes…'}
          </h1>
          <p className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-6 transition-opacity duration-500">
            {showSuccess ? 'The public has backed your vision.' : showFailure ? "The public feels we didn't do enough to address their concerns." : 'Awaiting final tally'}
          </p>
          <div className="flex flex-col items-center justify-center gap-1">
            <span className="text-sm md:text-base font-black text-zinc-400 uppercase tracking-widest">Final Approval</span>
            <span className={`text-7xl font-black tabular-nums transition-colors duration-300 ${showSuccess ? 'text-emerald-600' : showFailure ? 'text-rose-600' : 'text-zinc-800'}`}>
              {displayScore.toFixed(1)}%
            </span>
            <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest mt-2">Required: 51.0%</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}