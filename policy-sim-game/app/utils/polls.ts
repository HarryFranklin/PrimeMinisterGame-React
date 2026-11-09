/**
 * Polls instead of an exact approval score.
 *
 * Players only ever see a range ("38–44%") with a status word, never the exact
 * approval. The range narrows as polling day gets closer, and each term's poll
 * is off-centre by a small fixed error (real polls miss), so the middle of the
 * band isn't the real number. The real approval is revealed at the count.
 *
 * Display only: the exact approval is still what decides the vote and what
 * telemetry records.
 */

/** Half-width of the poll band (± percentage points) on each day of the term. */
export const POLL_HALF_WIDTH_BY_DAY = [10, 8, 6, 5, 4];
/** Once Parliament is dissolved, and through the press conference. */
export const POLL_HALF_WIDTH_POLLING_DAY = 3;
/** The final poll the Chief of Staff hands over after the press conference. */
export const POLL_HALF_WIDTH_FINAL = 2;
/** Largest amount a term's poll can be off by, either way. */
export const POLL_MAX_ERROR = 1.5;

export const WIN_THRESHOLD = 51;

export type PollStatus = 'Comfortable lead' | 'Ahead' | 'Too close to call' | 'Behind';

export interface Poll {
  low: number;
  high: number;
  status: PollStatus;
}

/** Status colours: `onDark` for the leather bar and the street, `onLight` for paper. */
export const POLL_STATUS_COLOURS: Record<PollStatus, { onDark: string; onLight: string }> = {
  'Comfortable lead': { onDark: '#34d399', onLight: '#15803d' },
  Ahead: { onDark: '#86efac', onLight: '#15803d' },
  'Too close to call': { onDark: '#fbbf24', onLight: '#b45309' },
  Behind: { onDark: '#fb7185', onLight: '#be123c' },
};

/**
 * This term's poll error, between −POLL_MAX_ERROR and +POLL_MAX_ERROR.
 * Deterministic from the seed, so it stays the same across reloads and only
 * changes when the term is played again.
 */
export function pollError(seed: string): number {
  // FNV-1a hash → [0, 1)
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const unit = (h >>> 0) / 0x100000000;
  return (unit * 2 - 1) * POLL_MAX_ERROR;
}

/** Half-width of the band for a given day (1-based), or polling day once dissolved. */
export function pollHalfWidth(day: number, dissolved: boolean): number {
  if (dissolved) return POLL_HALF_WIDTH_POLLING_DAY;
  return POLL_HALF_WIDTH_BY_DAY[Math.min(POLL_HALF_WIDTH_BY_DAY.length, Math.max(1, day)) - 1];
}

/** The poll the player sees for a given (hidden) approval. */
export function makePoll(approval: number, halfWidth: number, error: number): Poll {
  const centre = Math.max(0, Math.min(100, approval + error));
  const low = Math.max(0, centre - halfWidth);
  const high = Math.min(100, centre + halfWidth);
  const status: PollStatus =
    low >= 55 ? 'Comfortable lead' : low >= WIN_THRESHOLD ? 'Ahead' : high >= WIN_THRESHOLD ? 'Too close to call' : 'Behind';
  return { low, high, status };
}

export function formatPollRange(poll: Poll): string {
  return `${Math.round(poll.low)}–${Math.round(poll.high)}%`;
}

/** The part of the 0–100 scale a poll bar shows (polls never sit at the extremes). */
export const POLL_SCALE_MIN = 0;
export const POLL_SCALE_MAX = 100;

/** Position on a poll bar, as a percentage of its width. */
export function pollBarPercent(value: number): number {
  const v = Math.max(POLL_SCALE_MIN, Math.min(POLL_SCALE_MAX, value));
  return ((v - POLL_SCALE_MIN) / (POLL_SCALE_MAX - POLL_SCALE_MIN)) * 100;
}