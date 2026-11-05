import React from 'react';
import { ElectionCycle } from '../../utils/types';
import { FRAMEWORK_RULES } from '../../utils/frameworkRules';
import { PM_PROFILES } from '../../utils/pmProfiles';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import { PM_TONES, SHOW_EXACT_SCORE, TermStatus } from './deskTheme';

export type ContinueState = 'locked' | 'ready' | 'busy' | 'press';

interface DeskTopBarProps {
  cycle: ElectionCycle;
  turn: number;
  turnsPerCycle: number;
  approval: number;
  isDissolved: boolean;
  score: number;
  target: number;
  status: TermStatus;
  continueState: ContinueState;
  onContinue: () => void;
}

const CONTINUE_TEXT: Record<ContinueState, { label: string; sub: string }> = {
  locked: { label: 'Continue ▶', sub: 'sign a bill first' },
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
  cycle, turn, turnsPerCycle, approval, isDissolved, score, target, status, continueState, onContinue,
}: DeskTopBarProps) {
  const rule = FRAMEWORK_RULES[cycle];
  const profile = PM_PROFILES.find((p) => p.cycle === cycle);
  const tone = PM_TONES[cycle];
  const displayApproval = useAnimatedNumber(approval);
  const daysLeft = turnsPerCycle + 1 - turn;
  const name = (profile?.name ?? '').toUpperCase();
  const enabled = continueState === 'ready' || continueState === 'press';
  const text = CONTINUE_TEXT[continueState];

  return (
    <div className="relative shrink-0 h-[78px] bg-[#24180f] shadow-[0_6px_16px_rgba(0,0,0,.45)] flex items-center gap-6 px-[18px] z-10 text-[#f5e9d6]">
      <div className="absolute inset-[5px] border-[1.5px] border-dashed border-[rgba(214,178,94,.35)] rounded-md pointer-events-none" />

      {/* Brass nameplate: the office, the same for every PM */}
      <div className="h-14 px-5 rounded-md shrink-0 flex flex-col items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,.6)] bg-[linear-gradient(180deg,#e9cf86,#b8923f_55%,#8f6c25)]">
        <span className="font-display font-black text-[clamp(14px,1.35vw,19px)] tracking-[.1em] text-[#3b2a0c] whitespace-nowrap">{name}</span>
        <span className="text-[10px] font-extrabold tracking-[.2em] uppercase text-[#5c4214]">“{profile?.slogan}”</span>
      </div>

      {/* What you're judged on, and how it's going */}
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-[10px] font-extrabold tracking-[.14em] uppercase" style={{ color: tone.light }}>
          Judged on · {rule.targetMetricAbbreviation}
        </span>
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
          <span className="text-[11px] font-bold text-[#d6c7aa]">
            {rule.targetMetricAbbreviation} {score.toFixed(2)} now · target {target.toFixed(2)}
          </span>
        )}
      </div>

      {/* Approval */}
      <div className="flex flex-col gap-1 shrink-0">
        <span className="text-[10px] font-extrabold tracking-[.14em] uppercase" style={{ color: tone.light }}>Approval</span>
        <div className="relative w-[140px] h-2.5 rounded-full bg-white/15">
          {!isDissolved && (
            <div className="absolute left-0 top-0 bottom-0 rounded-full transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(100, displayApproval))}%`, backgroundColor: tone.light }} />
          )}
          <div className="absolute left-[51%] -top-1 -bottom-1 w-0.5 bg-white" />
        </div>
        <span className="text-[11px] font-extrabold">
          {isDissolved ? 'Unclear until the vote' : `${displayApproval.toFixed(1)}% · 51% to win`}
        </span>
      </div>

      {/* Countdown to the vote */}
      <div className="flex flex-col gap-1.5 ml-auto shrink-0">
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
    </div>
  );
}
