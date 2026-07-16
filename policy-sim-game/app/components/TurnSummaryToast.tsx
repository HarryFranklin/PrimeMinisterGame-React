import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TurnSummaryToastProps {
  summary: { policyName: string; scoreBefore: number; scoreAfter: number; turn: number } | null;
  accentColor: string;
  metricAbbreviation: string;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 4500;

export default function TurnSummaryToast({ summary, accentColor, metricAbbreviation, onDismiss }: TurnSummaryToastProps) {
  useEffect(() => {
    if (!summary) return;
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [summary, onDismiss]);

  const diff = summary ? summary.scoreAfter - summary.scoreBefore : 0;
  const isPositive = diff >= 0;

  return (
    <AnimatePresence>
      {summary && (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.97 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="absolute top-3 left-1/2 -translate-x-1/2 z-[80] pointer-events-auto"
        >
          <button
            onClick={onDismiss}
            className="flex items-center gap-3 bg-white border border-zinc-200 shadow-xl rounded-full pl-2 pr-4 py-2 cursor-pointer hover:shadow-2xl transition-shadow"
          >
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
              style={{ backgroundColor: accentColor }}
            >
              {isPositive ? '↑' : '↓'}
            </span>
            <span className="text-left">
              <span className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 leading-none mb-0.5">
                Turn {summary.turn} Enacted
              </span>
              <span className="block text-sm font-bold text-zinc-800 leading-tight">
                {summary.policyName}
                <span className={`ml-2 font-black ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {isPositive ? '+' : ''}{diff.toFixed(2)} {metricAbbreviation}
                </span>
              </span>
            </span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
