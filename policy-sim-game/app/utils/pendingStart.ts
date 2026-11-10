import { ElectionCycle } from './types';

/**
 * "Start term n" pressed on the morning paper's back cover: the Academic Debrief
 * comes first, then the level select starts that term straight away.
 * Kept in memory only (a reload just shows the level select as normal).
 */
let pending: ElectionCycle | null = null;

export function setPendingStart(cycle: ElectionCycle | null) {
  pending = cycle;
}

/** Returns the pending term (once) and clears it. */
export function takePendingStart(): ElectionCycle | null {
  const c = pending;
  pending = null;
  return c;
}