import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-zinc-900 text-white hover:bg-black disabled:bg-zinc-300',
  secondary: 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 shadow-none border border-zinc-300 disabled:opacity-50',
  accent: 'bg-pink-600 text-white hover:bg-pink-700 disabled:bg-zinc-200 disabled:text-zinc-400',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 disabled:bg-zinc-300',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'py-2 px-4 text-sm',
  md: 'py-3 px-5 text-sm md:text-base',
  lg: 'py-4 px-6 text-base',
};

const SHADOW_CLASSES = {
  md: 'shadow-md',
  lg: 'shadow-lg',
} as const;

/**
 * Single button primitive for the whole app, replacing hand-typed variants
 * previously scattered across DashboardTab, DPMCard, and ModalActionBtn.
 *
 * Preserves the existing visual language as-is: most buttons in this app are
 * sentence-case (e.g. "Enact Policy"), while a small number of high-stakes
 * calls to action (e.g. "Face the Electorate") use the louder uppercase +
 * tracking-widest treatment. That's opt-in via `loud`, not the default —
 * don't flip it on everywhere or every button starts shouting.
 */
export const Button = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  pulse = false,
  loud = false,
  fullWidth = false,
  shadow = 'md',
  className = '',
  type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  /** Pulses to draw attention (e.g. "Face the Electorate", "Enacting..."). */
  pulse?: boolean;
  /** Uppercase + wide tracking, reserved for the highest-stakes CTAs. */
  loud?: boolean;
  fullWidth?: boolean;
  /** Explicit prop rather than a className override — Tailwind doesn't
   * guarantee that a later shadow-* utility in the string wins over an earlier one. */
  shadow?: 'md' | 'lg';
  className?: string;
  type?: 'button' | 'submit';
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`font-bold rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed ${
      SHADOW_CLASSES[shadow]
    } ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${fullWidth ? 'w-full' : ''} ${
      pulse ? 'animate-pulse' : ''
    } ${loud ? 'uppercase tracking-widest font-black' : ''} ${className}`}
  >
    {children}
  </button>
);
