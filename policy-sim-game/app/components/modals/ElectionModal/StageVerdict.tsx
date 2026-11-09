import React, { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ElectionCycle } from '../../../utils/types';
import { CYCLE_COLORS } from '../../../utils/uiHelpers';
import { track } from '../../../client/telemetry';
import { getPMProfile } from '../../../utils/pmProfiles';
import { FRAMEWORK_RULES } from '../../../utils/frameworkRules';
import { PM_TONES } from '../../desk/deskTheme';
import { makePoll, formatPollRange, POLL_HALF_WIDTH_FINAL, WIN_THRESHOLD } from '../../../utils/polls';
import PMFigure from './PMFigure';

const CONFETTI_COLORS = [...Object.values(CYCLE_COLORS), '#f59e0b'];

const Confetti = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-[10000] flex justify-center">
    {Array.from({ length: 240 }).map((_, i) => (
      <motion.div
        key={i}
        initial={{ y: -50, x: (Math.random() - 0.5) * window.innerWidth * 0.4, opacity: 1, rotate: 0 }}
        animate={{
          y: window.innerHeight + 50,
          x: (Math.random() - 0.5) * window.innerWidth * 1.1,
          opacity: [1, 1, 0],
          rotate: 360 + Math.random() * 720,
        }}
        transition={{ duration: 2.5 + Math.random() * 2, ease: 'easeOut', delay: Math.random() * 1.2 }}
        className="absolute w-3 h-3"
        style={{
          backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          borderRadius: i % 3 === 0 ? '50%' : '2px',
          top: '-20px',
        }}
      />
    ))}
  </div>
);

interface StageVerdictProps {
  /** The real approval, revealed here for the first time. */
  approvalRating: number;
  won: boolean;
  currentCycle: ElectionCycle;
  attemptNumber: number;
  onReady: () => void;
  /** Moves the election sequence on to the next stage. */
  onContinue: () => void;
  /** This term's poll error (utils/polls.ts), for the final poll on the tally. */
  pollError: number;
  /** The measure when the term began and now, for the ticker. */
  startScore: number;
  endScore: number;
  /** Coming Back to this stage: show the result straight away, don't count (or log) it again. */
  alreadySeen?: boolean;
}

// The scene is drawn on a 1440 × 900 stage and scaled to fit the screen (letterboxed).
const STAGE_W = 1440;
const STAGE_H = 900;
const subscribeResize = (cb: () => void) => {
  window.addEventListener('resize', cb);
  return () => window.removeEventListener('resize', cb);
};
const getViewW = () => window.innerWidth;
const getViewH = () => window.innerHeight;

const abs = (s: React.CSSProperties): React.CSSProperties => ({ position: 'absolute', ...s });

/**
 * Election night. A TV broadcast counts up to the PM's real approval (seen for
 * the first time; until now there were only polls) against the final poll and
 * the 51% line. If they won, the coverage cuts to their victory rally.
 * Telemetry as before: verdict_shown, verdict_dwell, verdict_celebrate_clicked.
 */
