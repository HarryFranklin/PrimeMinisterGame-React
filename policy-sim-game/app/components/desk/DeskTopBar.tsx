import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { track } from '../../client/telemetry';
import { ElectionCycle } from '../../utils/types';
import { FRAMEWORK_RULES } from '../../utils/frameworkRules';
import { PM_PROFILES } from '../../utils/pmProfiles';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import { PM_TONES, SHOW_EXACT_SCORE, TermStatus } from './deskTheme';
import { JUDGED } from '../paper/RunnersAndRiders';
import { makePoll, pollHalfWidth, formatPollRange, pollBarPercent, POLL_STATUS_COLOURS, WIN_THRESHOLD } from '../../utils/polls';

/** How long the poll takes to move to a new day's figure. */
const POLL_MOVE_MS = 2200;

/** Window event that opens the pause menu (detail: what opened it, for telemetry). */
export const OPEN_PAUSE_EVENT = 'pm:open-pause';

export type ContinueState = 'locked' | 'ready' | 'busy' | 'press';

interface DeskTopBarProps {
  cycle: ElectionCycle;
  turn: number;
  turnsPerCycle: number;
  /** The real approval. Never shown: the player sees a poll around it. */
  approval: number;
  /** Approval at the end of the day before, for the "up / down since yesterday" note (null on day 1). */
  previousApproval: number | null;
  /** This term's poll error (utils/polls.ts). */
  pollError: number;
  isDissolved: boolean;
  score: number;
  target: number;
  status: TermStatus;
  continueState: ContinueState;
  onContinue: () => void;
  /** The bill just signed moved the measure by this much: shown as a stamp
   * on the measure between days (replaces the old pop-up pill). */
  lastChange?: { delta: number; key: number } | null;
}

const CONTINUE_TEXT: Record<ContinueState, { label: string; sub: string }> = {
  locked: { label: 'Sign a bill', sub: 'the day ends when you sign' },
  ready: { label: 'Continue ▶', sub: 'to tomorrow' },
  busy: { label: 'Enacting…', sub: 'the bill becomes law' },
  press: { label: 'Press conference ▶', sub: 'the term is over' },
};

/**
 * The leather strip across the top of the desk: who you are, what you're
 * judged on and how it's going, approval, the countdown to the vote, and
 * Continue. Everything but the brass nameplate takes the PM's colour.
 */
