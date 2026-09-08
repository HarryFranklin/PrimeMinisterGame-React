'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Clock } from 'lucide-react';
import { useTelemetrySession } from '@/context/TelemetryContext';
import { useCompletion } from '@/context/CompletionContext';
import { markStudyComplete, trackCompletionEvent, CompletionEventType } from '@/lib/telemetry';
import { getCompletionDecisionState, setCompletionDecisionState, CompletionDecisionState } from '@/lib/completion';
import type { NavCategory } from '@/lib/wiki';

// Placeholder — replace with your actual Prolific completion URL.
const PROLIFIC_COMPLETION_URL = 'https://app.prolific.com/submissions/complete?cc=PLACEHOLDER';
const EXTENSION_MS = 5 * 60 * 1000;

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Global "you're done reading" modal. Mounted once in the root layout so it
 * can appear no matter which page the participant is on when they mark the
 * last remaining page complete.
 *
 * Flow: modal appears once, offering "Continue to Prolific" or a single
 * "5 more minutes" extension. There is no third option to defer
 * indefinitely — if they extend, a countdown bar replaces the modal and
 * auto-finishes (marks the study complete + redirects) the instant the
 * timer runs out, even with no further interaction. Every step is logged
 * to telemetry with its own timestamp, and the decision state is persisted
 * to localStorage so a page refresh can't be used to dodge the timer or
 * re-trigger an already-made decision. */
export default function StudyCompleteModal({ nav }: { nav: NavCategory[] }) {
  const telemetry = useTelemetrySession();
  const { allComplete } = useCompletion();
  const session = telemetry?.session;
  const ready = allComplete(nav);

  const [state, setState] = useState<CompletionDecisionState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const finishingRef = useRef(false); // guards against double-firing the redirect

  // Load/initialise persisted decision state the first time we're "ready".
  useEffect(() => {
    if (!ready || !session) return;
    const existing = getCompletionDecisionState();
    if (existing) {
      setState(existing);
      return;
    }
    const fresh: CompletionDecisionState = {
      modalShownAt: Date.now(),
      decision: 'pending',
      extendDeadline: null,
    };
    setCompletionDecisionState(fresh);
    setState(fresh);
    trackCompletionEvent(session, { event_type: 'modal_shown' });
  }, [ready, session]);

  // Tick every second while an extension is running, to drive the countdown
  // display and to reliably catch expiry (setTimeout alone can be throttled
  // in a backgrounded tab).
  useEffect(() => {
    if (state?.decision !== 'extended') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state?.decision]);

  const finish = async (eventType: CompletionEventType) => {
    if (!session || finishingRef.current || !state) return;
    finishingRef.current = true;
    const updated: CompletionDecisionState = { ...state, decision: 'finished' };
    setCompletionDecisionState(updated);
    setState(updated);
    trackCompletionEvent(session, {
      event_type: eventType,
      ms_since_modal_shown: Date.now() - state.modalShownAt,
    });
    await markStudyComplete(session);
    window.location.href = PROLIFIC_COMPLETION_URL;
  };

  const handleExtend = () => {
    if (!session || !state) return;
    const deadline = Date.now() + EXTENSION_MS;
    const updated: CompletionDecisionState = { ...state, decision: 'extended', extendDeadline: deadline };
    setCompletionDecisionState(updated);
    setState(updated);
    trackCompletionEvent(session, {
      event_type: 'chose_extend',
      ms_since_modal_shown: Date.now() - state.modalShownAt,
      extend_deadline: deadline,
    });
  };

  // Auto-finish the instant the extension deadline passes — no click needed.
  useEffect(() => {
    if (state?.decision !== 'extended' || !state.extendDeadline) return;
    if (state.extendDeadline - now <= 0) {
      finish('auto_finished_timeout');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, now]);

  if (!ready || !state || state.decision === 'finished') return null;

  if (state.decision === 'extended' && state.extendDeadline) {
    const remaining = state.extendDeadline - now;
    return (
      <div className="fixed bottom-6 right-6 z-[9998] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl px-5 py-4 flex items-center gap-4 text-zinc-100">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Clock size={16} className="text-amber-400" />
          <span>
            Finishing automatically in{' '}
            <span className="tabular-nums text-amber-400">{formatCountdown(remaining)}</span>
          </span>
        </div>
        <button
          onClick={() => finish('finished_during_extension')}
          className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
        >
          Finish Now
        </button>
      </div>
    );
  }

  // decision === 'pending' -> show the full modal
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl max-w-md w-full text-zinc-100"
        >
          <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center mb-4">
            <CheckCircle2 className="text-emerald-400" size={24} />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight mb-2">
            That's everything
          </h2>
          <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
            You've read through every page. You can head back to Prolific now, or take
            5 more minutes to go back over anything before you finish.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => finish('chose_finish')}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl uppercase tracking-widest text-xs transition-colors shadow-lg"
            >
              <CheckCircle2 size={16} />
              Continue to Prolific
            </button>
            <button
              onClick={handleExtend}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-xl uppercase tracking-widest text-xs transition-colors"
            >
              <Clock size={16} />
              Give Me 5 More Minutes
            </button>
          </div>
          <p className="text-xs text-zinc-500 mt-4 text-center">
            You can only extend once — after 5 minutes you'll be returned to Prolific automatically.
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}