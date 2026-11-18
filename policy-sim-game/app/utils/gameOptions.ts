/**
 * The player's options from the title screen (saved in this browser).
 * Text speed sets how fast letters and memos type out (hooks/useTypewriter.ts);
 * camera flashes are below. (There is no sound in the game.)
 */
export const OPTIONS_KEY = 'game_options_v1';

export type Options = { textSpeed: 'normal' | 'fast' | 'instant'; flashes: 'on' | 'off' };
export const DEFAULT_OPTIONS: Options = { textSpeed: 'normal', flashes: 'on' };

export function loadOptions(): Options {
  try {
    return { ...DEFAULT_OPTIONS, ...JSON.parse(localStorage.getItem(OPTIONS_KEY) || '{}') };
  } catch {
    return DEFAULT_OPTIONS;
  }
}

/**
 * Camera flashes are shown unless the player turned them off,
 * or their device asks for reduced motion. With them off, the press conference
 * has no flashes and election night opens with the time skip instead.
 */
export function flashesAllowed(): boolean {
  if (typeof window === 'undefined') return true;
  if (loadOptions().flashes === 'off') return false;
  try {
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return true;
  }
}

/** Marks the page so CSS can switch flashing effects off: html[data-flashes="off"]. */
export function applyFlashSetting() {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.flashes = flashesAllowed() ? 'on' : 'off';
}