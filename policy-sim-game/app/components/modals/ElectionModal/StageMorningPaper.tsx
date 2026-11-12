import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ElectionCycle, Respondent } from '../../../utils/types';
import { FRAMEWORK_RULES } from '../../../utils/frameworkRules';
import { PM_PROFILES, getPMProfile } from '../../../utils/pmProfiles';
import { track } from '../../../client/telemetry';
import { useGame } from '../../../context/GameStateContext';
import { PM_TONES } from '../../desk/deskTheme';
import { makePoll, formatPollRange, POLL_HALF_WIDTH_FINAL, POLL_HALF_WIDTH_POLLING_DAY, WIN_THRESHOLD } from '../../../utils/polls';
import PMFigure from './PMFigure';
import MiniHistogram from '../../paper/MiniHistogram';
import RunnersAndRiders, { type RunnerEntry } from '../../paper/RunnersAndRiders';
import { setPendingStart } from '../../../utils/pendingStart';
import { buildTermTimeline, ANALYSIS_MESSAGES } from './StageTermSummary';
import { computeCohortBreakdown, CHANGE_THRESHOLD } from './StagePopulationChange';
import { pickVoters, renderVoterQuote, quotedPolicies } from './StageElectorateFeedback';
import type { PressSummary } from './StagePressConference';

