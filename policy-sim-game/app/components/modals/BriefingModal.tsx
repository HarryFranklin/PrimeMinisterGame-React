import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { motion } from 'framer-motion';
import { ElectionCycle } from '../../utils/types';
import { FRAMEWORK_RULES } from '../../utils/frameworkRules';
import { getPMProfile, PM_PROFILES } from '../../utils/pmProfiles';
import { PM_TONES } from '../desk/deskTheme';
import { JUDGED } from '../paper/RunnersAndRiders';
import PMFigure from './ElectionModal/PMFigure';
import { useGame } from '../../context/GameStateContext';
import { useTypewriter } from '../../hooks/useTypewriter';
import { track } from '../../client/telemetry';
import { useTypewriterTelemetry, useDwellTimer } from '../../client/hooks';

interface BriefingModalProps {
  currentCycle: ElectionCycle;
  onAcknowledge: () => void;
}

/**
 * The new-term memo. The desk is dimmed and a memo from the PM's office is passed
 * across it, typing out as soon as it lands. Clicking the memo while it types
 * finishes the text; clicking once it's finished puts it aside and the term begins.
 * On a retry, "Skip briefing" is offered as before.
 *
 * Telemetry as before: briefing_opened, briefing_envelope_opened (now fires when the
 * memo lands and starts typing; there's nothing to open), briefing_metric_definition_clicked,
 * briefing_text_skipped, briefing_proceeded.
 */
const TYPE_SPEED = 25;
// So the click that finishes the text can't also put the memo aside
const PROCEED_DELAY_MS = 400;

const STAGE_W = 1440;
const STAGE_H = 900;
const subscribeResize = (cb: () => void) => {
  window.addEventListener('resize', cb);
  return () => window.removeEventListener('resize', cb);
};
const getViewW = () => window.innerWidth;
const getViewH = () => window.innerHeight;

