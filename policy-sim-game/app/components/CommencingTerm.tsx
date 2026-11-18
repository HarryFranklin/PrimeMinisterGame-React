import React from 'react';
import { motion } from 'framer-motion';

/** Full-screen "Commencing Term" fade shown just before a term starts: from the
 * level select, or at the end of the gambles before Levels 3 and 4. */
export default function CommencingTerm() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5, ease: 'easeInOut' }}
      className="fixed inset-0 z-[9999] bg-zinc-950 flex flex-col items-center justify-center pointer-events-auto"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.6, duration: 1.2 }}
        className="flex flex-col items-center gap-6"
      >
        <div className="w-12 h-12 border-4 border-zinc-800 border-t-pink-600 rounded-full animate-spin" />
        <h2 className="text-zinc-400 font-bold uppercase tracking-widest text-sm animate-pulse">
          Commencing Term
        </h2>
      </motion.div>
    </motion.div>
  );
}

/** How long the fade plays before the term actually starts. */
export const COMMENCING_MS = 4000;