/** Each page of the paper is one of the old election stages, for telemetry. */
const PAGE_STAGES = ['paper_front', 'term_summary', 'wellbeing_changes', 'electorate_feedback', 'measure_explainer', 'paper_back'] as const;
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
    initialPopulation, baselinePopulation, finalPopulation, pressSummary, fromRally, onBack, onNavigate, onExit,
  } = props;

  const cycleName = ElectionCycle[currentCycle];
  const rule = FRAMEWORK_RULES[currentCycle];
  // The term's target, worked out as the desk shows it
  const { cycleMAO, completedRuns } = useGame();
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
      if (st === 4) track('measure_explainer_opened', { cycle: cycleName });
      if (st === 3) {
        track('electorate_feedback_opened', { cycle: cycleName });
      }
      timer = setTimeout(markReady, 0);
    }
    return () => {
      clearTimeout(timer);
      if (st === 2) track('wellbeing_changes_closed', { cycle: cycleName, dwell_ms: Date.now() - openedAt });
      if (st === 4) track('measure_explainer_closed', { cycle: cycleName, dwell_ms: Date.now() - openedAt });
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
  const startMetric = timelineData[0]?.score || 0;
  const endMetric = timelineData[timelineData.length - 1]?.score || 0;
  // Each bill's effect on the measure; the one that moved it most
  const steps = timelineData.slice(1).map((d, i) => ({ name: d.policyName, delta: d.score - timelineData[i].score }));
  const bestBill = steps.length ? steps.reduce((a, b) => (b.delta > a.delta ? b : a)) : null;
  // Same height scale for every small chart
  const histMax = Math.max(1, ...timelineData.flatMap((d) => d.histogram.map((h) => h.count)));

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

  // Each bill the voters name, explained once in a box under the letters (not under every letter)
  const mentionedBills = useMemo(() => {
    const out: { id: string; name: string; description: string }[] = [];
    voters.forEach((vp, idx) => quotedPolicies(vp.sentiment, idx % 2 === 0).forEach((b) => { if (!out.some((o) => o.id === b.id)) out.push(b); }));
    return out;
  }, [voters]);
  // Like a sub-editor fitting copy: if the letters don't fit the page, set them a little
  // smaller (down to 78%) rather than letting the page scroll.
  const lettersRef = useRef<HTMLDivElement>(null);
  const [lettersFit, setLettersFit] = useState(1);
  useLayoutEffect(() => {
    const el = lettersRef.current;
    if (!el) return;
    if (el.scrollHeight > el.clientHeight + 1 && lettersFit > 0.78) setLettersFit((f) => Math.round((f - 0.04) * 100) / 100);
  }, [lettersFit, voters, mentionedBills]);

  // ── Back page: next up ──
  const levelIndex = PM_PROFILES.findIndex((p) => p.cycle === currentCycle);
  // The next candidate's campaign advert (front page strip, page 3 box); none after the last term
  const adFor = PM_PROFILES[levelIndex + 1] ?? null;
  const adTone = adFor ? PM_TONES[adFor.cycle] : null;
  const adName = adFor ? adFor.name.replace(/^PM\s+/, '') : '';
  const adQuote = adFor ? CAMPAIGN_QUOTES[adFor.cycle] : '';

  // ── p5: the measure, explained ──
  const ex = EXPLAINERS[currentCycle];

  // ── Front page: what's inside ──
  const teasers = [
    { st: 1, kicker: 'The term in review', head: 'How the country moved', dek: `${rule.targetMetricAbbreviation} ${endMetric >= startMetric ? 'rose' : 'fell'} from ${startMetric.toFixed(2)} to ${endMetric.toFixed(2)}.${bestBill ? ` ${bestBill.name} did the most.` : ''}` },
    { st: 2, kicker: 'Wellbeing changes', head: 'Who won and who lost', dek: `${cohorts.improved.percentage} better off, ${cohorts.declined.percentage} worse off.` },
    { st: 3, kicker: 'Letters', head: 'What the voters say', dek: `Three voters on what ${surname}’s bills did to their lives.` },
    { st: 4, kicker: 'Explainer', head: `How ${surname} was judged`, dek: `What ${rule.targetMetricAbbreviation} rewards, what it misses, and the press conference answers explained.` },
  ];
  // The back cover: Runners and riders (the level select), with this term's result on it
  const runners: RunnerEntry[] = PM_PROFILES.map((p, i) => {
    const r = FRAMEWORK_RULES[p.cycle];
    if (i < levelIndex) {
      const run = completedRuns.find((c) => c.cycle === p.cycle);
      const runWon = (run?.approvalRating ?? 0) >= WIN_THRESHOLD;
      return {
        cycle: p.cycle, status: runWon ? 'won' : 'lost', population: run?.finalPopulation,
        result: run ? `${runWon ? 'Won' : 'Lost'} · ${r.targetMetricAbbreviation} ${run.finalScore.toFixed(2)} vs target ${run.targetScore.toFixed(2)}` : 'Played',
      };
    }
    if (i === levelIndex) {
      if (!canProceed) return { cycle: p.cycle, status: 'retry', action: { label: 'Try the term again ↺', onClick: () => exit('lost_restart') } };
      return {
        cycle: p.cycle, status: won ? 'won' : 'lost', population: finalPopulation, onReplay: () => exit('restart'),
        result: won ? `Re-elected on ${approvalRating.toFixed(1)}% · ${r.targetMetricAbbreviation} ${endMetric.toFixed(2)} vs target ${targetScore.toFixed(2)}` : `Voted out on ${approvalRating.toFixed(1)}%`,
      };
    }
    if (i === levelIndex + 1 && canProceed) {
      return {
        cycle: p.cycle, status: 'next',
        action: { label: `Start term ${i + 1} ▶`, disabled: !ready, onClick: () => { setPendingStart(p.cycle); exit('next_term'); } },
      };
    }
    return { cycle: p.cycle, status: 'locked' };
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
    ? `${surname} polled at ${formatPollRange(morningPoll)} moments before the press conference, and ${answered}. ${swingText} The final poll put ${surname} on ${formatPollRange(finalPoll)}.${swungIt ? ` Without those answers, ${surname} would have lost.` : costIt ? ` Before them, ${surname} was on course to win.` : ''}`
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
                      <p className="m-0 text-[14.5px] leading-snug text-stone-800">{pressStory} </p> 
                      <p> <strong>The answers, explained: p5.</strong></p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 border-l border-stone-900 pl-3.5 min-h-0">
                  <span className="paper-cap">Also inside</span>
                  {teasers.map((t) => (
                    <button
                      key={t.st}
                      type="button"
                      onClick={() => go(t.st)}
                      className="paper-tease text-left border-t-2 border-stone-900 px-1.5 pt-2 pb-2.5 flex flex-col gap-1"
                    >
                      <span className="flex justify-between items-baseline gap-2"><span className="paper-cap paper-tease-sub" style={{ color: tone.dark }}>{t.kicker}</span><span className="paper-cap">p{t.st + 1}</span></span>
                      <span className="font-display font-black text-[20px] leading-tight">{t.head}</span>
                      <span className="paper-tease-sub text-[14px] leading-snug text-stone-700">{t.dek}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Advertisement along the foot: the next candidate */}
              {adFor && adTone && (
                <div className="shrink-0 flex justify-between items-center px-3 py-1.5 text-white" style={{ background: adTone.dark }}>
                  <span className="paper-cap opacity-75">Advertisement</span>
                  <span className="font-display font-black text-[18px] tracking-[.04em] uppercase">{adName} · {adFor.slogan}</span>
                  <span className="paper-cap opacity-75">Next term</span>
                </div>
              )}
              <div className="paper-dim" style={{ opacity: p.dim }} />
            </div>
          ); })()}

          {/* ── p2: how the country moved (the term summary) ── */}
          {(() => { const p = page(2); return (
            <div key={p.key} className={p.className} style={p.style}>
              <div className="flex justify-between border-b-2 border-stone-900 pb-1"><span className="paper-cap">p2</span><span className="paper-cap">The term in review</span></div>
              <span className="font-display font-black text-[40px] leading-[.95]">How the country moved</span>
              <p className="m-0 text-[15px] leading-relaxed">{ANALYSIS_MESSAGES[currentCycle](startMetric, endMetric, endMetric - startMetric)}</p>
              <p className="m-0 -mt-1.5 text-[15px] leading-relaxed">Here is the country after each of {surname}’s bills, with where it started shown faintly for comparison.</p>
              {/* The term as six small charts: start, then after each bill */}
              <div className="grid grid-cols-3 gap-x-3 gap-y-2.5 flex-1 min-h-0">
                {timelineData.map((d, i) => (
                  <div key={i} className="flex flex-col gap-1 min-h-0 border-t-2 border-stone-900 pt-1.5">
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="paper-cap text-stone-500">{i === 0 ? 'Start of term' : `After bill ${i}`}</span>
                      <span className="font-display font-black text-[17px] tabular-nums">{d.score.toFixed(2)}</span>
                    </div>
                    <span className="text-[12.5px] font-bold leading-tight min-h-[2.4em]">{i === 0 ? 'Took office' : d.policyName}</span>
                    <MiniHistogram
                      counts={d.histogram.map((h) => h.count)}
                      ghost={i === 0 ? null : timelineData[0].histogram.map((h) => h.count)}
                      max={histMax}
                      colour={tone.dark}
                    />
                    <span className="text-[12px] font-bold tabular-nums" style={{ color: i === 0 ? '#57534e' : d.score - timelineData[i - 1].score > 0.005 ? '#1d4ed8' : d.score - timelineData[i - 1].score < -0.005 ? '#b45309' : '#57534e' }}>
                      {i === 0 ? `${rule.targetMetricAbbreviation} at the start` : Math.abs(d.score - timelineData[i - 1].score) < 0.005 ? `No change in ${rule.targetMetricAbbreviation}` : `${d.score - timelineData[i - 1].score > 0 ? '▲ +' : '▼ −'}${Math.abs(d.score - timelineData[i - 1].score).toFixed(2)} ${rule.targetMetricAbbreviation}`}
                    </span>
                  </div>
                ))}
              </div>
              <span className="text-[12.5px] text-stone-700">Bars: how many citizens sit at each life satisfaction score (0–10). Faint outline: the start of the term.</span>
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
              <div className="border-2 px-3.5 py-2.5 text-[13px] leading-normal" style={{ borderColor: tone.dark }}>
                <span className="paper-cap" style={{ color: tone.dark }}>What counts as a change?</span><br />“Improved” means life satisfaction rose by more than {CHANGE_THRESHOLD} points over the term; “Declined”, fell by more than {CHANGE_THRESHOLD}. Smaller movements count as “Unchanged”.
              </div>
              <span className="text-[12.5px] text-stone-700">Percentages are shares of the whole population. LS: life satisfaction (0–10); the coloured figure is that group’s average change.</span>
              {/* Advertisement: the next candidate */}
              {adFor && adTone && (
                <div className="mt-auto flex gap-4 items-center px-4 py-3.5 text-white" style={{ background: adTone.dark }}>
                  <div className="relative w-[70px] h-[86px] shrink-0 overflow-hidden" style={{ background: adTone.color }}>
                    <div style={abs({ left: (70 - 90 * 0.75) / 2, top: 8 })}><PMFigure cycle={adFor.cycle} scale={0.75} /></div>
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="paper-cap opacity-75">Advertisement · paid for by the {adName.split(' ').slice(-1)[0]} campaign</span>
                    <span className="font-display font-black text-[28px] leading-none uppercase">{adFor.slogan}</span>
                    <span className="text-[13.5px] leading-snug opacity-90">“{adQuote}” {adName}, standing next term.</span>
                  </div>
                </div>
              )}
              <div className="paper-dim" style={{ opacity: p.dim }} />
            </div>
          ); })()}

          {/* ── p4: what the voters say (electorate feedback) ── */}
          {(() => { const p = page(4); return (
            <div key={p.key} className={p.className} style={p.style}>
              <div className="flex justify-between border-b-2 border-stone-900 pb-1"><span className="paper-cap">p4</span><span className="paper-cap">Letters</span></div>
              <span className="font-display font-black text-[40px] leading-[.95]">What the voters say</span>
              <p className="m-0 text-[15px] leading-relaxed">We asked voters how {surname}’s bills changed their lives. The bills they name are explained at the foot of this page.</p>
                            <div ref={lettersRef} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                {voters.map((vp, idx) => {
                  const d = vp.finalLS - vp.baselineLS;
                  // Same groups and colours as page 3: Improved / Unchanged / Declined (±0.5 LS)
                  const moved = d > CHANGE_THRESHOLD ? 'Improved' : d < -CHANGE_THRESHOLD ? 'Declined' : 'Unchanged';
                  const c = moved === 'Improved' ? '#1d4ed8' : moved === 'Declined' ? '#b45309' : '#57534e';
                  return (
                    <div key={idx} className="grid grid-cols-[1fr_auto] gap-3.5 border-t-2 border-stone-900 pt-2.5 pb-2.5">
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <span className="font-semibold leading-snug whitespace-pre-wrap" style={{ fontSize: 17.5 * lettersFit }}>
                          “{renderVoterQuote(vp.sentiment, pmSurname, idx % 2 === 0, () => {}, () => {}, () => {}, true)}”
                        </span>
                        <span className="font-bold" style={{ fontSize: 13.5 * lettersFit }}>{vp.name}</span>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 min-w-[96px]">
                        <span className="paper-cap text-stone-500">Life satisfaction</span>
                        <span className="font-black tabular-nums" style={{ color: c, fontSize: 16 * lettersFit }}>{vp.baselineLS.toFixed(1)} → {vp.finalLS.toFixed(1)}</span>
                        <span className="font-bold" style={{ color: c, fontSize: 13 * lettersFit }}>{d >= 0 ? '+' : '−'}{Math.abs(d).toFixed(1)} · {moved}</span>
                      </div>
                    </div>
                  );
                })}
                {mentionedBills.length > 0 && (
                  <div className="mt-auto border-2 border-stone-900 px-3 py-2 flex flex-col gap-1.5">
                    <span className="paper-cap">The bills they mention</span>
                    {mentionedBills.map((b) => (
                      <span key={b.id} className="leading-snug text-stone-700 border-l-[3px] pl-2" style={{ borderColor: tone.dark, fontSize: 12.5 * lettersFit }}>
                        <strong className="text-stone-900">{b.name}:</strong> {b.description}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="paper-dim" style={{ opacity: p.dim }} />
            </div>
          ); })()}

          {/* ── p5: the measure, explained ── */}
          {(() => { const p = page(5); return (
            <div key={p.key} className={p.className} style={p.style}>
              <div className="flex justify-between border-b-2 border-stone-900 pb-1"><span className="paper-cap">Explainer</span><span className="paper-cap">p5</span></div>
              <span className="font-display font-black text-[38px] leading-[.95]">How {surname} was judged</span>
              <p className="m-0 text-[15px] leading-snug">{surname}’s score was the <strong>{rule.targetMetricName}</strong>: {ex.what}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="border-t-[3px] border-[#15803d] pt-1.5 text-[13.5px] leading-snug"><span className="paper-cap text-[#15803d]">What it rewards</span><br />{ex.rewards}</div>
                <div className="border-t-[3px] border-[#b91c1c] pt-1.5 text-[13.5px] leading-snug"><span className="paper-cap text-[#b91c1c]">What it misses</span><br />{ex.misses}</div>
              </div>
              {/* A worked example: three citizens, one bill */}
              <div className="border-2 border-stone-900 px-3 py-2 flex flex-col gap-1.5">
                <span className="paper-cap">Three citizens, one bill</span>
                <table className="w-full border-collapse text-[14px] tabular-nums">
                  <thead>
                    <tr className="border-b-2 border-stone-900">
                      <th className="w-[64px]" />
                      {ex.before.map((_, i) => <th key={i} className="paper-cap text-center font-extrabold py-1 border-l border-stone-400">Citizen {i + 1}</th>)}
                      <th className="paper-cap text-right font-extrabold py-1 pl-2 border-l-2 border-stone-900 capitalize">{ex.label}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-stone-400">
                      <td className="py-1 text-[12.5px] text-stone-600">Before</td>
                      {ex.before.map((v, i) => <td key={i} className="text-center font-bold py-1 border-l border-stone-400">{v}</td>)}
                      <td className="text-right font-bold py-1 pl-2 border-l-2 border-stone-900">{ex.measureBefore}</td>
                    </tr>
                    <tr className="border-b border-stone-400">
                      <td className="py-1 text-[12.5px] text-stone-600">After</td>
                      {ex.after.map((v, i) => <td key={i} className="text-center font-bold py-1 border-l border-stone-400">{v}</td>)}
                      <td className="text-right font-bold py-1 pl-2 border-l-2 border-stone-900">{ex.measureAfter}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-[12.5px] text-stone-600">Change</td>
                      {ex.after.map((v, i) => {
                        const d = v - ex.before[i];
                        return <td key={i} className="text-center font-bold py-1 border-l border-stone-400" style={{ color: d > 0 ? '#1d4ed8' : d < 0 ? '#b45309' : '#57534e' }}>{d > 0 ? `▲ +${d}` : d < 0 ? `▼ −${-d}` : '–'}</td>;
                      })}
                      {(() => {
                        const d = parseFloat(ex.measureAfter) - parseFloat(ex.measureBefore);
                        return <td className="text-right font-bold py-1 pl-2 border-l-2 border-stone-900" style={{ color: d > 0.005 ? '#1d4ed8' : d < -0.005 ? '#b45309' : '#57534e' }}>{d > 0.005 ? `▲ +${d.toFixed(2)}` : d < -0.005 ? `▼ −${(-d).toFixed(2)}` : '–'}</td>;
                      })()}
                    </tr>
                  </tbody>
                </table>
                <span className="text-[13px] leading-snug text-stone-700">{ex.note(surname)}</span>
              </div>
              {/* The press conference, explained */}
              {pressSummary && pressSummary.questions.length > 0 && (
                <div className="flex flex-col gap-1.5 border-t-2 border-stone-900 pt-1.5">
                  <span className="paper-cap" style={{ color: tone.dark }}>At the press conference</span>
                  {pressSummary.questions.map((q, i) => (
                    <p key={i} className="m-0 text-[13.5px] leading-snug">
                      <strong>{q.who} asked {q.ask.replace('the Prime Minister', surname)}.</strong> {surname} said “{q.said.replace(/\.$/, '')}.”{' '}
                      {q.correct
                        ? <span className="font-bold text-[#15803d]">✓ Correct.</span>
                        : <><span className="font-bold text-[#b91c1c]">✗ Wrong.</span> The answer was “{q.answer.replace(/\.$/, '')}.”</>}
                      {i === 1 && ` ${q.answer} raised ${rule.targetMetricAbbreviation} more than any other bill this term.`}
                    </p>
                  ))}
                </div>
              )}
              {/* The measure bill by bill, against the target (moved here from the front page) */}
              <div className="flex-1 min-h-[120px] border-2 border-stone-900 px-2.5 py-2 flex flex-col gap-0.5">
                <div className="flex justify-between items-baseline gap-2">
                  <span className="paper-cap">{rule.targetMetricAbbreviation}, bill by bill</span>
                  <span className="text-[13px]">{startMetric.toFixed(2)} → {endMetric.toFixed(2)} · Target <strong>{targetScore.toFixed(2)}</strong> <span className="font-bold" style={{ color: endMetric >= targetScore ? '#15803d' : '#b91c1c' }}>{endMetric >= targetScore ? '✓' : '✗'}</span></span>
                </div>
                <MeasureChart scores={timelineData.map((d) => d.score)} target={targetScore} colour={tone.dark} />
              </div>
              <div className="paper-dim" style={{ opacity: p.dim }} />
            </div>
          ); })()}

          {/* ── Back cover: Runners and riders (the level select) ── */}
          {(() => { const p = page(6); return (
            <div key={p.key} className={p.className} style={p.style}>
              <RunnersAndRiders
                entries={runners}
                resultsSoFar={levelIndex + (canProceed ? 1 : 0)}
                footer={isFinalCycle && canProceed ? (
                  <button
                    type="button"
                    onClick={() => exit('finish_game')}
                    disabled={!ready}
                    className="paper-btn shrink-0 bg-[#d6b25e] text-stone-900 py-3 font-black text-[14px] tracking-[.06em] uppercase disabled:opacity-50"
                  >
                    All four terms played · Finish game ▶
                  </button>
                ) : undefined}
              />
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
              {['Open the paper', 'Next page', 'Turn the page', 'Next page', 'Close the paper'][st]} ›
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

/** What each measure is, what it rewards and misses, and a three-citizen example (p5). */
const EXPLAINERS: Record<ElectionCycle, {
  what: string; rewards: string; misses: string;
  before: number[]; after: number[]; label: string; measureBefore: string; measureAfter: string;
  note: (surname: string) => string;
}> = {
  [ElectionCycle.Benthamite]: {
    what: 'add up everyone’s life satisfaction and divide by the number of people.',
    rewards: 'Any gain counts the same, whoever gets it. A point for someone thriving is worth exactly as much as a point for someone struggling.',
    misses: 'Who gains. A bill can raise the average while the worst-off fall further behind.',
    before: [2, 6, 9], after: [1, 7, 10], label: 'average', measureBefore: '5.67', measureAfter: '6.00',
    note: (s) => `The average went up, so ${s}’s score went up, even though the person struggling most lost a point.`,
  },
  [ElectionCycle.Rawlsian]: {
    what: 'the single lowest life satisfaction anyone in the country has.',
    rewards: 'Lifting the person at the very bottom. Nothing else moves the score.',
    misses: 'Everyone else. Big gains for the comfortable and the thriving count for nothing.',
    before: [2, 6, 9], after: [2, 8, 10], label: 'lowest', measureBefore: '2', measureAfter: '2',
    note: (s) => `Two people gained, but the worst-off didn’t move, so ${s}’s score stayed at 2.`,
  },
  [ElectionCycle.PersonalUtility]: {
    what: 'the average of how much each citizen values their own life satisfaction.',
    rewards: 'Gains near the bottom of the scale. To the person getting it, a point from 3 to 4 is worth more than a point from 8 to 9.',
    misses: 'How people would judge the country as a whole when deciding for others.',
    before: [2, 6, 9], after: [3, 6, 8], label: 'average LS', measureBefore: '5.67', measureAfter: '5.67',
    note: (s) => `Average life satisfaction didn’t change, but ${s}’s score rose: the point gained at the bottom is worth more than the point lost at the top.`,
  },
  [ElectionCycle.SocietalUtility]: {
    what: 'the average of how each citizen judges the whole country’s spread of life satisfaction, using the values they hold when deciding for others.',
    rewards: 'Gains for the worst-off, which count for much more than gains at the top.',
    misses: 'Each person’s own life on its own terms: it’s about the shape of the whole country.',
    before: [2, 6, 9], after: [3, 6, 8], label: 'average LS', measureBefore: '5.67', measureAfter: '5.67',
    note: (s) => `Average life satisfaction didn’t change, but ${s}’s score rose: judging for others, citizens weigh the worst-off much more heavily.`,
  },
};

/** Each candidate's line on the stump, for their advert. */
const CAMPAIGN_QUOTES: Record<ElectionCycle, string> = {
  [ElectionCycle.Benthamite]: 'Every citizen counts the same.',
  [ElectionCycle.Rawlsian]: 'You judge a country by how it treats the person at the bottom.',
  [ElectionCycle.SocietalUtility]: 'It’s not just about you, it’s about all of us.',
  [ElectionCycle.PersonalUtility]: 'Only you know what a good life looks like for you.',
};

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

/** A small line chart of the term's measure, start then after each bill, with the target dashed.
 * Drawn to the space it is given (measured), so it never spills out of its box. */
function MeasureChart({ scores, target, colour }: { scores: number[]; target: number; colour: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 260, h: 100 });
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    // offsetWidth/Height are unscaled layout sizes, so this works inside the scaled stage
    const measure = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const W = Math.max(120, size.w), H = Math.max(60, size.h), L = 34, R = 8, T = 10, B = 20;
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
    <div ref={box} className="relative flex-1 min-h-[60px]">
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="absolute inset-0" role="img" aria-label="The measure after each bill, against the target">
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
    </div>
  );
}