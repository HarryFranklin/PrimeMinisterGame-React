'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, BookOpen } from 'lucide-react';
import { useTelemetrySession } from '@/context/TelemetryContext';
import { useCompletion } from '@/context/CompletionContext';
import { markStudyComplete } from '@/lib/telemetry';
import type { NavCategory } from '@/lib/wiki';

// Placeholder — replace with your actual Prolific completion URL.
const PROLIFIC_COMPLETION_URL = 'https://app.prolific.com/submissions/complete?cc=PLACEHOLDER';

/** Global "you're done reading" modal. Mounted once in the root layout so it
 * can appear no matter which page the participant is on when they mark the
 * last remaining page complete. Auto-opens the first time every page is
 * complete; after that it can be reopened via the floating pill. */
export default function StudyCompleteModal({ nav }: { nav: NavCategory[] }) {
  const telemetry = useTelemetrySession();
  const { allComplete } = useCompletion();
  const session = telemetry?.session;

  const ready = allComplete(nav);
  const hasAutoOpened = useRef(false);

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Auto-open the very first time everything becomes complete. Persists
  // across client-side navigation because RootLayout (and this component)
  // never unmounts between wiki pages.
  useEffect(() => {
    if (ready && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      setOpen(true);
    }
  }, [ready]);

  if (!ready) return null;

  const handleFinish = async () => {
    if (!session || submitting) return;
    setSubmitting(true);
    await markStudyComplete(session);
    window.location.href = PROLIFIC_COMPLETION_URL;
  };

  return (
    <>
      {/* Persistent re-open affordance once the modal has been dismissed */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-[9998] inline-flex items-center gap-2 px-4 py-3 rounded-full text-sm font-bold bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 transition-colors"
        >
          <CheckCircle2 size={16} />
          Reading Complete
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl max-w-md w-full text-zinc-100"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center mb-4">
                <CheckCircle2 className="text-emerald-400" size={24} />
              </div>
              <h2 className="text-xl font-black text-white tracking-tight mb-2">
                That's everything
              </h2>
              <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                You've read through every page. You can go back and re-read anything before
                finishing up, or continue now to return to Prolific.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleFinish}
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl uppercase tracking-widest text-xs transition-colors shadow-lg disabled:opacity-60"
                >
                  <CheckCircle2 size={16} />
                  {submitting ? 'Submitting...' : 'Continue to Prolific'}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-xl uppercase tracking-widest text-xs transition-colors disabled:opacity-60"
                >
                  <BookOpen size={16} />
                  Keep Reading
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}