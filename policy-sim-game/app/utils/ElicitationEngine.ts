/**
 * Utility elicitation logic (no UI).
 *
 * Chained standard gambles between adjacent LS levels. Each gamble offers a
 * sure LS X (option A) against a lottery (option B) that moves the person up
 * to X+2 or down to X-2. Gambles are only ever offered between adjacent
 * levels: 2/4/6, 4/6/8 and 6/8/10.
 *
 * Risk of the worse outcome is offered worst first (1 in 2), then lowered
 * step by step until the player accepts the gamble. Their threshold lies
 * between the last risk they refused and the first they accepted, taken as
 * the midpoint on a log scale. "Both options seem equally good" pins the
 * threshold at the risk on screen.
 *
 * At the threshold, U(X) = p·U(X-2) + (1-p)·U(X+2), so
 *   U(X+2) = (U(X) - p·U(X-2)) / (1 - p).
 * Starting from U(2) = 0 and U(4) = 1, the gambles at 4, 6 and 8 give U(6),
 * U(8) and U(10) in turn. Everything is then rescaled so U(10) = 1.
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
/** Sure outcome of each gamble, lowest first (the chain relies on this order). */
export const GAMBLE_POINTS = [4, 6, 8];

export const lossOutcome = (x: number) => x - LS_STEP;
export const winOutcome = (x: number) => x + LS_STEP;

/** Risk of the worse outcome at each step, worst first (Crispin's ladder). */
export const LADDER = [1 / 2, 1 / 5, 1 / 10, 1 / 100, 1 / 1000, 1 / 10000];
export const LADDER_LABELS = ['1 in 2', '1 in 5', '1 in 10', '1 in 100', '1 in 1,000', '1 in 10,000'];

/** Sentinel risks either side of the ladder. Accepting at the very first
 * step is scored against a risk of 1; refusing every step is scored against
 * 1 in 100,000 (the next step below the ladder). */
const RISK_ABOVE_LADDER = 1;
const RISK_BELOW_LADDER = 1 / 100000;

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
// Curves
// ---------------------------------------------------------------------------

export interface CurvePoint {
  ls: number;
  u: number;
}

/** Utility curve from the chained gambles (U(2) = 0, U(10) = 1), or null
 * until every gamble in the chain is finished. */
export function chainedCurve(records: Record<number, GambleRecord>): CurvePoint[] | null {
  const u: Record<number, number> = { [LOW_OUTCOME]: 0, [LOW_OUTCOME + LS_STEP]: 1 };
  for (const x of GAMBLE_POINTS) {
    const p = records[x]?.lossRisk;
    if (p === null || p === undefined) return null;
    u[winOutcome(x)] = (u[x] - p * u[lossOutcome(x)]) / (1 - p);
  }
  const top = u[HIGH_OUTCOME];
  return [LOW_OUTCOME, ...GAMBLE_POINTS, HIGH_OUTCOME].map((ls) => ({ ls, u: u[ls] / top }));
}

/** Straight line: every point of LS counts the same (the Level 1 rule). */
export const linearCurve = (): CurvePoint[] => [
  { ls: LOW_OUTCOME, u: 0 },
  { ls: HIGH_OUTCOME, u: 1 },
];

/** Linear interpolation along a curve. */
export function curveAt(curve: CurvePoint[], ls: number): number {
  if (curve.length === 0) return 0;
  if (ls <= curve[0].ls) return curve[0].u;
  for (let i = 1; i < curve.length; i++) {
    const a = curve[i - 1];
    const b = curve[i];
    if (ls <= b.ls) return b.ls === a.ls ? b.u : a.u + ((b.u - a.u) * (ls - a.ls)) / (b.ls - a.ls);
  }
  return curve[curve.length - 1].u;
}

/** Value of each 2-point step, with 2->4 = 100 (post-test LO4.4 format). */
export function stepValues(curve: CurvePoint[]): { step: string; value: number }[] {
  const base = curveAt(curve, 4) - curveAt(curve, 2);
  return [2, 4, 6, 8].map((from) => {
    const rise = curveAt(curve, from + 2) - curveAt(curve, from);
    return { step: `${from}→${from + 2}`, value: base > 0 ? (rise / base) * 100 : 0 };
  });
}

// ---------------------------------------------------------------------------
// Comparing two curves
// ---------------------------------------------------------------------------

export const COMPARE_POINTS = GAMBLE_POINTS;
export const MEAN_GAP_THRESHOLD = 0.1;
export const MAX_GAP_THRESHOLD = 0.2;
/** Gaps smaller than this are ignored when working out the direction. */
export const DIRECTION_TOLERANCE = 0.05;

/** 'higher': curve a sits above curve b (a puts more weight on gains at the
 * bottom / is more cautious). 'lower': the reverse. 'mixed': the curves
 * cross, so neither direction is true overall. 'none': no real gap. */
export type CurveDirection = 'higher' | 'lower' | 'mixed' | 'none';

export interface CurveComparison {
  meanGap: number;
  maxGap: number;
  /** Average of (a - b). Positive means curve a sits higher, i.e. it is the
   * more cautious / more strongly bent of the two. */
  meanSignedGap: number;
  direction: CurveDirection;
  different: boolean;
}

export function compareCurves(a: CurvePoint[], b: CurvePoint[]): CurveComparison {
  const gaps = COMPARE_POINTS.map((ls) => curveAt(a, ls) - curveAt(b, ls));
  const abs = gaps.map(Math.abs);
  const meanGap = abs.reduce((s, g) => s + g, 0) / abs.length;
  const maxGap = Math.max(...abs);
  const meanSignedGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  const above = gaps.some((g) => g >= DIRECTION_TOLERANCE);
  const below = gaps.some((g) => g <= -DIRECTION_TOLERANCE);
  const direction: CurveDirection = above && below ? 'mixed' : above ? 'higher' : below ? 'lower' : 'none';
  return {
    meanGap, maxGap, meanSignedGap, direction,
    different: meanGap >= MEAN_GAP_THRESHOLD || maxGap >= MAX_GAP_THRESHOLD,
  };
}

/** 'averse': a fall counts for more than an equal rise (the curve sits above
 * the straight line), so the worse-off get extra weight. 'seeking': the
 * reverse. 'neutral': rises and falls count about the same. */
export type RiskAttitude = 'averse' | 'neutral' | 'seeking';

export function riskAttitude(curve: CurvePoint[]): RiskAttitude {
  const line = linearCurve();
  const gap = GAMBLE_POINTS.reduce((s, ls) => s + curveAt(curve, ls) - curveAt(line, ls), 0) / GAMBLE_POINTS.length;
  return gap >= DIRECTION_TOLERANCE ? 'averse' : gap <= -DIRECTION_TOLERANCE ? 'seeking' : 'neutral';
}

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

/** Both curves (null until that block is finished) and how they compare. */
export function summariseElicitation(state: ElicitationState) {
  const social = chainedCurve(state.social.records);
  const personal = chainedCurve(state.personal.records);
  return {
    social,
    personal,
    personalVsSocial: social && personal ? compareCurves(personal, social) : null,
  };
}