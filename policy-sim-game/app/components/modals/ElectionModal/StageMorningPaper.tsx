import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { AxisVariable, ElectionCycle, Respondent } from '../../../utils/types';
import { FRAMEWORK_RULES } from '../../../utils/frameworkRules';
import { PM_PROFILES, getPMProfile } from '../../../utils/pmProfiles';
import { track } from '../../../client/telemetry';
import { useGame } from '../../../context/GameStateContext';
import { PM_TONES } from '../../desk/deskTheme';
import { makePoll, formatPollRange, POLL_HALF_WIDTH_FINAL, POLL_HALF_WIDTH_POLLING_DAY, WIN_THRESHOLD } from '../../../utils/polls';
import D3Chart from '../../D3Chart';
import PMFigure from './PMFigure';
import { buildTermTimeline, ANALYSIS_MESSAGES, MARKER_LABELS } from './StageTermSummary';
import { computeCohortBreakdown, CHANGE_THRESHOLD } from './StagePopulationChange';
import { pickVoters, renderVoterQuote, quotedPolicies } from './StageElectorateFeedback';
import type { PressSummary } from './StagePressConference';

/** Each page of the paper is one of the old election stages, for telemetry. */
const PAGE_STAGES = ['paper_front', 'term_summary', 'wellbeing_changes', 'electorate_feedback', 'paper_back'] as const;
const LAST = PAGE_STAGES.length - 1;

export type PaperExit = 'restart' | 'next_term' | 'finish_game' | 'lost_restart';

interface StageMorningPaperProps {
  currentCycle: ElectionCycle;
  won: boolean;
  /** False after a loss that must be replayed (fewer than 3 attempts). */
  canProceed: boolean;
  isFinalCycle: boolean;
  approvalRating: number;
  pollError: number;
  initialPopulation: Respondent[];
  baselinePopulation: Respondent[];
  finalPopulation: Respondent[];
  yAxisMax: number;
  pressSummary: PressSummary | null;
  /** Coming straight from the victory rally: the rally shrinks into the front-page photo. */
  fromRally: boolean;
  /** Back from the front page to election night. */
  onBack: () => void;
  /** election_stage_navigated, for turning between pages. */
  onNavigate: (from: string, to: string, direction: 'continue' | 'back', msOnStage: number, msAfterUnlock: number | null) => void;
  /** The back page's buttons (election_exit_clicked is logged by the caller). */
  onExit: (action: PaperExit, msOnStage: number, msAfterUnlock: number | null) => void;
}

// The paper sits on a 1440 × 900 stage, scaled to fit the screen.
const STAGE_W = 1440;
const STAGE_H = 900;
const subscribeResize = (cb: () => void) => {
  window.addEventListener('resize', cb);
  return () => window.removeEventListener('resize', cb);
};
const getViewW = () => window.innerWidth;
const getViewH = () => window.innerHeight;

const abs = (s: React.CSSProperties): React.CSSProperties => ({ position: 'absolute', ...s });

/** The front-page photo's size (the rally picture, 1440 × 900, scaled down). */
const PHOTO = { w: 312, h: 195 };

/**
 * The morning after: the term's sum-up as a newspaper you page through.
 * Front page (the result and the press conference) → how the country moved
 * (the term summary timeline) → who won and who lost (wellbeing changes) →
 * what the voters say (electorate feedback) → back page (next up, and the exits).
 * Each page keeps the telemetry of the stage it replaces.
 */
