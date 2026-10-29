// Accent colours per app. Full class names written out so Tailwind finds them.
export type Accent = 'pink' | 'indigo';

export const ACCENT = {
  pink: {
    button: 'bg-pink-600 hover:bg-pink-700 text-white',
    ring: 'border-pink-500 bg-pink-500/10',
    check: 'accent-pink-600',
    text: 'text-pink-400',
    chip: 'bg-pink-600 border-pink-500 text-white',
    dot: 'bg-pink-600 border-pink-600 ring-2 ring-pink-600/30',
  },
  indigo: {
    button: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    ring: 'border-indigo-500 bg-indigo-500/10',
    check: 'accent-indigo-600',
    text: 'text-indigo-400',
    chip: 'bg-indigo-600 border-indigo-500 text-white',
    dot: 'bg-indigo-600 border-indigo-600 ring-2 ring-indigo-600/30',
  },
} as const;

export const BTN_BASE =
  'inline-flex items-center justify-center rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer';
export const BTN_GHOST = 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200';
