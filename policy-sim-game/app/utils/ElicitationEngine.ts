/**
 * Utility elicitation logic (no UI).
 *
 * One standard gamble per block (supervisor, Nov 2026: the gambles teach; the
 * game scores Levels 3 and 4 with the public's curves, not the player's).
 * Option A is a sure LS 4; option B moves the person up to LS 6 or down to
 * LS 2. The risk of the worse outcome starts at 1 in 2 and keeps improving
 * until the player accepts the gamble, or still refuses at 1 in 1,000,000.
 *
 * The threshold lies between the last risk refused and the first accepted,
 * taken as the midpoint on a log scale. "Both options seem equally good" pins
 * it at the risk on screen. At the threshold U(4) = p·U(2) + (1-p)·U(6), so
 * with U(2) = 0 and U(4) = 1, U(6) = 1 / (1 - p): the rise from 4 to 6 is worth
 * p / (1 - p) of the rise from 2 to 4. The lower the risk someone needs, the
 * more a gain near the bottom counts for them (more cautious).
 */

/** Turns the elicitation blocks on (social before Level 3, personal before Level 4). */
export const ELICITATION_ENABLED = true;

// ---------------------------------------------------------------------------
// Gamble set-up
// ---------------------------------------------------------------------------

export const LOW_OUTCOME = 2;
export const HIGH_OUTCOME = 10;
/** Distance between adjacent levels. */
export const LS_STEP = 2;
/** Sure outcome of the gamble (one per block). LS 4 is where the public's
 * answers for themselves and for others differ most. */
export const GAMBLE_POINTS = [4];

export const lossOutcome = (x: number) => x - LS_STEP;
export const winOutcome = (x: number) => x + LS_STEP;

/** Risk of the worse outcome at each step, worst first (Crispin's ladder). */
export const LADDER = [1 / 2, 1 / 5, 1 / 10, 1 / 100, 1 / 1000, 1 / 10000, 1 / 100000, 1 / 1000000];
export const LADDER_LABELS = ['1 in 2', '1 in 5', '1 in 10', '1 in 100', '1 in 1,000', '1 in 10,000', '1 in 100,000', '1 in 1,000,000'];

/** Sentinel risks either side of the ladder. Accepting at the very first
 * step is scored against a risk of 1; refusing every step is scored against
 * 1 in 10,000,000 (the next step below the ladder). */
const RISK_ABOVE_LADDER = 1;
const RISK_BELOW_LADDER = 1 / 10000000;

const riskAt = (index: number): number =>
  index < 0 ? RISK_ABOVE_LADDER : index >= LADDER.length ? RISK_BELOW_LADDER : LADDER[index];

/** Midpoint of two risks on a log scale. */
const logMidpoint = (a: number, b: number) => Math.exp((Math.log(a) + Math.log(b)) / 2);

/** Seeded shuffle (mulberry32) so each participant's order is reproducible. */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  let a = seed >>> 0;
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ---------------------------------------------------------------------------
// One gamble: risk lowered step by step until the player takes option B
// ---------------------------------------------------------------------------

/** 'A' = take the sure outcome, 'B' = take the gamble,
 * 'equal' = both options seem equally good. */
export type GambleChoice = 'A' | 'B' | 'equal';
export type GambleBlock = 'social' | 'personal';

export interface GambleStep {
  riskIndex: number;
  choice: GambleChoice;
  ms: number;
}

export interface GambleRecord {
  /** The sure LS (X). The gamble is between X+2 and X-2. */
  point: number;
  steps: GambleStep[];
  done: boolean;
  /** Risk of the worse outcome at which the player is indifferent. */
  lossRisk: number | null;
}

export const createGambleRecord = (point: number): GambleRecord => ({
  point, steps: [], done: false, lossRisk: null,
});

/** Which step to show next, or null if the gamble is finished. Steps run
 * down the ladder in order, so the next one is simply the step count. */
export function nextRiskIndex(record: GambleRecord): number | null {
  if (record.done || record.steps.length >= LADDER.length) return null;
  return record.steps.length;
}

/** Records a choice at the current step and finishes the gamble once the
 * threshold is known. */
