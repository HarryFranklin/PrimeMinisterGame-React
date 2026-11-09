/**
 * The player's options from the title screen (saved in this browser).
 * Text speed and sound are placeholders for now; camera flashes is live.
 */
export const OPTIONS_KEY = 'game_options_v1';

export type Options = { textSpeed: 'normal' | 'fast' | 'instant'; sound: 'on' | 'off'; flashes: 'on' | 'off' };
export const DEFAULT_OPTIONS: Options = { textSpeed: 'normal', sound: 'on', flashes: 'on' };

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