export default function BriefingModal({ currentCycle, onAcknowledge }: BriefingModalProps) {
  const rule = FRAMEWORK_RULES[currentCycle];
  const profile = getPMProfile(currentCycle);
  const tone = PM_TONES[currentCycle];
  const judged = JUDGED[currentCycle];
  const term = PM_PROFILES.findIndex((p) => p.cycle === currentCycle) + 1;
  const name = profile.name.replace(/^PM\s+/, '');
  const { cycleAttempts } = useGame();

  const [open, setOpen] = useState(false);
  const [showDefinition, setShowDefinition] = useState(false);
  const [canProceed, setCanProceed] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const isRetryingTerm = cycleAttempts > 1;
  const cycleKey = ElectionCycle[currentCycle];

  // The office name is on the letterhead now, so the typed text starts at "Dear PM"
  const briefingText = `Dear PM,\n\nI know you are very busy, so I'll get right to it.\n\n${rule.briefingText}`;
  const tw = useTypewriterTelemetry(briefingText);
  const dwell = useDwellTimer();
  const { displayedText, isTyping, isComplete, skip } = useTypewriter(briefingText, TYPE_SPEED, open);

  const viewW = useSyncExternalStore(subscribeResize, getViewW, () => STAGE_W);
  const viewH = useSyncExternalStore(subscribeResize, getViewH, () => STAGE_H);
  const scale = Math.min(viewW / STAGE_W, viewH / STAGE_H);

  useEffect(() => {
    track('briefing_opened', {
      cycle: cycleKey,
      attempt_number: cycleAttempts,
      is_retry: isRetryingTerm,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // The memo has landed: start typing, and start the reading/dwell clocks
  const memoLanded = () => {
    if (open) return;
    track('briefing_envelope_opened', { cycle: cycleKey, attempt_number: cycleAttempts });
    tw.reset();
    dwell.start();
    setOpen(true);
  };

  const handleMetricClick = (e: React.MouseEvent) => {
    // Don't let this click finish the text or put the memo aside
    e.stopPropagation();
    if (showDefinition) return;
    setShowDefinition(true);
    track('briefing_metric_definition_clicked', {
      cycle: cycleKey,
      metric_name: rule.targetMetricName,
    });
  };

  const handleProceed = (usedSkipButton = false) => {
    if (leaving) return;
    setLeaving(true);
    track('briefing_proceeded', {
      cycle: cycleKey,
      dwell_ms: dwell.stop(),
      used_skip_button: usedSkipButton,
    });
    onAcknowledge();
  };

  // One click target: finish the text, or (once finished) put the memo aside
  const tapMemo = () => {
    if (leaving || !open) return;
    if (isTyping) {
      skip();
      tw.onSkip();
      // Tracked at the moment of the skip, not deferred to Proceed
      const info = tw.getSkipInfo();
      track('briefing_text_skipped', { cycle: cycleKey, elapsed_ms: info.elapsed_ms, pct_seen: info.pct_seen });
      return;
    }
    if (!canProceed) return;
    handleProceed(false);
  };

  return (
    <motion.div className="fixed inset-0 pointer-events-none" exit={{ opacity: 1 }}>
      <div
        className="absolute left-1/2 top-1/2 pointer-events-auto"
        style={{ width: STAGE_W, height: STAGE_H, transform: `translate(-50%, -50%) scale(${scale})` }}
      >
          {/* ── The memo, passed across the desk ──
            (no AnimatePresence of its own: page.tsx's one plays its exit) */}
            <motion.div
              key="memo"
              role="button"
              tabIndex={0}
              onClick={tapMemo}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tapMemo(); } }}
              initial={{ x: 820, y: 70, rotate: 9 }}
              animate={{ x: 0, y: 0, rotate: 0.8 }}
              onAnimationComplete={memoLanded}
              exit={{ x: 760, y: 160, rotate: 14, opacity: 0, transition: { duration: 0.7, ease: [0.5, 0, 0.7, 0.4] } }}
              transition={{ duration: 0.75, ease: [0.2, 0.8, 0.25, 1] }}
              className="paper-page cursor-pointer"
              style={{ left: 470, top: 120, width: 500, height: 'auto', minHeight: 560, padding: '26px 34px 22px', gap: 12, boxShadow: '0 30px 60px rgba(0,0,0,.55)' }}
              aria-label={!open || isTyping ? 'Finish reading' : 'Put the briefing aside'}
            >
              {/* Letterhead: who it's from */}
              <div className="flex items-center gap-3 border-b-2 border-stone-900 pb-2">
                <div className="relative w-[56px] h-[56px] shrink-0 overflow-hidden rounded-sm" style={{ background: `linear-gradient(180deg, ${tone.color}, ${tone.dark})` }}>
                  <div className="absolute left-1/2 top-[6px]" style={{ marginLeft: -(90 * 0.42) / 2 }}>
                    <PMFigure cycle={currentCycle} scale={0.42} pose="standing" />
                  </div>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="paper-cap text-stone-500">Memo · Term {term}{isRetryingTerm ? ` · attempt ${cycleAttempts}` : ''}</span>
                  <span className="font-display font-black text-[22px] leading-tight">Office of {name}</span>
                </div>
                <span className="ml-auto paper-cap text-[#b91c1c] border-2 border-[#b91c1c] px-2 py-0.5">Classified</span>
              </div>

              {/* What this term is judged on (the old metric chip) */}
              <div className="flex flex-col gap-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-[14px] font-bold" style={{ color: tone.dark }}>Judged on: {judged.on}</span>
                  <button
                    type="button"
                    onClick={handleMetricClick}
                    className="paper-btn text-[12px] font-bold underline"
                    style={{ color: tone.dark }}
                  >
                    {rule.targetMetricAbbreviation} · what’s that?
                  </button>
                </div>
                {showDefinition && (
                  <div className="border-l-4 pl-2.5 py-1 text-[14px] leading-snug bg-white/40" style={{ borderColor: tone.dark }}>
                    <b>{rule.targetMetricName} ({rule.targetMetricAbbreviation}).</b> {rule.targetMetricDescription}
                  </div>
                )}
              </div>

              <p className="m-0 text-[18px] leading-relaxed whitespace-pre-wrap min-h-[300px]">{displayedText}</p>

              <div className="mt-auto flex items-end justify-between gap-3">
                {isRetryingTerm ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleProceed(true); }}
                    className="paper-btn paper-cap text-stone-500 underline"
                  >
                    Skip briefing
                  </button>
                ) : <span />}
                <span className="paper-cap text-stone-500">{!open || isTyping ? 'Click to finish reading' : 'Click to begin the term ▸'}</span>
              </div>
            </motion.div>
      </div>
    </motion.div>
  );
}