export default function StageMorningPaper(props: StageMorningPaperProps) {
  const {
    currentCycle, won, canProceed, isFinalCycle, approvalRating, pollError,
    initialPopulation, baselinePopulation, finalPopulation, yAxisMax, pressSummary, fromRally, onBack, onNavigate, onExit,
  } = props;

  const cycleName = ElectionCycle[currentCycle];
  const rule = FRAMEWORK_RULES[currentCycle];
  // The term's target, worked out as the desk shows it
  const { cycleMAO } = useGame();
  const targetScore = cycleMAO * rule.winThresholdScalar;
  const profile = getPMProfile(currentCycle);
  const tone = PM_TONES[currentCycle];
  const fullName = profile.name.replace(/^PM\s+/, '');
  const surname = fullName.split(' ').slice(-1)[0];

  const viewW = useSyncExternalStore(subscribeResize, getViewW, () => STAGE_W);
  const viewH = useSyncExternalStore(subscribeResize, getViewH, () => STAGE_H);

  // ── Paging (one page in focus; turning forward into a spread flips one leaf) ──
  const [st, setSt] = useState(0);
  const [fwd, setFwd] = useState(true);
  const [turnKey, setTurnKey] = useState(0);
  const [readySt, setReadySt] = useState<number | null>(null);
  const stageShownAt = useRef(0);
  const stageReadyAt = useRef<number | null>(null);

  // Telemetry for the page in focus, exactly as its old stage logged it
  useEffect(() => {
    const openedAt = Date.now();
    stageShownAt.current = openedAt;
    stageReadyAt.current = null;
    const markReady = () => { stageReadyAt.current = Date.now(); setReadySt(st); };
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (st === 1) {
      track('term_summary_opened', { cycle: cycleName });
      timer = setTimeout(() => {
        track('term_summary_closed', { cycle: cycleName, dwell_ms: Date.now() - openedAt });
        markReady();
      }, 1000);
    } else {
      if (st === 2) track('wellbeing_changes_opened', { cycle: cycleName });
      if (st === 3) {
        track('electorate_feedback_opened', { cycle: cycleName });
      }
      timer = setTimeout(markReady, 0);
    }
    return () => {
      clearTimeout(timer);
      if (st === 2) track('wellbeing_changes_closed', { cycle: cycleName, dwell_ms: Date.now() - openedAt });
      if (st === 3) track('electorate_feedback_closed', { cycle: cycleName, dwell_ms: Date.now() - openedAt, policies_clicked: 0 }); // the bills are explained on the page now, nothing to click
    };
  }, [st, cycleName]);

  const ready = readySt === st;
  const timing = () => {
    const now = Date.now();
    return { msOnStage: now - stageShownAt.current, msAfterUnlock: stageReadyAt.current ? now - stageReadyAt.current : null };
  };
  const go = (n: number) => {
    if (n < 0) { onBack(); return; }
    if (n > LAST || n === st) return;
    if (n > st && !ready) return;
    const t = timing();
    onNavigate(PAGE_STAGES[st], PAGE_STAGES[n], n > st ? 'continue' : 'back', t.msOnStage, t.msAfterUnlock);
    setFwd(n > st);
    setTurnKey((k) => k + 1);
    setSt(n);
  };
  const exit = (action: PaperExit) => {
    const t = timing();
    onExit(action, t.msOnStage, t.msAfterUnlock);
  };

  // Pages: 1 = front (right); then spreads (2|3), (4|5)
  const LEFT = 0, RIGHT = 640;
  const spreadOf = (x: number) => (x === 0 ? 0 : Math.ceil(x / 2));
  const cur = spreadOf(st);
  const turning = fwd && st % 2 === 1;
  const page = (n: number) => {
    const sp = n === 1 ? 0 : Math.floor(n / 2);
    const side = n % 2 === 1 ? RIGHT : LEFT;
    const old = turning && sp === cur - 1, fresh = turning && sp === cur;
    const oldRight = old && side === RIGHT, newLeft = fresh && side === LEFT;
    const anim = oldRight ? 'paper-leafF' : newLeft ? 'paper-leafB' : '';
    const z = oldRight ? 5 : newLeft ? 4 : fresh ? 2 : old ? 1 : 2;
    const focus = st === 0 ? n === 1 : n === st + 1;
    return {
      key: anim ? `p${n}-turn-${turnKey}` : `p${n}`,
      className: `paper-page ${side === LEFT ? 'paper-pl' : 'paper-pr'} ${anim}`,
      style: { left: side, display: sp === cur || old ? 'flex' : 'none', zIndex: z } as React.CSSProperties,
      dim: focus ? 0 : 0.55,
    };
  };
  const focusSide = st === 0 ? RIGHT : ((st + 1) % 2 === 0 ? LEFT : RIGHT);
  const tx = focusSide === LEFT ? 320 : -320;

  // ── Front page ──
  const finalPoll = makePoll(approvalRating, POLL_HALF_WIDTH_FINAL, pollError);
  const morningPoll = pressSummary ? makePoll(pressSummary.startApproval, POLL_HALF_WIDTH_POLLING_DAY, pollError) : null;

  // Where the photo landed on the stage, for the rally to shrink into
  const photoRef = useRef<HTMLDivElement>(null);
  const [photoAt, setPhotoAt] = useState<{ x: number; y: number } | null>(null);

  // ── p2: how the country moved (term summary) ──
  const timelineData = useMemo(() => buildTermTimeline(finalPopulation, currentCycle), [finalPopulation, currentCycle]);
  const safeYAxisMax = useMemo(() => {
    let maxCount = 0;
    timelineData.forEach(td => {
      const turnMax = Math.max(...td.histogram.map(h => h.count));
      if (turnMax > maxCount) maxCount = turnMax;
    });
    return Math.ceil(Math.max(maxCount, yAxisMax) / 10) * 10;
  }, [timelineData, yAxisMax]);
  const startMetric = timelineData[0]?.score || 0;
  const endMetric = timelineData[timelineData.length - 1]?.score || 0;
  const [activeTurn, setActiveTurn] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const timelineCompletedRef = useRef(false);

  useEffect(() => {
    if (!isPlaying) return;
    if (activeTurn >= timelineData.length - 1) {
      const t0 = setTimeout(() => setIsPlaying(false), 0);
      if (!timelineCompletedRef.current) {
        timelineCompletedRef.current = true;
        track('term_summary_timeline_completed', { cycle: cycleName, was_auto: true });
      }
      return () => clearTimeout(t0);
    }
    const timer = setTimeout(() => setActiveTurn(prev => prev + 1), 1500);
    return () => clearTimeout(timer);
  }, [isPlaying, activeTurn, timelineData.length, cycleName]);

  const handlePlayPause = () => {
    if (activeTurn >= timelineData.length - 1) {
      setActiveTurn(0);
      setIsPlaying(true);
      track('term_summary_timeline_started', { cycle: cycleName });
    } else {
      if (!isPlaying) track('term_summary_timeline_started', { cycle: cycleName });
      else track('term_summary_timeline_paused', { cycle: cycleName, at_turn: activeTurn });
      setIsPlaying(!isPlaying);
    }
  };
  const activeData = timelineData[activeTurn];

  // ── Glossary notes (were the floating definition cards) ──
  const [metricNote, setMetricNote] = useState(false);

  // ── p3: who won and who lost ──
  const cohorts = useMemo(() => computeCohortBreakdown(finalPopulation, currentCycle), [finalPopulation, currentCycle]);
  const COHORTS = [
    { key: 'improved' as const, label: 'Improved', colour: '#1d4ed8' },
    { key: 'stable' as const, label: 'Unchanged', colour: '#57534e' },
    { key: 'declined' as const, label: 'Declined', colour: '#b45309' },
  ];
  const totalPop = finalPopulation.length || 1;
  // Starting life situations, as on the old Wellbeing Changes screen
  const SITUATIONS: [string, string][] = [['Struggling', '0–3'], ['Just Getting By', '3–5'], ['Comfortable', '5–8'], ['Thriving', '8–10']];

  // ── p4: what the voters say ──
  const voters = useMemo(
    () => pickVoters(finalPopulation, initialPopulation, baselinePopulation, currentCycle),
    [finalPopulation, initialPopulation, baselinePopulation, currentCycle],
  );
  const pmSurname = profile.name.split(' ').pop() || 'the Prime Minister';

  // ── Back page: next up ──
  const levelIndex = PM_PROFILES.findIndex((p) => p.cycle === currentCycle);
  const field = PM_PROFILES.map((p, i) => {
    const t = PM_TONES[p.cycle];
    const r = FRAMEWORK_RULES[p.cycle];
    const isNow = i === levelIndex;
    const isNext = won && canProceed && i === levelIndex + 1;
    return {
      cycle: p.cycle, name: p.name.replace(/^PM\s+/, ''), slogan: p.slogan, colour: t.color, dark: t.dark,
      tag: isNow ? `Term ${i + 1} · just finished` : isNext ? `Next up · term ${i + 1}` : i < levelIndex ? `Term ${i + 1} · played` : `Term ${i + 1}`,
      status: isNow
        ? (won ? `Re-elected on ${approvalRating.toFixed(1)}% · ${r.targetMetricAbbreviation} ${endMetric.toFixed(2)} vs target ${targetScore.toFixed(2)}` : `Voted out on ${approvalRating.toFixed(1)}%, short of the 51% needed`)
        : isNext ? `Judged on ${r.targetMetricName}. Starts from the same country as every PM.` : i < levelIndex ? 'Term played' : 'Still campaigning',
      isNow, isNext, faded: !isNow && !isNext,
    };
  });

  // ── Scale the stage to fit ──
  const scale = Math.min(viewW / STAGE_W, viewH / STAGE_H);
  const offX = (viewW - STAGE_W * scale) / 2;
  const offY = (viewH - STAGE_H * scale) / 2;

  const headline = won ? `${surname.toUpperCase()} HOLDS ON` : `${surname.toUpperCase()} IS OUT`;
  const subline = won
    ? (finalPoll.status === 'Too close to call' ? 'The polls called it a coin toss. The country has given the Prime Minister another term.' : 'The country has given the Prime Minister another term.')
    : (endMetric >= targetScore ? 'The target was met. It wasn’t enough for the voters.' : 'The voters have shown the Prime Minister the door.');
  // How the press conference changed the result, told as a story
  const correctCount = pressSummary ? pressSummary.questions.filter((q) => q.correct).length : 0;
  const asked = pressSummary?.questions.length ?? 0;
  const pressStart = pressSummary?.startApproval ?? approvalRating;
  const pressSwing = approvalRating - pressStart;
  const swungIt = pressStart < WIN_THRESHOLD && approvalRating >= WIN_THRESHOLD;
  const costIt = pressStart >= WIN_THRESHOLD && approvalRating < WIN_THRESHOLD;
  const pressHeadline = swungIt ? 'The press conference won it' : costIt ? 'The press conference cost it' : 'The final press conference';
  const answered = asked === 0 ? 'took no questions'
    : correctCount === asked ? (asked === 1 ? 'got the question right' : 'got both questions right')
    : correctCount === 0 ? (asked === 1 ? 'got the question wrong' : 'got both questions wrong')
    : `got ${correctCount} of ${asked} questions right`;
  const atCeiling = pressSwing <= 0.05 && correctCount > 0 && pressStart >= 99.95;
  const atFloor = pressSwing >= -0.05 && correctCount < asked && pressStart <= 0.05;
  const swingText = atCeiling ? 'There was no room left to climb: the polls were already as high as they go.'
    : atFloor ? 'There was no further to fall.'
    : pressSwing > 0.05 ? `The answers were worth ${pressSwing.toFixed(1)} points.` : pressSwing < -0.05 ? `The answers cost ${Math.abs(pressSwing).toFixed(1)} points.` : 'The answers left the vote where it was.';
  const pressStory = morningPoll
    ? `${surname} polled at ${formatPollRange(morningPoll)} moments before the final press conference outside 10 Downing Street, and ${answered}. ${swingText} The last poll before the count put ${surname} on ${formatPollRange(finalPoll)}.${swungIt ? ` Without those answers, ${surname} would have lost.` : costIt ? ` Before them, ${surname} was on course to win.` : ''}`
    : '';

  // Measure the photo once the paper is laid out (the stage is scaled, so undo that)
  useLayoutEffect(() => {
    const el = photoRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPhotoAt({ x: (r.left - offX) / scale, y: (r.top - offY) / scale });
    // Measured once, when the paper lands
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-hidden desk-wood">
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: STAGE_W, height: STAGE_H, transform: `translate(${offX}px, ${offY}px) scale(${scale})` }}>
        <div style={abs({ left: 80, top: 14, width: 1280, height: 830, perspective: 2800, transform: `translateX(${tx}px)`, transition: 'transform 1.6s cubic-bezier(.45,0,.3,1)' })}>

          {/* ── Front page: the result and the press conference ── */}
          {(() => { const p = page(1); return (
            <div key={p.key} className={p.className} style={p.style}>
              <div className="shrink-0 flex flex-col items-center gap-1 border-b-4 border-double border-stone-900 pb-2">
                <div className="w-full flex justify-between paper-cap whitespace-nowrap"><span>Morning edition</span><span>The morning after the vote</span><span>Page 1</span></div>
                <span className="font-display font-black italic text-[46px] leading-none tracking-tight whitespace-nowrap">The Daily Ledger</span>
              </div>
              <div className="shrink-0 flex flex-col gap-1.5">
                <span className="font-display font-black text-[54px] leading-[.95]" style={{ color: won ? '#15803d' : '#b91c1c' }}>{headline}</span>
                <span className="font-display italic font-bold text-[17px] text-stone-600">{subline}</span>
              </div>
              <div className="grid grid-cols-[312px_1fr] gap-4 flex-1 min-h-0">
                <div className="flex flex-col gap-2 min-h-0">
                  {/* The photo: the rally (or the exit from No. 10), in newsprint */}
                  <div ref={photoRef} className="relative shrink-0 overflow-hidden" style={{ width: PHOTO.w, height: PHOTO.h, filter: 'saturate(.55) sepia(.25) contrast(1.05)' }}>
                    <div style={abs({ left: 0, top: 0, width: STAGE_W, height: STAGE_H, transform: `scale(${PHOTO.w / STAGE_W})`, transformOrigin: '0 0' })}>
                      {won ? <RallyPicture cycle={currentCycle} surname={surname} slogan={profile.slogan} /> : <ExitPicture cycle={currentCycle} />}
                    </div>
                  </div>
                  <span className="text-[11.5px] text-stone-600">{won ? `${fullName} celebrates with supporters as the result comes in.` : `${fullName} leaves No. 10 after the count.`}</span>
                  <div className="border-[3px] border-stone-900 px-3 pt-2 pb-3 flex flex-col gap-2">
                    <div className="flex justify-between items-baseline gap-2"><span className="paper-cap whitespace-nowrap">The result</span><span className="font-display font-black text-[32px] leading-none" style={{ color: won ? '#15803d' : '#b91c1c' }}>{approvalRating.toFixed(1)}%</span></div>
                    <div className="relative h-[18px] bg-[#e7dfcb]">
                      <div style={abs({ left: 0, top: 0, bottom: 0, width: `${Math.min(100, approvalRating)}%`, background: won ? '#15803d' : '#b91c1c' })} />
                      <div style={abs({ left: `${WIN_THRESHOLD}%`, top: -6, bottom: -6, borderLeft: '3px solid #1c1917' })} />
                    </div>
                    <span className="text-[12px] text-stone-700">Approval on the night · 51% needed to win</span>
                  </div>
                  {pressSummary && (
                    <div className="flex flex-col gap-1 pt-1">
                      <span className="font-display font-black text-[19px] leading-tight">{pressHeadline}</span>
                      <p className="m-0 text-[14.5px] leading-snug text-stone-800">{pressStory}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 border-l border-stone-900 pl-3.5 min-h-0">
                  {pressSummary && pressSummary.questions.length > 0 && (
                    <>
                      <span className="paper-cap" style={{ color: tone.dark }}>{surname} faces the press</span>
                      {pressSummary.questions.map((q, i) => (
                        <div key={i} className="flex flex-col gap-0.5 border-b border-stone-300 pb-2">
                          <span className="text-[13.5px] leading-snug text-stone-700"><strong className="text-stone-900">{q.who}, {q.outlet},</strong> asked {q.ask.replace('the Prime Minister', surname)}</span>
                          <span className="text-[15px] font-bold leading-snug">“{q.said}”</span>
                          <span className="text-[13px] font-bold" style={{ color: q.correct ? '#15803d' : '#b91c1c' }}>{q.correct ? '✓ Correct · polls up' : '✗ Wrong · polls down'}</span>
                        </div>
                      ))}
                    </>
                  )}
                  <div className="border-2 border-stone-900 px-2.5 py-2 flex flex-col gap-0.5">
                    <span className="paper-cap">The measure</span>
                    <span className="text-[14.5px] font-bold leading-snug">{rule.targetMetricName}</span>
                    <span className="text-[14.5px] leading-snug"><span className="whitespace-nowrap">{startMetric.toFixed(2)} → {endMetric.toFixed(2)}</span> over the term</span>
                    <span className="text-[14.5px] leading-snug">Target: <strong>{targetScore.toFixed(2)}</strong> <span className="font-bold" style={{ color: endMetric >= targetScore ? '#15803d' : '#b91c1c' }}>{endMetric >= targetScore ? '✓' : '✗'}</span></span>
                    {/* The measure bill by bill, against the target (same box) */}
                    <span className="paper-cap mt-1.5 pt-1.5 border-t border-stone-400">{rule.targetMetricAbbreviation}, bill by bill</span>
                    <MeasureChart scores={timelineData.map((d) => d.score)} target={targetScore} colour={tone.dark} />
                  </div>
                </div>
              </div>
              {/* What's inside: a strip along the foot of the page */}
              <div className="shrink-0 flex justify-between items-baseline gap-3 whitespace-nowrap border-t-4 border-double border-stone-900 pt-1.5">
                <span className="paper-cap">Inside</span>
                {[['The country moved', 2], ['Winners and losers', 3], ['Letters', 4], ['Next up', 5]].map(([t, n]) => (
                  <span key={t} className="font-display font-bold text-[13px] leading-tight">{t} <span className="paper-cap">p{n}</span></span>
                ))}
              </div>
              <div className="paper-dim" style={{ opacity: p.dim }} />
            </div>
          ); })()}

          {/* ── p2: how the country moved (the term summary) ── */}
          {(() => { const p = page(2); return (
            <div key={p.key} className={p.className} style={p.style}>
              <div className="flex justify-between border-b-2 border-stone-900 pb-1"><span className="paper-cap">p2</span><span className="paper-cap">The term in review</span></div>
              <span className="font-display font-black text-[40px] leading-[.95]">How the country moved</span>
              <p className="m-0 text-[15px] leading-relaxed">
                {highlightMetric(ANALYSIS_MESSAGES[currentCycle](startMetric, endMetric, endMetric - startMetric), rule.targetMetricName, () => {
                  track('term_summary_definition_clicked', { cycle: cycleName, metric: rule.targetMetricName });
                  setMetricNote((v) => !v);
                })}
              </p>
              <p className="m-0 -mt-1.5 text-[15px] leading-relaxed">Watch the timeline below to see how {surname}’s agenda shifted the population.</p>
              {metricNote && (
                <div className="border-2 px-3 py-2 text-[13px] leading-normal" style={{ borderColor: tone.dark }}>
                  <span className="paper-cap" style={{ color: tone.dark }}>Glossary · {rule.targetMetricName}</span><br />{rule.targetMetricDescription}
                </div>
              )}
              {activeData && (
                <div className="bg-[rgba(120,90,40,.08)] px-3.5 py-3 flex flex-col gap-2">
                  <div className="flex justify-between items-start gap-3 min-h-[54px]">
                    <div className="flex flex-col gap-0.5 min-w-0"><span className="paper-cap text-stone-500">{activeTurn === 0 ? 'Start of term' : `Bill ${activeTurn}`}</span><span className="font-display font-black text-[20px] leading-tight">{activeData.policyName}</span></div>
                    <div className="flex flex-col items-end gap-0.5 shrink-0"><span className="paper-cap" style={{ color: tone.dark }}>{rule.targetMetricName}</span><span className="font-display font-black text-[30px] leading-none tabular-nums">{activeData.score.toFixed(2)}</span></div>
                  </div>
                  <div className="h-[250px] w-full">
                    <D3Chart
                      hoverTrackId="term_summary"
                      plotType="1D"
                      chartData={[]}
                      histogramData={activeData.histogram}
                      xAxisType={AxisVariable.LifeSatisfaction}
                      yAxisType={rule.yAxisType}
                      color="#d4d4d8"
                      visualStyle="faces"
                      faceCols={2}
                      yAxisMax={safeYAxisMax}
                      markers={[{ value: activeData.score, label: `${MARKER_LABELS[currentCycle]}: ${activeData.score.toFixed(2)}`, color: rule.graphColor, dashed: false }]}
                    />
                  </div>
                  <div className="flex items-center gap-2 border-t border-[rgba(92,66,20,.25)] pt-2">
                    <button type="button" onClick={handlePlayPause} aria-label="Play the timeline" className="w-9 h-9 rounded-full bg-stone-900 text-[#f4efe3] text-[13px] cursor-pointer shrink-0">
                      {isPlaying ? '❚❚' : activeTurn >= timelineData.length - 1 ? '↺' : '▶'}
                    </button>
                    {timelineData.map((d, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { setIsPlaying(false); setActiveTurn(i); track('term_summary_timeline_jumped', { cycle: cycleName, to_turn: i }); }}
                        className="rounded-full px-2.5 py-1 text-[12px] font-extrabold cursor-pointer"
                        style={{ background: activeTurn === i ? tone.dark : activeTurn > i ? '#d6d3d1' : '#fffdf7', color: activeTurn === i ? '#ffffff' : '#44403c' }}
                      >
                        {i === 0 ? 'Start' : `Bill ${i}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <span className="mt-auto text-[12.5px] text-stone-700">Each face is a group of citizens, placed by their life satisfaction (0–10).</span>
              <div className="paper-dim" style={{ opacity: p.dim }} />
            </div>
          ); })()}

          {/* ── p3: who won and who lost (wellbeing changes) ── */}
          {(() => { const p = page(3); return (
            <div key={p.key} className={p.className} style={p.style}>
              <div className="flex justify-between border-b-2 border-stone-900 pb-1"><span className="paper-cap">Wellbeing changes</span><span className="paper-cap">p3</span></div>
              <span className="font-display font-black text-[40px] leading-[.95]">Who won and who lost</span>
              <p className="m-0 text-[15px] leading-relaxed">
                We’ve grouped the electorate by their life satisfaction when the term began, to see exactly who won and who lost under {surname}.
              </p>
              {/* The three headline figures */}
              <div className="grid grid-cols-3 gap-3">
                {COHORTS.map(({ key, label, colour }) => (
                  <div key={key} className="flex flex-col gap-1.5 pt-2 border-t-4" style={{ borderColor: colour }}>
                    <div className="flex items-baseline gap-2"><span className="font-display font-black text-[32px] leading-none" style={{ color: colour }}>{cohorts[key].percentage}</span><span className="paper-cap">{label}</span></div>
                    <div className="h-2.5" style={{ background: colour, width: `${(cohorts[key].totalCount / totalPop) * 100}%` }} />
                  </div>
                ))}
              </div>
              {/* Who: by where they started, a table with gridlines */}
              <table className="w-full border-collapse text-[14px] tabular-nums">
                <thead>
                  <tr className="border-b-2 border-stone-900">
                    <th className="paper-cap text-left font-extrabold py-1.5 pr-2">Started the term</th>
                    {COHORTS.map(({ key, label, colour }) => (
                      <th key={key} className="paper-cap text-right font-extrabold py-1.5 px-2 border-l border-stone-400" style={{ color: colour }}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SITUATIONS.map(([name, band]) => (
                    <tr key={name} className="border-b border-stone-400">
                      <td className="py-2 pr-2"><span className="font-bold">{name}</span> <span className="text-[12px] text-stone-600">LS {band}</span></td>
                      {COHORTS.map(({ key, colour }) => {
                        const g = cohorts[key].groups.find((x) => x.label === name);
                        const d = g ? g.avgEndLS - g.avgStartLS : 0;
                        return (
                          <td key={key} className="py-2 px-2 text-right border-l border-stone-400">
                            {g ? (
                              <>
                                <span className="font-bold">{g.pctString}</span>{' '}
                                <span className="text-[12.5px] font-bold" style={{ color: colour }}>{d > 0 ? '+' : d < 0 ? '−' : ''}{Math.abs(d).toFixed(1)} LS</span>
                              </>
                            ) : (
                              <span className="text-stone-400">–</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* How to read it: always printed (was a "What counts as a change?" pop-up) */}
              <div className="mt-auto border-2 px-3.5 py-2.5 text-[13px] leading-normal" style={{ borderColor: tone.dark }}>
                <span className="paper-cap" style={{ color: tone.dark }}>What counts as a change?</span><br />“Improved” means life satisfaction rose by more than {CHANGE_THRESHOLD} points over the term; “Declined”, fell by more than {CHANGE_THRESHOLD}. Smaller movements count as “Unchanged”.
              </div>
              <span className="text-[12.5px] text-stone-700">Percentages are shares of the whole population. LS: life satisfaction (0–10); the coloured figure is that group’s average change.</span>
              <div className="paper-dim" style={{ opacity: p.dim }} />
            </div>
          ); })()}

          {/* ── p4: what the voters say (electorate feedback) ── */}
          {(() => { const p = page(4); return (
            <div key={p.key} className={p.className} style={p.style}>
              <div className="flex justify-between border-b-2 border-stone-900 pb-1"><span className="paper-cap">p4</span><span className="paper-cap">Letters</span></div>
              <span className="font-display font-black text-[40px] leading-[.95]">What the voters say</span>
              <p className="m-0 text-[15px] leading-relaxed">We asked voters how {surname}’s bills changed their lives. Each bill they name is explained under their letter.</p>
              <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
                {voters.map((vp, idx) => {
                  const d = vp.finalLS - vp.baselineLS;
                  // Same groups and colours as page 3: Improved / Unchanged / Declined (±0.5 LS)
                  const moved = d > CHANGE_THRESHOLD ? 'Improved' : d < -CHANGE_THRESHOLD ? 'Declined' : 'Unchanged';
                  const c = moved === 'Improved' ? '#1d4ed8' : moved === 'Declined' ? '#b45309' : '#57534e';
                  return (
                    <div key={idx} className="grid grid-cols-[1fr_auto] gap-3.5 border-t-2 border-stone-900 pt-2.5 pb-2.5">
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <span className="font-semibold text-[17.5px] leading-snug whitespace-pre-wrap">
                          “{renderVoterQuote(vp.sentiment, pmSurname, idx % 2 === 0, () => {}, () => {}, () => {}, true)}”
                        </span>
                        <span className="text-[13.5px] font-bold">{vp.name}</span>
                        {quotedPolicies(vp.sentiment, idx % 2 === 0).map((b) => (
                          <span key={b.id} className="text-[12.5px] leading-snug text-stone-700 border-l-[3px] pl-2" style={{ borderColor: tone.dark }}>
                            <strong className="text-stone-900">{b.name}:</strong> {b.description}
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-col items-end gap-0.5 min-w-[96px]">
                        <span className="paper-cap text-stone-500">Life satisfaction</span>
                        <span className="text-[16px] font-black tabular-nums" style={{ color: c }}>{vp.baselineLS.toFixed(1)} → {vp.finalLS.toFixed(1)}</span>
                        <span className="text-[13px] font-bold" style={{ color: c }}>{d >= 0 ? '+' : '−'}{Math.abs(d).toFixed(1)} · {moved}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="paper-dim" style={{ opacity: p.dim }} />
            </div>
          ); })()}

          {/* ── Back page: next up, and the way out ── */}
          {(() => { const p = page(5); return (
            <div key={p.key} className={p.className} style={p.style}>
              <div className="flex justify-between border-b-2 border-stone-900 pb-1"><span className="paper-cap">What’s next</span><span className="paper-cap">Back page</span></div>
              <span className="font-display font-black text-[40px] leading-[.95]">
                {!canProceed ? `${surname}’s term, again` : isFinalCycle ? 'The final term is over' : won ? `Next up: ${field[levelIndex + 1]?.name ?? ''}` : 'On to the next term'}
              </span>
              <div className="flex flex-col gap-2.5 flex-1 min-h-0">
                {field.map((c) => (
                  <div key={c.name} className="relative grid grid-cols-[76px_1fr] gap-3.5 border-t border-stone-900 pt-3 pb-1 px-2" style={{ background: c.isNext ? 'rgba(59,130,246,.10)' : 'transparent', opacity: c.faded ? 0.6 : 1 }}>
                    <div className="relative w-[76px] h-[90px] overflow-hidden" style={{ background: c.colour, filter: c.isNow || c.isNext ? 'saturate(.75)' : 'saturate(.3) sepia(.25)' }}>
                      <div style={abs({ left: (76 - 90 * 0.8) / 2, top: 10 })}><PMFigure cycle={c.cycle} scale={0.8} /></div>
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="paper-cap" style={{ color: c.dark }}>{c.tag}</span>
                      <span className="font-display font-black text-[21px] leading-tight">{c.name}</span>
                      <span className="text-[12.5px] font-extrabold" style={{ color: c.dark }}>“{c.slogan}”</span>
                      <span className="text-[12.5px] text-stone-600 leading-snug">{c.status}</span>
                    </div>
                    {c.isNow && (
                      <div
                        className="absolute right-2.5 top-4 -rotate-[9deg] border-4 px-2.5 py-0.5 font-black text-[14px] tracking-[.14em] leading-tight text-center uppercase mix-blend-multiply"
                        style={{ borderColor: won ? 'rgba(21,128,61,.85)' : 'rgba(185,28,28,.85)', color: won ? 'rgba(21,128,61,.85)' : 'rgba(185,28,28,.85)', outline: `2px solid ${won ? 'rgba(21,128,61,.85)' : 'rgba(185,28,28,.85)'}`, outlineOffset: 3 }}
                      >
                        {won ? <>Level<br />complete</> : <>Voted<br />out</>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="bg-stone-900 text-[#f4efe3] px-3.5 py-3 flex gap-2.5 items-center">
                {!canProceed ? (
                  <>
                    <span className="text-[13px] text-stone-300 flex-1">{surname} lost the vote. Try the term again.</span>
                    <button type="button" onClick={() => exit('lost_restart')} className="bg-[#b91c1c] text-white px-4 py-3 font-black text-[13px] tracking-[.06em] uppercase cursor-pointer hover:brightness-110">Try the term again ↺</button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => exit('restart')} className="border border-[rgba(244,239,227,.4)] px-4 py-3 font-extrabold text-[13px] cursor-pointer hover:bg-white/10">Restart term</button>
                    <span className="flex-1" />
                    <button
                      type="button"
                      onClick={() => exit(isFinalCycle ? 'finish_game' : 'next_term')}
                      disabled={!ready}
                      className="bg-[#d6b25e] text-stone-900 px-4 py-3 font-black text-[13px] tracking-[.06em] uppercase cursor-pointer hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isFinalCycle ? 'Finish game ▶' : 'Back to level select ▶'}
                    </button>
                  </>
                )}
              </div>
              <div className="paper-dim" style={{ opacity: p.dim }} />
            </div>
          ); })()}
        </div>

        {/* Page controls */}
        <div style={abs({ left: 0, right: 0, bottom: 8, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, zIndex: 50 })}>
          <button type="button" onClick={() => go(st - 1)} className="text-[13px] font-extrabold text-[#f5e9d6] bg-black/50 rounded-lg px-3.5 py-2 cursor-pointer disabled:opacity-30 disabled:cursor-default">{st === 0 ? '‹ Election night' : '‹ Back'}</button>
          <span className="text-[13px] font-extrabold text-[#f5e9d6] bg-black/50 rounded-lg px-3.5 py-2">Page {st + 1} of {LAST + 1}</span>
          {st < LAST && (
            <button type="button" onClick={() => go(st + 1)} disabled={!ready} className="text-[13px] font-black text-stone-900 bg-[#d6b25e] rounded-lg px-4 py-2 cursor-pointer disabled:opacity-30 disabled:cursor-default">
              {['Open the paper', 'Next page', 'Turn the page', 'Next page'][st]} ›
            </button>
          )}
        </div>

        {/* From the rally: the scene shrinks into the front-page photo */}
        {fromRally && won && (
          <motion.div
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={photoAt ? { x: photoAt.x, y: photoAt.y, scale: PHOTO.w / STAGE_W, opacity: [1, 1, 0] } : { x: 0, y: 0, scale: 1, opacity: 1 }}
            transition={{ duration: 1.4, ease: [0.5, 0, 0.2, 1], opacity: { duration: 1.9, times: [0, 0.74, 1] } }}
            style={abs({ left: 0, top: 0, width: STAGE_W, height: STAGE_H, transformOrigin: '0 0', pointerEvents: 'none', zIndex: 60 })}
          >
            <RallyPicture cycle={currentCycle} surname={surname} slogan={profile.slogan} />
          </motion.div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** The metric's name in the summary sentence, as a link to its glossary note. */
function highlightMetric(text: string, metric: string, onClick: () => void): React.ReactNode {
  const i = text.indexOf(metric);
  if (i < 0) return <>{text} <button type="button" onClick={onClick} className="paper-link">What is {metric}?</button></>;
  return (
    <>
      {text.slice(0, i)}
      <button type="button" onClick={onClick} className="paper-link">{metric}</button>
      {text.slice(i + metric.length)}
    </>
  );
}

/** The victory rally as a still picture (the front-page photo), drawn at 1440 × 900. */
function RallyPicture({ cycle, surname, slogan }: { cycle: ElectionCycle; surname: string; slogan: string }) {
  const tone = PM_TONES[cycle];
  return (
    <div style={abs({ inset: 0, background: 'linear-gradient(180deg, #0b1023, #111a35)', overflow: 'hidden' })}>
      <div style={abs({ left: 0, right: 0, top: 0, height: 26, background: '#111827' })} />
      {[160, 350, 540, 720, 900, 1090, 1280].map(x => (
        <div key={x} style={abs({ left: x - 130, top: 18, width: 260, height: 640, clipPath: 'polygon(46% 0, 54% 0, 100% 100%, 0 100%)', background: 'linear-gradient(180deg, rgba(191,219,254,.22), rgba(191,219,254,0))' })} />
      ))}
      <div style={abs({ left: 180, right: 180, top: 80, height: 400, background: `linear-gradient(180deg, ${tone.color}, ${tone.dark})`, borderRadius: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 22, gap: 6 })}>
        <span style={{ fontSize: 140, fontWeight: 900, lineHeight: 0.85, textTransform: 'uppercase', color: 'rgba(255,255,255,.95)' }}>{surname}</span>
        <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: '.24em', textTransform: 'uppercase', color: 'rgba(255,255,255,.8)' }}>{slogan}</span>
      </div>
      <div style={abs({ left: 0, right: 0, top: 520, height: 40, background: '#1e293b', borderTop: `4px solid ${tone.color}` })} />
      <div style={abs({ left: 0, right: 0, top: 560, bottom: 0, background: '#0b1023' })} />
      <div style={abs({ left: 720 - (90 * 2.6) / 2, top: 250 })}><PMFigure cycle={cycle} scale={2.6} pose="cheering" legs /></div>
      <div style={abs({ left: 600, top: 430, width: 240, height: 130, background: tone.color, clipPath: 'polygon(0 0, 100% 0, 94% 100%, 6% 100%)', borderTop: '12px solid #e2e8f0', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 900, textTransform: 'uppercase', color: '#ffffff' })}>{surname}</div>
      {Array.from({ length: 15 }, (_, i) => {
        const s = 78 + (i % 3) * 12;
        return (
          <div key={i} style={abs({ left: -20 + i * 100 + (i % 2) * 18, top: 700 + (i % 3) * 22, width: s, height: 400 })}>
            {i % 4 === 1 && (
              <div style={abs({ left: s * 0.6, top: -110, width: 4, height: 130, background: '#cbd5e1', transform: `rotate(${i % 2 ? -8 : 8}deg)` })}>
                <div style={abs({ left: 4, top: 0, width: 70, height: 44, background: i % 2 ? tone.color : '#ffffff' })} />
              </div>
            )}
            <div style={abs({ left: 0, top: 0, width: s, height: s, borderRadius: '50%', background: '#05070f' })} />
            <div style={abs({ left: -s * 0.35, top: s * 0.8, width: s * 1.7, height: 300, borderRadius: '60px 60px 0 0', background: '#05070f' })} />
          </div>
        );
      })}
      {Array.from({ length: 36 }, (_, i) => (
        <div key={i} style={abs({ left: (i * 211) % STAGE_W, top: (i * 97) % 640, width: 8 + (i % 3) * 3, height: 14 + (i % 4) * 3, background: [tone.color, tone.light, '#ffffff', '#facc15'][i % 4], transform: `rotate(${(i * 47) % 180}deg)` })} />
      ))}
    </div>
  );
}

/** A lost term's photo: the PM leaving No. 10, drawn at 1440 × 900. */
function ExitPicture({ cycle }: { cycle: ElectionCycle }) {
  return (
    <div style={abs({ inset: 0, background: '#2f2a26', overflow: 'hidden', filter: 'grayscale(1)' })}>
      <div style={abs({ left: 0, right: 0, top: 0, height: 640, background: 'repeating-linear-gradient(0deg, rgba(10,6,4,.55) 0 2px, transparent 2px 28px), repeating-linear-gradient(90deg, rgba(10,6,4,.4) 0 2px, transparent 2px 64px), linear-gradient(180deg, #2a201b, #3b2b23 70%, #2a201b)' })} />
      <div style={abs({ left: 600, top: 40, width: 240, height: 560, background: '#e7e5e4', borderRadius: '120px 120px 0 0' })} />
      <div style={abs({ left: 616, top: 166, width: 208, height: 434, background: '#111318' })} />
      <div style={abs({ left: 0, right: 0, top: 600, bottom: 0, background: '#1c1b1a' })} />
      <div style={abs({ left: 420, top: 300 })}><PMFigure cycle={cycle} scale={2.4} legs /></div>
      {Array.from({ length: 9 }, (_, i) => (
        <div key={i} style={abs({ left: -40 + i * 180, top: 720 + (i % 2) * 30, width: 150, height: 300, borderRadius: '75px 75px 0 0', background: '#0a0a0a' })} />
      ))}
    </div>
  );
}

/** A small line chart of the term's measure, start then after each bill, with the target dashed. */
function MeasureChart({ scores, target, colour }: { scores: number[]; target: number; colour: string }) {
  const W = 260, H = 112, L = 34, R = 8, T = 10, B = 20;
  if (scores.length < 2) return null;
  // Regular gridlines: a round step giving about four bands over start-to-finish or start-to-target, whichever is wider
  const lo = Math.min(...scores, target), hi = Math.max(...scores, target);
  const span = Math.max(hi - lo, 0.1) * 1.08;
  const step = [0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10].find((st) => span / st <= 5) ?? 10;
  const y0 = Math.floor((lo - span * 0.04) / step) * step, y1 = Math.ceil((hi + span * 0.04) / step) * step;
  const ticks: number[] = [];
  for (let v = y0; v <= y1 + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000);
  const dp = step < 0.1 ? 2 : step < 1 ? (step === 0.25 ? 2 : 1) : 0;
  const x = (i: number) => L + (i / (scores.length - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  const pts = scores.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const met = scores[scores.length - 1] >= target;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="The measure after each bill, against the target">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={v === y0 ? '#1c1917' : 'rgba(28,25,23,.18)'} strokeWidth={1} />
          <text x={L - 5} y={y(v) + 3.5} textAnchor="end" fontSize={10.5} fill="#44403c">{v.toFixed(dp)}</text>
        </g>
      ))}
      <line x1={L} x2={W - R} y1={y(target)} y2={y(target)} stroke="#1c1917" strokeWidth={1.5} strokeDasharray="5 4" />
      <text x={W - R} y={y(target) - 5} textAnchor="end" fontSize={10.5} fontWeight={700} fill="#1c1917">Target {target.toFixed(2)}</text>
      <polyline points={pts} fill="none" stroke={colour} strokeWidth={2.5} strokeLinejoin="round" />
      {scores.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={i === scores.length - 1 ? 4.5 : 3} fill={i === scores.length - 1 ? (met ? '#15803d' : '#b91c1c') : colour} stroke="#efe7d3" strokeWidth={1.5} />
      ))}
      {scores.map((_, i) => (
        <text key={i} x={x(i)} y={H - 5} textAnchor="middle" fontSize={11} fill="#44403c">{i === 0 ? 'Start' : i}</text>
      ))}
    </svg>
  );
}