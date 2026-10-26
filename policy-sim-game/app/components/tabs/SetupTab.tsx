import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui';
import { track } from '../../client/telemetry';
import { getStudyState } from '@study';

interface SetupTabProps {
  onSubmit: (participantId: string) => void;
  isCalculating: boolean;
  calcProgress?: number;
}

export default function SetupTab({ onSubmit, isCalculating, calcProgress = 0 }: SetupTabProps) {
  const [prolificId, setProlificId] = useState('');
  // In the study the ID always comes from the study session, so this screen is
  // only ever the "Loading game…" screen (the form is a fallback).
  const [studyPid] = useState(() => getStudyState().session?.pid ?? null);

  
  useEffect(() => {
    track('setup_opened', {});
  }, []);

  // The participant's ID comes from the study session (Prolific ID, or a
  // PILOT_/TEST_ id from the study worker), so setup starts by itself. The
  // form below is only a fallback and is never shown in normal use.
  useEffect(() => {
    const pid = getStudyState().session?.pid;
    if (pid) {
      setProlificId(pid);
      onSubmit(pid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (studyPid || isCalculating) {
    // Straight from the questionnaire to a black "Loading game…" screen, so it
    // is obvious the game has started.
    return (
      <div className="fixed inset-0 z-[80] bg-black flex flex-col items-center justify-center gap-8 select-none">
        <motion.p
          initial={{ opacity: 0, letterSpacing: '0.6em' }}
          animate={{ opacity: 1, letterSpacing: '0.35em' }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="text-zinc-300 font-black uppercase text-sm"
        >
          Prime Minister Game
        </motion.p>
        <div className="w-64 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          {/* Fills at a steady rate over exactly 1 s. A CSS transform animation runs
              on the browser's compositor, so it stays smooth even while the
              game's set-up calculation keeps the page busy. */}
          <style>{'@keyframes pmg-loadbar { from { transform: scaleX(0); } to { transform: scaleX(1); } }'}</style>
          <div className="h-full w-full bg-pink-600 origin-left" style={{ animation: 'pmg-loadbar 1s linear forwards' }} />
        </div>
        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest animate-pulse">Loading game…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-zinc-950 p-6">
      <AnimatePresence mode="wait">
        {!isCalculating ? (
          <motion.div
            key="setup-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl max-w-md w-full"
          >
            <h2 className="text-xl font-black text-white tracking-tight mb-2">Participant Initialisation</h2>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              Please confirm your Prolific ID to generate your unique simulation parameters.
            </p>
            <div className="flex flex-col gap-4">
              <input
                type="text"
                value={prolificId}
                onChange={(e) => setProlificId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-xl px-4 py-3 font-mono text-sm focus:outline-none focus:border-pink-500 transition-colors"
                placeholder="Enter Prolific ID"
              />
              <Button 
                variant="accent" 
                size="lg" 
                loud 
                fullWidth 
                onClick={() => onSubmit(prolificId)}
                disabled={!prolificId.trim()}
              >
                Initialise Study
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="loading-spinner"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="w-12 h-12 border-4 border-zinc-800 border-t-pink-600 rounded-full animate-spin" />
            <div className="text-center">
              <h2 className="text-zinc-300 font-bold uppercase tracking-widest text-sm animate-pulse mb-1">
                Commencing Term
              </h2>
              <p className="text-xs text-zinc-500 font-mono">
                ... {Math.round(calcProgress * 100)}%
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}