export default function StageVerdict({
  approvalRating, won, currentCycle, attemptNumber, onReady, onContinue, pollError, startScore, endScore, alreadySeen = false,
}: StageVerdictProps) {
  const [displayScore, setDisplayScore] = useState(alreadySeen ? approvalRating : 0);
  const [isDone, setIsDone] = useState(alreadySeen);
  const [ready, setReady] = useState(alreadySeen);
  const [counting, setCounting] = useState(false);
  const [atRally, setAtRally] = useState(alreadySeen && won);
  const [showCelebrate, setShowCelebrate] = useState(alreadySeen && won);
  const [confettiKey, setConfettiKey] = useState(0);

  const onReadyRef = useRef(onReady);
  const shownAt = useRef(0);

  const viewW = useSyncExternalStore(subscribeResize, getViewW, () => STAGE_W);
  const viewH = useSyncExternalStore(subscribeResize, getViewH, () => STAGE_H);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  // Coming back: nothing to count, Continue is available straight away
  useEffect(() => {
    if (alreadySeen) onReadyRef.current();
  }, [alreadySeen]);

  // Fire verdict_shown once when this stage mounts (not on a revisit)
  useEffect(() => {
    if (alreadySeen) return;
    shownAt.current = Date.now();
    track('verdict_shown', {
      cycle: ElectionCycle[currentCycle],
      won,
      approval_rating: approvalRating,
      attempt_number: attemptNumber,
    });
  }, []);

  // The count: same timing as before (2 s pause, 4 s count, Continue 2 s later)
  useEffect(() => {
    if (alreadySeen) return;
    let start = 0;
    const DURATION = 4000;
    const DELAY = 2500;
    let rafId: number;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const animate = (now: number) => {
      if (!start) start = now;
      const elapsed = now - start;

      if (elapsed < DELAY) {
        rafId = requestAnimationFrame(animate);
        return;
      }
      if (elapsed - DELAY < 50) setCounting(true);

      const progress = Math.min((elapsed - DELAY) / DURATION, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(eased * approvalRating);

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      } else {
        setIsDone(true);
        timers.push(setTimeout(() => {
          // Record how long they dwelled on this screen before the Continue button unlocked
          track('verdict_dwell', {
            cycle: ElectionCycle[currentCycle],
            won,
            dwell_ms: Date.now() - shownAt.current,
          });
          onReadyRef.current();
          setReady(true);
        }, 2000));
        if (won) {
          // Cut to the winner's rally, then offer Celebrate
          timers.push(setTimeout(() => setAtRally(true), 2600));
          timers.push(setTimeout(() => setShowCelebrate(true), 5100));
        }
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(rafId);
      timers.forEach(clearTimeout);
    };
  }, [approvalRating]);

  const handleCelebrate = () => {
    track('verdict_celebrate_clicked', { cycle: ElectionCycle[currentCycle] });
    setConfettiKey(k => k + 1);
  };

  // ── What's shown ──
  const scale = Math.min(viewW / STAGE_W, viewH / STAGE_H);
  const offX = (viewW - STAGE_W * scale) / 2;
  const offY = (viewH - STAGE_H * scale) / 2;

  const profile = getPMProfile(currentCycle);
  const tone = PM_TONES[currentCycle];
  const rule = FRAMEWORK_RULES[currentCycle];
  const fullName = profile.name.replace(/^PM\s+/, '');
  const surname = fullName.split(' ').slice(-1)[0];
  const finalPoll = makePoll(approvalRating, POLL_HALF_WIDTH_FINAL, pollError);
  const pollRange = formatPollRange(finalPoll);
  // Rally placards: wide enough for the longest surname
  const signFont = surname.length > 6 ? 24 : 26;
  const signW = Math.max(130, surname.length * (signFont * 0.8) + 44);
  const shown = displayScore.toFixed(1) === '100.0' ? '100' : displayScore.toFixed(1);
  const resultColour = !isDone ? '#f8fafc' : won ? '#6ee7b7' : '#d4d4d8';

  // Drawn straight onto the page: inside the election window, which scales in
  // as it opens, a full-screen layer would be trapped in that window's box.
  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-hidden text-slate-50" style={{ background: atRally ? '#0b1023' : '#0b1020' }}>
      {confettiKey > 0 && <Confetti key={confettiKey} />}
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: STAGE_W, height: STAGE_H, transform: `translate(${offX}px, ${offY}px) scale(${scale})` }}>
        {!atRally ? (
          /* ── The count, on TV ── */
          <div style={abs({ inset: 0, background: 'radial-gradient(ellipse at 50% 0%, #1e293b, #0b1020 70%)', overflow: 'hidden' })}>
            <div style={abs({ inset: 0, background: 'repeating-linear-gradient(90deg, rgba(255,255,255,.025) 0 1px, transparent 1px 80px), repeating-linear-gradient(0deg, rgba(255,255,255,.025) 0 1px, transparent 1px 80px)' })} />

            {/* Channel bug and clock */}
            <div style={abs({ left: 40, top: 32, display: 'flex', alignItems: 'center', gap: 14 })}>
              <div style={{ background: '#b91c1c', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="tv-blink" style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffffff' }} />
                <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: '.06em', textTransform: 'uppercase' }}>Live</span>
              </div>
              <span style={{ fontSize: 30, fontWeight: 900, letterSpacing: '.02em', textTransform: 'uppercase' }}>Election Night</span>
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: '#94a3b8' }}>Channel 6 News</span>
            </div>
            <div style={abs({ right: 40, top: 36, fontSize: 28, fontWeight: 900, color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' })}>
              {isDone ? '04:12' : counting ? '01:30' : '22:00'}
            </div>

            {/* The candidate */}
            <div style={abs({ left: 80, top: 130, width: 380, height: 520, background: `linear-gradient(180deg, ${tone.color}, ${tone.dark})`, overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,.5)' })}>
              <div style={abs({ inset: 0, background: 'repeating-linear-gradient(-45deg, rgba(255,255,255,.07) 0 12px, transparent 12px 24px)' })} />
              <div style={abs({ left: '50%', top: 90, transform: 'translateX(-50%)', filter: isDone && !won ? 'grayscale(.8)' : 'none', transition: 'filter .8s ease' })}>
                <PMFigure cycle={currentCycle} scale={2.4} />
              </div>
              <div style={abs({ left: 0, right: 0, bottom: 0, background: '#0b1020', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 4 })}>
                <span style={{ fontSize: 34, fontWeight: 900, lineHeight: 1, textTransform: 'uppercase' }}>{fullName}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: tone.light }}>“{profile.slogan}” · judged on {rule.targetMetricName}</span>
              </div>
            </div>

            {/* The count */}
            <div style={abs({ left: 520, top: 130, right: 80, height: 520, display: 'flex', flexDirection: 'column', gap: 16 })}>
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: '#94a3b8' }}>
                {isDone ? 'Result declared' : counting ? 'Counting votes' : `Polls have closed · the final poll said ${pollRange}`}
              </span>
              <motion.span
                key={isDone ? 'result' : 'counting'}
                initial={isDone ? { scale: 1.5, opacity: 0 } : false}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.45, ease: [0.2, 0.8, 0.3, 1] }}
                style={{ fontSize: 84, fontWeight: 900, lineHeight: 0.9, whiteSpace: 'nowrap', textTransform: 'uppercase', color: resultColour, transformOrigin: '0% 50%' }}
              >
                {isDone ? (won ? 'Re-elected' : 'Voted out') : 'Counting votes'}
              </motion.span>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#cbd5e1', minHeight: 24 }}>
                {isDone
                  ? (won ? 'The public has backed our vision for the country.' : "The public feels we didn't do enough to address their concerns.")
                  : counting ? 'Awaiting final tally' : 'Tonight you find out your real approval for the first time.'}
              </span>

              <div style={{ background: 'rgba(255,255,255,.06)', padding: '26px 28px 38px', display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: '#94a3b8' }}>Final approval</span>
                  <span style={{ fontSize: 112, fontWeight: 900, lineHeight: 0.85, color: resultColour, fontVariantNumeric: 'tabular-nums' }}>{shown}%</span>
                </div>
                <div style={{ position: 'relative', height: 46, background: 'rgba(255,255,255,.1)', marginTop: 26 }}>
                  <div style={abs({ left: 0, top: 0, bottom: 0, width: `${Math.min(100, displayScore)}%`, background: !isDone ? tone.color : won ? '#10b981' : '#71717a' })} />
                  {/* The final poll's range, dashed */}
                  <div style={abs({ left: `${finalPoll.low}%`, width: `${finalPoll.high - finalPoll.low}%`, top: -8, bottom: -8, border: '2px dashed #fbbf24', boxSizing: 'border-box', background: 'rgba(251,191,36,.12)' })} />
                  <span style={abs({ left: `${finalPoll.low}%`, top: -30, whiteSpace: 'nowrap', fontSize: 11, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: '#fbbf24' })}>Final poll {pollRange}</span>
                  <div style={abs({ left: `${WIN_THRESHOLD}%`, top: -10, bottom: -10, borderLeft: '4px solid #f8fafc' })} />
                  <span style={abs({ left: `${WIN_THRESHOLD}%`, top: 54, transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontSize: 11, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase' })}>Required: 51.0%</span>
                </div>
              </div>

              {ready && !won && (
                <button
                  type="button"
                  onClick={onContinue}
                  className="cursor-pointer hover:brightness-110"
                  style={{ marginTop: 'auto', alignSelf: 'flex-end', font: 'inherit', fontWeight: 900, fontSize: 16, background: '#d6b25e', color: '#1c1917', border: 0, borderRadius: 10, padding: '16px 24px' }}
                >
                  Tomorrow’s paper ▶
                </button>
              )}
            </div>

            {/* Lower third and ticker */}
            <div style={abs({ left: 0, right: 0, bottom: 70, height: 56, background: '#f8fafc', color: '#0b1020', display: 'flex', alignItems: 'center' })}>
              <div style={{ background: '#b91c1c', color: '#ffffff', height: '100%', display: 'flex', alignItems: 'center', padding: '0 22px', fontSize: 24, fontWeight: 900, textTransform: 'uppercase' }}>Breaking</div>
              <span style={{ padding: '0 22px', fontSize: 20, fontWeight: 800 }}>
                {isDone
                  ? (won ? `${surname} re-elected with ${approvalRating.toFixed(1)}% approval` : `${surname} out: ${approvalRating.toFixed(1)}% approval, short of the 51% needed`)
                  : 'Polls closed: count under way across the country'}
              </span>
            </div>
            <div style={abs({ left: 0, right: 0, bottom: 30, height: 40, background: '#0b1020', overflow: 'hidden', borderTop: '2px solid #b91c1c' })}>
              <div className="tv-ticker" style={{ display: 'flex', whiteSpace: 'nowrap', width: 'max-content', height: '100%', alignItems: 'center', gap: 60, fontSize: 15, fontWeight: 700, color: '#cbd5e1' }}>
                {[0, 1].map(k => (
                  <React.Fragment key={k}>
                    <span>Polls closed at 10pm</span>
                    <span>{rule.targetMetricName}: {startScore.toFixed(2)} when {surname} took office, {endScore.toFixed(2)} tonight</span>
                    <span>Final poll: {pollRange}, {finalPoll.status.toLowerCase()}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ── Won: live from the victory rally ── */
          <div style={abs({ inset: 0, background: 'linear-gradient(180deg, #0b1023, #111a35)', overflow: 'hidden' })}>
            {/* The camera pulled back: the whole set at 80%, widened so the edges stay filled */}
            <div style={abs({ inset: 0, transform: 'scale(0.8)', transformOrigin: '50% 50%' })}>
            {/* Lighting rig */}
            <div style={abs({ left: -400, right: -400, top: -300, height: 326, background: '#111827' })} />
            {[-30, 160, 350, 540, 720, 900, 1090, 1280, 1470].map(x => (
              <React.Fragment key={x}>
                <div style={abs({ left: x - 130, top: 18, width: 260, height: 640, clipPath: 'polygon(46% 0, 54% 0, 100% 100%, 0 100%)', background: 'linear-gradient(180deg, rgba(191,219,254,.22), rgba(191,219,254,0))' })} />
                <div style={abs({ left: x - 11, top: 14, width: 22, height: 22, borderRadius: '50%', background: '#e0f2fe', boxShadow: '0 0 16px #bfdbfe' })} />
              </React.Fragment>
            ))}

            {/* Backdrop: name and slogan */}
            <div style={abs({ left: 180, right: 180, top: 80, height: 400, background: `linear-gradient(180deg, ${tone.color}, ${tone.dark})`, borderRadius: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' })}>
              <span style={{ fontSize: 170, fontWeight: 900, lineHeight: 0.85, letterSpacing: '.02em', textTransform: 'uppercase', color: 'rgba(255,255,255,.95)' }}>{surname}</span>
              <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: '.24em', textTransform: 'uppercase', color: 'rgba(255,255,255,.8)', paddingLeft: '.24em' }}>{profile.slogan}</span>
            </div>

            {/* Stage, the PM jumping, the podium */}
            <div style={abs({ left: -400, right: -400, top: 520, height: 40, background: '#1e293b', borderTop: `4px solid ${tone.color}` })} />
            <div style={abs({ left: -400, right: -400, top: 560, bottom: -300, background: '#0b1023' })} />
            <div className="rally-jump" style={abs({ left: 720 - (90 * 2.6) / 2, top: 80 })}>
              <PMFigure cycle={currentCycle} scale={2.6} pose="cheering" legs />
            </div>
            <div style={abs({ left: 600, top: 430, width: 240, height: 130, background: tone.color, clipPath: 'polygon(0 0, 100% 0, 94% 100%, 6% 100%)', borderTop: '12px solid #e2e8f0', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 900, textTransform: 'uppercase' })}>
              {surname}
            </div>

            {/* Confetti */}
            {Array.from({ length: 56 }, (_, i) => (
              <div
                key={i}
                className="rally-confetti"
                style={abs({
                  left: -220 + ((i * 211) % (STAGE_W + 440)), top: -140, width: 8 + (i % 3) * 3, height: 14 + (i % 4) * 3,
                  background: [tone.color, tone.light, '#ffffff', '#facc15', tone.dark][i % 5],
                  animationDuration: `${2.6 + (i % 5) * 0.45}s`, animationDelay: `${(i % 12) * 0.18}s`,
                })}
              />
            ))}

            {/* The crowd */}
            {Array.from({ length: 24 }, (_, i) => {
              const s = 78 + (i % 3) * 12;
              return (
                <div key={i} style={abs({ left: -420 + i * 100 + (i % 2) * 18, top: 700 + (i % 3) * 22, width: s, height: 400 })}>
                  {i % 4 === 1 && (
                    <div className="rally-wave" style={abs({ left: s * 0.6, top: -110, width: 4, height: 130, background: '#cbd5e1' })}>
                      <div style={abs({ left: 4, top: 0, width: 70, height: 44, background: i % 2 ? tone.color : '#ffffff' })} />
                    </div>
                  )}
                  {i % 5 === 3 && (
                    /* A placard on a stick, sized to fit the name */
                    <div className="rally-wave" style={abs({ left: s / 2 - signW / 2, top: -150, width: signW, height: 130 })}>
                      <div style={abs({ left: signW / 2 - 2, top: 56, width: 4, height: 74, background: '#cbd5e1' })} />
                      <div style={abs({ left: 0, top: 0, width: signW, height: 60, background: '#ffffff', color: tone.dark, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: signFont, fontWeight: 900, textTransform: 'uppercase', whiteSpace: 'nowrap' })}>
                        {surname}!
                      </div>
                    </div>
                  )}
                  <div style={abs({ left: 0, top: 0, width: s, height: s, borderRadius: '50%', background: '#05070f' })} />
                  <div style={abs({ left: -s * 0.35, top: s * 0.8, width: s * 1.7, height: 300, borderRadius: '60px 60px 0 0', background: '#05070f' })} />
                </div>
              );
            })}

            </div>

            {/* The cut: a camera flash */}
            <motion.div initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }} style={abs({ inset: 0, background: '#ffffff', pointerEvents: 'none' })} />

            <div style={abs({ left: 28, top: 40, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,.6)', borderRadius: 6, padding: '7px 12px' })}>
              <span className="tv-blink" style={{ width: 9, height: 9, borderRadius: '50%', background: '#ef4444' }} />
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase' }}>Live from the {surname} rally</span>
            </div>
            <motion.div
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8, duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
              style={abs({ left: 40, bottom: 50, display: 'flex', alignItems: 'stretch', boxShadow: '0 14px 30px rgba(0,0,0,.5)' })}
            >
              <div style={{ background: '#dc2626', padding: '0 22px', display: 'flex', alignItems: 'center', fontSize: 16, fontWeight: 900, letterSpacing: '.14em', textTransform: 'uppercase' }}>Result</div>
              <div style={{ background: '#ffffff', color: '#0f172a', borderBottom: `5px solid ${tone.color}`, padding: '10px 24px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 44, fontWeight: 900, lineHeight: 1, textTransform: 'uppercase' }}>{surname} holds on!</span>
                <span style={{ fontSize: 20, fontWeight: 600, color: '#334155' }}>{fullName} re-elected with {approvalRating.toFixed(1)}% approval</span>
              </div>
            </motion.div>

            <div style={abs({ right: 40, bottom: 60, display: 'flex', gap: 12, alignItems: 'center' })}>
              <AnimatePresence>
                {showCelebrate && (
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    onClick={handleCelebrate}
                    className="cursor-pointer hover:brightness-110"
                    style={{ font: 'inherit', fontWeight: 800, fontSize: 14, letterSpacing: '.1em', textTransform: 'uppercase', background: 'rgba(52,211,153,.18)', color: '#6ee7b7', border: '1px solid rgba(110,231,183,.5)', borderRadius: 999, padding: '12px 18px' }}
                  >
                    Celebrate
                  </motion.button>
                )}
              </AnimatePresence>
              {ready && (
                <button
                  type="button"
                  onClick={onContinue}
                  className="cursor-pointer hover:brightness-110"
                  style={{ font: 'inherit', fontWeight: 900, fontSize: 16, background: '#ffffff', color: '#0f172a', border: 0, borderRadius: 10, padding: '16px 22px', boxShadow: '0 14px 30px rgba(0,0,0,.5)' }}
                >
                  Tomorrow’s paper ▶
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}