export function applyChoice(record: GambleRecord, choice: GambleChoice, ms: number): GambleRecord {
  const riskIndex = nextRiskIndex(record);
  if (riskIndex === null) return record;
  const steps = [...record.steps, { riskIndex, choice, ms }];

  // Equally good: indifferent at exactly this risk.
  if (choice === 'equal') {
    return { ...record, steps, done: true, lossRisk: riskAt(riskIndex) };
  }

  // Took the gamble: threshold is between the step above (refused) and this one.
  if (choice === 'B') {
    return { ...record, steps, done: true, lossRisk: logMidpoint(riskAt(riskIndex - 1), riskAt(riskIndex)) };
  }

  // Refused the gamble: offer a safer one, unless the ladder has run out.
  if (riskIndex === LADDER.length - 1) {
    return { ...record, steps, done: true, lossRisk: logMidpoint(riskAt(riskIndex), riskAt(riskIndex + 1)) };
  }
  return { ...record, steps };
}

/** Removes the last choice, reopening the gamble. */
export const undoChoice = (record: GambleRecord): GambleRecord => ({
  ...record, steps: record.steps.slice(0, -1), done: false, lossRisk: null,
});

// ---------------------------------------------------------------------------
// What an answer means
// ---------------------------------------------------------------------------

/** Where on the ladder the gamble was accepted: its index, or LADDER.length if
 * it was refused every time (even at 1 in 1,000,000). Null until finished. */
export function acceptedIndex(record: GambleRecord): number | null {
  if (!record.done) return null;
  const last = record.steps[record.steps.length - 1];
  return last && last.choice !== 'A' ? last.riskIndex : LADDER.length;
}

/** Label for an accepted index: "1 in 10", or "never" past the ladder. */
export const acceptedLabel = (index: number) => (index < LADDER.length ? LADDER_LABELS[index] : 'never');

/** What the rise from 4 to 6 is worth, with the rise from 2 to 4 worth 1. */
export const riseWorth = (lossRisk: number) => lossRisk / (1 - lossRisk);

/** Where the public would accept the same gamble, from their utility curve
 * (utility at LS 2, 4 and 6): the first ladder step at or below their
 * indifference risk p = (U6 - U4) / (U6 - U2). */
export function publicAcceptedIndex(u2: number, u4: number, u6: number): number {
  const p = (u6 - u4) / (u6 - u2);
  const i = LADDER.findIndex((r) => r <= p + 1e-9);
  return i === -1 ? LADDER.length : i;
}

/** 'higher': a needed a lower risk than b (more cautious). 'lower': the
 * reverse. 'none': same step on the ladder. */
export type CautionDirection = 'higher' | 'lower' | 'none';
export const compareCaution = (a: number, b: number): CautionDirection =>
  (a > b ? 'higher' : a < b ? 'lower' : 'none');

// ---------------------------------------------------------------------------
// Block state (saved with the game)
// ---------------------------------------------------------------------------

export interface BlockState {
  order: number[];
  records: Record<number, GambleRecord>;
  /** Set when the block first opens, so dwell time survives a refresh. */
  startedAt: number | null;
  undoCount: number;
  completed: boolean;
}

export interface ElicitationState {
  /** Before Level 3: deciding for citizens. */
  social: BlockState;
  /** Before Level 4: deciding for your own life. */
  personal: BlockState;
}

function createBlock(seed: number): BlockState {
  return {
    order: seededShuffle(GAMBLE_POINTS, seed),
    records: Object.fromEntries(GAMBLE_POINTS.map((p) => [p, createGambleRecord(p)])),
    startedAt: null,
    undoCount: 0,
    completed: false,
  };
}

export function createElicitationState(seed: number): ElicitationState {
  return { social: createBlock(seed + 1), personal: createBlock(seed) };
}

/** Index (in play order) of the gamble in progress, or -1 if all are done. */
export const currentGambleIndex = (b: BlockState) => b.order.findIndex((p) => !b.records[p].done);
export const blockStarted = (b: BlockState) => b.order.some((p) => b.records[p].steps.length > 0);
export const canUndo = (b: BlockState) => blockStarted(b) && !b.completed;

/** Steps back one choice: within the current gamble if it has any, otherwise
 * into the previous gamble. Returns null if there is nothing to undo. */
export function undoLastChoice(b: BlockState): { state: BlockState; point: number; stepIndex: number } | null {
  if (!canUndo(b)) return null;
  const current = currentGambleIndex(b);
  const idx = current === -1 ? b.order.length - 1
    : b.records[b.order[current]].steps.length > 0 ? current : current - 1;
  if (idx < 0) return null;
  const point = b.order[idx];
  const record = b.records[point];
  return {
    state: { ...b, records: { ...b.records, [point]: undoChoice(record) }, undoCount: b.undoCount + 1 },
    point,
    stepIndex: record.steps.length - 1,
  };
}
