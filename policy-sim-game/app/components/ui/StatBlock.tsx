import React from 'react';

/**
 * A left-accented labeled statistic (e.g. "Current Score: 6.42"). Extracted
 * from DPMCard, which previously hand-typed this twice with only the accent
 * color and label/value differing.
 */
export const StatBlock = ({
  label,
  value,
  accentClassName = 'border-l-pink-500',
  labelClassName = 'text-pink-600',
  valueClassName = 'text-zinc-900',
  muted = false,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Tailwind border-l-* class controlling the accent stripe color. */
  accentClassName?: string;
  labelClassName?: string;
  valueClassName?: string;
  muted?: boolean;
}) => (
  <div
    className={`bg-white border-l-4 ${accentClassName} border-y border-r border-zinc-200 p-3 rounded-r-xl shadow-sm flex flex-col justify-center ${
      muted ? 'opacity-90' : ''
    }`}
  >
    <span className={`text-[12px] font-black uppercase tracking-widest block mb-0.5 ${labelClassName}`}>{label}</span>
    <span className={`block text-2xl font-black ${valueClassName}`}>{value}</span>
  </div>
);
