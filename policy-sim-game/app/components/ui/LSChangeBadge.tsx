import React from 'react';

/**
 * A small "before → after" badge for a life-satisfaction change, colour-coded
 * by direction (improved/declined/unchanged). Originally written once inline
 * inside StageElectorateFeedback's voter cards; now shared with
 * StagePopulationChange's per-person breakdown so both use identical
 * thresholds and colours instead of two hand-typed copies.
 */
export const LSChangeBadge = ({
  startLS,
  endLS,
  size = 'md',
}: {
  startLS: number;
  endLS: number;
  size?: 'sm' | 'md';
}) => {
  const startRounded = Math.round(startLS * 10) / 10;
  const endRounded = Math.round(endLS * 10) / 10;
  const hasChanged = endRounded !== startRounded;

  const borderColor = !hasChanged ? 'border-zinc-200' : endRounded > startRounded ? 'border-emerald-200' : 'border-rose-200';
  const textColor = !hasChanged ? 'text-zinc-600' : endRounded > startRounded ? 'text-emerald-600' : 'text-rose-600';
  const textSize = size === 'sm' ? 'text-[11px]' : 'text-[12px]';

  return (
    <div className={`flex items-center gap-2 bg-white px-2 py-1 rounded-md border shadow-sm shrink-0 ${borderColor}`}>
      <span className={`${textSize} font-bold text-zinc-500`}>LS: {startRounded.toFixed(1)}</span>
      <span className={`${textSize} text-zinc-300 font-black`}>→</span>
      <span className={`${textSize} font-black ${textColor}`}>{endRounded.toFixed(1)}</span>
    </div>
  );
};
