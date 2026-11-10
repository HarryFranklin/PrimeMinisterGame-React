import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { track } from '../../client/telemetry';
import { useTypewriterTelemetry, useDwellTimer } from '../../client/hooks';
import { useTypewriter } from '../../hooks/useTypewriter';

interface IntroModalProps {
  onAcknowledge: () => void;
}

/**
 * The welcome: a sealed Cabinet Office envelope slides across the desk (over the
 * back cover of the paper). Click it to open the letter, which types out. Clicking
 * the letter while it types finishes the text; clicking once it's finished puts it
 * aside and leaves the back cover (the level select).
 *
 * Telemetry as before: intro_opened, intro_envelope_opened, intro_text_skipped
 * {elapsed_ms, pct_seen}, intro_proceeded {dwell_ms}.
 */
const INTRO_TEXT =
  'Welcome to the Prime Minister Game.\n\n' +
  'The game has four levels. In each, you take on the role of a different Prime Minister, each with their own idea of how a country should be judged. Get to grips with those ideas and pass policies that fit them to win re-election and pass the level.\n\n' +
  'Your overall goal is to understand these competing ways of judging a country, and how they pull against each other.\n\n' +
  'Good luck.';

// Same typing speed as the old envelope
const TYPE_SPEED = 70;
// A short pause after the text finishes before a click puts the letter aside,
// so the click that finishes the text can't also dismiss it
const PROCEED_DELAY_MS = 400;

const STAGE_W = 1440;
const STAGE_H = 900;
const subscribeResize = (cb: () => void) => {
  window.addEventListener('resize', cb);
  return () => window.removeEventListener('resize', cb);
};
const getViewW = () => window.innerWidth;
const getViewH = () => window.innerHeight;

export default function IntroModal({ onAcknowledge }: IntroModalProps) {
  const [open, setOpen] = useState(false);
  const [canProceed, setCanProceed] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const tw = useTypewriterTelemetry(INTRO_TEXT);
  const dwell = useDwellTimer();
  const { displayedText, isTyping, isComplete, skip } = useTypewriter(INTRO_TEXT, TYPE_SPEED, open);

  const viewW = useSyncExternalStore(subscribeResize, getViewW, () => STAGE_W);
  const viewH = useSyncExternalStore(subscribeResize, getViewH, () => STAGE_H);
  const scale = Math.min(viewW / STAGE_W, viewH / STAGE_H);

  useEffect(() => {
    track('intro_opened', {});
  }, []);

  // So a skip can say how much of the text had been shown
  useEffect(() => {
    tw.updateDisplayed(displayedText.length);
  }, [displayedText, tw.updateDisplayed]);

  useEffect(() => {
    if (!isComplete) return;
    const t = setTimeout(() => setCanProceed(true), PROCEED_DELAY_MS);
    return () => clearTimeout(t);
  }, [isComplete]);

  const openEnvelope = () => {
    if (open) return;
    track('intro_envelope_opened', {});
    // Reset here, not at mount: time spent with the envelope closed
    // shouldn't count as reading/dwell time.
    tw.reset();
    dwell.start();
    setOpen(true);
  };

  // One click target: finish the text, or (once finished) put the letter aside
  const tapLetter = () => {
    if (leaving) return;
    if (isTyping) {
      skip();
      tw.onSkip();
      // Tracked at the moment of the skip, not deferred to Proceed
      const info = tw.getSkipInfo();
      track('intro_text_skipped', { elapsed_ms: info.elapsed_ms, pct_seen: info.pct_seen });
      return;
    }
    if (!canProceed) return;
    setLeaving(true);
    track('intro_proceeded', { dwell_ms: dwell.stop() });
    onAcknowledge();
  };

  return (
    <motion.div className="fixed inset-0 pointer-events-none" exit={{ opacity: 1 }}>
      <div
        className="absolute left-1/2 top-1/2 pointer-events-auto"
        style={{ width: STAGE_W, height: STAGE_H, transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        <AnimatePresence mode="wait" propagate>
          {!open ? (
            // ── The sealed envelope ──
            <motion.button
              key="envelope"
              type="button"
              onClick={openEnvelope}
              initial={{ x: -900, y: 80, rotate: -14 }}
              animate={{ x: 0, y: 0, rotate: -4 }}
              exit={{ y: 30, opacity: 0, transition: { duration: 0.25 } }}
              transition={{ duration: 0.8, ease: [0.2, 0.8, 0.25, 1] }}
              className="absolute left-[460px] top-[285px] w-[520px] h-[330px] bg-[#e9dfc6] shadow-[0_30px_60px_rgba(0,0,0,.55)] text-left"
              aria-label="Open the letter"
            >
              <span className="absolute inset-0 bg-[#ddd1b3]" style={{ clipPath: 'polygon(0 0, 100% 0, 50% 58%)' }} />
              <span className="absolute left-1/2 top-[52%] -ml-[37px] -mt-[37px] w-[74px] h-[74px] rounded-full flex items-center justify-center text-[13px] font-black tracking-[.1em] text-[#fde68a] shadow-[0_3px_8px_rgba(0,0,0,.4)]" style={{ background: 'radial-gradient(circle at 40% 35%, #c2410c, #7f1d1d)' }}>CO</span>
              <span className="absolute left-[26px] bottom-[22px] flex flex-col gap-0.5">
                <span className="paper-cap text-[#7c5a1d]">Cabinet Office · by hand</span>
                <span className="font-text italic text-[19px] text-stone-900">To: the incoming Prime Minister</span>
              </span>
              <span className="absolute right-[22px] bottom-[24px] paper-cap bg-stone-900 text-[#f4efe3] px-2.5 py-1.5">Open ▸</span>
            </motion.button>
          ) : (
            // ── The letter ──
            <motion.div
              key="letter"
              role="button"
              tabIndex={0}
              onClick={tapLetter}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tapLetter(); } }}
              initial={{ y: 40, rotate: 2, opacity: 0 }}
              animate={{ y: 0, rotate: -0.6, opacity: 1 }}
              exit={{ x: 760, y: 160, rotate: 14, opacity: 0, transition: { duration: 0.7, ease: [0.5, 0, 0.7, 0.4] } }}
              transition={{ duration: 0.6, ease: [0.2, 0.8, 0.25, 1] }}
              className="paper-page cursor-pointer"
              style={{ left: 420, top: 110, width: 600, height: 'auto', minHeight: 600, padding: '34px 44px 30px', gap: 14, boxShadow: '0 30px 60px rgba(0,0,0,.55)' }}
              aria-label={isTyping ? 'Finish reading' : 'Put the letter aside'}
            >
              <div className="flex justify-between items-end border-b-2 border-stone-900 pb-2">
                <div className="flex flex-col">
                  <span className="font-display font-black text-[24px] leading-tight">Cabinet Office</span>
                  <span className="paper-cap text-stone-500">70 Whitehall, London</span>
                </div>
                <span className="paper-cap text-[#b91c1c] border-2 border-[#b91c1c] px-2 py-0.5">Welcome pack</span>
              </div>
              <p className="m-0 text-[20px] leading-relaxed whitespace-pre-wrap min-h-[400px]">{displayedText}</p>
              <span className="mt-auto self-end paper-cap text-stone-500">{isTyping ? 'Click to finish reading' : 'Click to put it aside ▸'}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}