'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelemetrySession } from '@/context/TelemetryContext';

export default function ParticipantSetupModal() {
  const { isInitialised, initialiseSession } = useTelemetrySession();
  const [prolificId, setProlificId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill with URL parameter or randomised testing ID (matching game SetupTab)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlPid = urlParams.get('PROLIFIC_PID');

    if (urlPid) {
      setProlificId(urlPid);
    } else {
      const randomNum = Math.floor(Math.random() * 900000) + 100000;
      setProlificId(`PROLIFIC_${randomNum}`);
    }
  }, []);

  if (isInitialised) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prolificId.trim() || isSubmitting) return;

    setIsSubmitting(true);
    await initialiseSession(prolificId);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-zinc-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {!isSubmitting ? (
          <motion.div
            key="setup-card"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl max-w-md w-full text-zinc-100"
          >
            <h2 className="text-xl font-black text-white tracking-tight mb-2">
              Participant Initialisation
            </h2>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              Please confirm your Prolific ID to initialise your reading session.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="text"
                value={prolificId}
                onChange={(e) => setProlificId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-xl px-4 py-3 font-mono text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Enter Prolific ID"
                required
              />
              <button
                type="submit"
                disabled={!prolificId.trim()}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl uppercase tracking-widest text-xs transition-colors shadow-lg disabled:opacity-50 cursor-pointer"
              >
                Initialise Study
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="spinner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4 text-center"
          >
            <div className="w-10 h-10 border-4 border-zinc-800 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-sm font-mono text-zinc-400 uppercase tracking-widest">
              Registering session...
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}