export default function DeskTopBar({
  cycle, turn, turnsPerCycle, approval, previousApproval, pollError, isDissolved, score, target, status, continueState, onContinue, lastChange,
}: DeskTopBarProps) {
  const rule = FRAMEWORK_RULES[cycle];
  const profile = PM_PROFILES.find((p) => p.cycle === cycle);
  const tone = PM_TONES[cycle];
  const judged = JUDGED[cycle];
  // The poll moves slowly, and goes red while falling (green while rising), so a change is easy to spot
  const displayApproval = useAnimatedNumber(approval, POLL_MOVE_MS);
  const displayScore = useAnimatedNumber(score, 1400);
  const trend = approval < displayApproval - 0.05 ? 'down' : approval > displayApproval + 0.05 ? 'up' : null;
  const trendColour = trend === 'down' ? '#f87171' : trend === 'up' ? '#4ade80' : null;
  const poll = makePoll(displayApproval, pollHalfWidth(turn, isDissolved), pollError);
  // The band is drawn from the real target values so its move and its narrowing
  // happen together in one CSS transition (the counting number would lag the width).
  const bandPoll = makePoll(approval, pollHalfWidth(turn, isDissolved), pollError);
  const bandLeft = pollBarPercent(bandPoll.low);
  const bandWidth = pollBarPercent(bandPoll.high) - bandLeft;
  const winAt = pollBarPercent(WIN_THRESHOLD);
  const moved = previousApproval === null ? null : approval - previousApproval;
  const move =
    moved === null ? { text: 'First poll', colour: '#d6c7aa' }
    : moved > 0.4 ? { text: '▲ Up since yesterday', colour: '#86efac' }
    : moved < -0.4 ? { text: '▼ Down since yesterday', colour: '#fca5a5' }
    : { text: 'Steady', colour: '#d6c7aa' };
  const daysLeft = turnsPerCycle + 1 - turn;
  const name = (profile?.name ?? '').toUpperCase();
  const enabled = continueState === 'ready' || continueState === 'press';
  const text = CONTINUE_TEXT[continueState];
  const abbr = rule.targetMetricAbbreviation;

  // The objective card, unfolded from beside the nameplate
  const [objectiveOpen, setObjectiveOpen] = useState(false);
  const openedAt = useRef(0);
  const toggleObjective = () => {
    if (objectiveOpen) {
      track('objective_closed', { cycle: ElectionCycle[cycle], turn, dwell_ms: Date.now() - openedAt.current });
      setObjectiveOpen(false);
    } else {
      openedAt.current = Date.now();
      track('objective_opened', { cycle: ElectionCycle[cycle], turn });
      setObjectiveOpen(true);
    }
  };
  useEffect(() => {
    if (!objectiveOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); toggleObjective(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectiveOpen]);

  const up = (lastChange?.delta ?? 0) >= 0;

  return (
    <div className="relative shrink-0 h-[78px] bg-[#24180f] shadow-[0_6px_16px_rgba(0,0,0,.45)] flex items-center gap-5 px-[18px] z-10 text-[#f5e9d6]">
      <div className="absolute inset-[5px] border-[1.5px] border-dashed border-[rgba(214,178,94,.35)] rounded-md pointer-events-none" />

      {/* Brass nameplate: the office, the same for every PM */}
      <div className="h-14 px-5 rounded-md shrink-0 flex flex-col items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,.6)] bg-[linear-gradient(180deg,#e9cf86,#b8923f_55%,#8f6c25)]">
        <span className="font-display font-black text-[clamp(14px,1.35vw,19px)] tracking-[.1em] text-[#3b2a0c] whitespace-nowrap">{name}</span>
        <span className="text-[10px] font-extrabold tracking-[.2em] uppercase text-[#5c4214]">“{profile?.slogan}”</span>
      </div>

      {/* Objective: a brass-edged tab beside the nameplate that unfolds a card */}
      <button
        type="button"
        onClick={toggleObjective}
        aria-expanded={objectiveOpen}
        className="h-14 w-[74px] -ml-2 shrink-0 rounded-md border-2 border-[#b8923f] flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors hover:bg-[#b8923f]/20"
        style={{ backgroundColor: objectiveOpen ? 'rgba(184,146,63,.28)' : 'transparent' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e9cf86" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" fill="#e9cf86" /></svg>
        <span className="text-[10px] font-black tracking-[.14em] uppercase text-[#e9cf86]">Objective</span>
      </button>

      {/* What you're judged on, and how it's going */}
      {/* (room kept on the right for the day's stamp) */}
      <div className="relative flex flex-col gap-1 min-w-0 pr-[104px]">
        <span className="text-[10px] font-extrabold tracking-[.14em] uppercase truncate" style={{ color: tone.light }}>Judged on · {abbr}</span>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-[15px] font-extrabold truncate">{rule.targetMetricName}</span>
          {!isDissolved && (
            <span
              className="text-[11px] font-black tracking-[.06em] uppercase whitespace-nowrap px-2.5 py-1 rounded-full text-white border-[1.5px]"
              style={{ backgroundColor: tone.dark, borderColor: tone.light }}
            >
              {status}
            </span>
          )}
        </div>
        {SHOW_EXACT_SCORE && (
          <span className="text-[11px] font-bold text-[#d6c7aa] tabular-nums">
            {abbr} {displayScore.toFixed(2)} now · target {target.toFixed(2)}
          </span>
        )}

        {/* Between days: how far the signed bill moved the measure */}
        <AnimatePresence>
          {lastChange && (
            <motion.div
              key={lastChange.key}
              initial={{ opacity: 0, scale: 1.8, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: -4 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: 'spring', stiffness: 420, damping: 17 }}
              className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none px-2.5 py-1 rounded-md border-[2.5px] flex flex-col items-center leading-none"
              style={{ borderColor: up ? '#93c5fd' : '#fdba74', color: up ? '#bfdbfe' : '#fed7aa', backgroundColor: 'rgba(36,24,15,.92)' }}
            >
              <span className="font-display font-black text-[26px] tabular-nums">{up ? '+' : '−'}{Math.abs(lastChange.delta).toFixed(2)}</span>
              <span className="text-[9px] font-black tracking-[.16em] uppercase mt-0.5">{abbr} today</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Polls: a range around the real approval, never the exact number */}
      <div className="flex flex-col gap-[3px] shrink-0 ml-auto w-[clamp(230px,19vw,300px)]">
        <div className="flex justify-between items-baseline gap-3">
          <span className="text-[10px] font-extrabold tracking-[.14em] uppercase" style={{ color: tone.light }}>Polls</span>
          <span className="text-[12px] font-black whitespace-nowrap" style={{ color: POLL_STATUS_COLOURS[poll.status].onDark }}>{poll.status}</span>
        </div>
        <div className="relative h-2.5 rounded-full bg-white/15 overflow-hidden">
          <div
            className="absolute top-0 bottom-0 transition-[left,width] ease-out"
            style={{ left: `${bandLeft}%`, width: `${bandWidth}%`, transitionDuration: `${POLL_MOVE_MS}ms`, background: `linear-gradient(90deg, transparent, ${trendColour ?? tone.light} 22%, ${trendColour ?? tone.light} 78%, transparent)` }}
          />
          <div className="absolute top-0 bottom-0 w-0.5 bg-white" style={{ left: `${winAt}%` }} />
        </div>
        {/* "51% to win" sits under its marker on the bar */}
        <div className="relative h-[12px]">
          <span className="absolute top-0 -translate-x-1/2 text-[10px] font-black whitespace-nowrap leading-none" style={{ left: `${winAt}%` }}>▲ {WIN_THRESHOLD}% to win</span>
        </div>
        <div className="flex justify-between gap-2 text-[11px] font-extrabold whitespace-nowrap">
          <span>
            Currently polling at <span className="transition-colors duration-300" style={{ color: trendColour ?? undefined }}>{formatPollRange(poll)}</span>
          </span>
          <span style={{ color: move.colour }}>{move.text}</span>
        </div>
      </div>

      {/* Countdown to the vote */}
      <div className="flex flex-col gap-1.5 shrink-0">
        <span className="text-[10px] font-extrabold tracking-[.14em] uppercase" style={{ color: tone.light }}>
          {isDissolved ? 'Polling day' : `Day ${turn} of ${turnsPerCycle}`}
        </span>
        <div className="flex items-center gap-[5px]">
          {Array.from({ length: turnsPerCycle }, (_, i) => {
            const done = isDissolved || i < turn - 1;
            const today = !isDissolved && i === turn - 1;
            return (
              <span
                key={i}
                className="w-3.5 h-3.5 rounded-full border-2"
                style={{ borderColor: tone.light, backgroundColor: done ? tone.light : today ? `${tone.light}55` : 'transparent' }}
              />
            );
          })}
          <span className="text-[11px] font-black ml-0.5" style={{ color: tone.light }}>VOTE</span>
        </div>
        <span className="text-[11px] font-extrabold">
          {isDissolved ? 'The country decides' : `Election in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`}
        </span>
      </div>

      <button
        type="button"
        onClick={onContinue}
        disabled={!enabled}
        className={`h-[54px] px-[22px] rounded-lg font-black text-[15px] tracking-[.08em] uppercase flex flex-col items-center justify-center gap-px shrink-0 transition-colors ${
          enabled ? 'cursor-pointer' : 'cursor-not-allowed'
        } ${continueState === 'press' || continueState === 'busy' ? 'animate-pulse' : ''}`}
        style={{ backgroundColor: enabled || continueState === 'busy' ? tone.dark : `${tone.dark}66`, color: enabled ? '#ffffff' : 'rgba(255,255,255,.65)' }}
      >
        <span>{text.label}</span>
        <span className="text-[10px] tracking-normal normal-case font-bold">{text.sub}</span>
      </button>

      {/* The objective card: paper, unfolded from under the nameplate */}
      <AnimatePresence>
        {objectiveOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close the objective"
              className="fixed inset-0 z-40 cursor-default bg-black/30"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={toggleObjective}
            />
            <motion.div
              initial={{ opacity: 0, y: -14, rotateX: -35 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.32, ease: [0.2, 0.8, 0.25, 1] }}
              style={{ transformOrigin: 'top center', transformPerspective: 900 }}
              className="absolute left-[18px] top-[84px] z-50 w-[460px] bg-[#efe7d3] text-stone-900 shadow-[0_24px_50px_rgba(0,0,0,.55)] p-5 flex flex-col gap-3 rotate-[-0.6deg]"
            >
              <div className="flex items-baseline justify-between border-b-[3px] border-double border-stone-900 pb-2">
                <span className="paper-cap">Your objective · Term {PM_PROFILES.findIndex((p) => p.cycle === cycle) + 1}</span>
                <button type="button" onClick={toggleObjective} className="paper-cap underline cursor-pointer min-h-[32px] px-1">Close</button>
              </div>
              <p className="m-0 font-display font-black text-[24px] leading-tight">Be re-elected: {WIN_THRESHOLD}% or more on polling day.</p>
              <div className="flex flex-col gap-1">
                <span className="paper-cap" style={{ color: tone.dark }}>You are judged on · {judged.approach}</span>
                <span className="font-display font-bold text-[19px]">{rule.targetMetricName} ({abbr})</span>
                <span className="text-[15px] leading-snug">{judged.blurb}</span>
              </div>
              <div className="flex flex-col gap-1 border-t border-stone-400 pt-2">
                <span className="paper-cap">How it works</span>
                <span className="text-[15px] leading-snug">Each day you sign one bill. The more it raises {abbr} towards the target, the more the polls follow. Before you sign, preview the bill and watch who moves, and where.</span>
              </div>
              <div className="flex items-center justify-between border-t border-stone-400 pt-2 text-[14px] font-bold">
                <span>{SHOW_EXACT_SCORE ? `${abbr} ${score.toFixed(2)} now · target ${target.toFixed(2)}` : `Target: ${abbr} ${target.toFixed(2)}`}</span>
                <span>Day {Math.min(turn, turnsPerCycle)} of {turnsPerCycle}</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
