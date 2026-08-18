import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui';
import { track } from '../../client/telemetry';

interface SetupTabProps {
  onSubmit: (participantId: string) => void;
  isCalculating: boolean;
}

export default function SetupTab({ onSubmit, isCalculating }: SetupTabProps) {
  const [prolificId, setProlificId] = useState('');
  
  useEffect(() => {
    track('setup_opened', {});
  }, []);

  // Generate a random temporary ID for testing
  useEffect(() => {
    const randomNum = Math.floor(Math.random() * 900000) + 100000;
    setProlificId(`PROLIFIC_${randomNum}`);
  }, []);

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
              <p className="text-xs text-zinc-500 font-mono">Calculating societal baselines...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}