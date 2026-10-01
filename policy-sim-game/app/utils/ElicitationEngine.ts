/**
 * Utility elicitation logic (no UI).
 *
 * Gambles follow Cooper et al. (2026)'s framing, simplified: each gamble is a
 * sure LS X versus a lottery between LS 10 (success) and LS 2 (failure), with
 * no death outcome. On a scale where U(2) = 0 and U(10) = 1, the expected
 * utility rule gives U(X) = 1 - p, where p is the risk of failure at which
 * the player is indifferent.
 *
 * The direct method follows Layard & Oparina (2026), condensed to 2-point
 * steps: 2->4 is fixed at 100 and the player rates 4->6, 6->8 and 8->10.
 */

export const ELICITATION_ENABLED = true;

// ---------------------------------------------------------------------------
// Gamble set-up
// ---------------------------------------------------------------------------

export const LOW_OUTCOME = 2;
export const HIGH_OUTCOME = 10;
export const FIXED_POINTS = [4, 6, 8];
const OWN_POINT_OPTIONS = [3, 5, 7, 9];
const OWN_POINT_FALLBACK = 3;

/** Risk of the worse outcome at each step, highest risk first. */
export const LADDER = [1 / 2, 1 / 3, 1 / 5, 1 / 10, 1 / 20, 1 / 50, 1 / 100];
export const LADDER_LABELS = ['1 in 2', '1 in 3', '1 in 5', '1 in 10', '1 in 20', '1 in 50', '1 in 100'];

/** Sentinel risks either side of the ladder. Refusing every step is scored
 * against 1 in 1,000 (the next step on Cooper's ladder); accepting at the
 * very first step is scored against a risk of 1 (Cooper's convention). */
const RISK_ABOVE_LADDER = 1;
const RISK_BELOW_LADDER = 1 / 1000;

const riskAt = (index: number): number =>
  index < 0 ? RISK_ABOVE_LADDER : index >= LADDER.length ? RISK_BELOW_LADDER : LADDER[index];

/** The fourth gamble point: the player's own LS if it adds a new point. */
export function pickOwnPoint(playerLS: number | null): number {
  if (playerLS === null) return OWN_POINT_FALLBACK;
  const rounded = Math.round(playerLS);
  return OWN_POINT_OPTIONS.includes(rounded) ? rounded : OWN_POINT_FALLBACK;
}

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
// One gamble: three choices, starting at 1 in 10 and jumping up or down
// ---------------------------------------------------------------------------

/** 'A' = take the guaranteed outcome, 'B' = take the gamble. */
export type GambleChoice = 'A' | 'B' | 'unsure';
export type GambleBlock = 'personal' | 'social';

export interface GambleStep {
  riskIndex: number;
  choice: GambleChoice;
  ms: number;
}

export interface GambleRecord {
  point: number;
  steps: GambleStep[];
  done: boolean;
  /** Estimated risk at which the player is indifferent. */
  indifferenceRisk: number | null;
  /** U(point) on the 2-10 scale (U(2) = 0, U(10) = 1). */
  utility: number | null;
}

export const createGambleRecord = (point: number): GambleRecord => ({
  point, steps: [], done: false, indifferenceRisk: null, utility: null,
});

/** Bounds implied by the choices so far: the lowest-risk step refused and
 * the highest-risk step accepted. Accepting a risk implies accepting any
 * smaller one, so the answer lies strictly between the two. */
function bounds(steps: GambleStep[]) {
  let refused = -1;
  let accepted = LADDER.length;
  for (const s of steps) {
    if (s.choice === 'A') refused = Math.max(refused, s.riskIndex);
    if (s.choice === 'B') accepted = Math.min(accepted, s.riskIndex);
  }
  return { refused, accepted };
}

/** Which step to show next, or null if the gamble is finished. */
export function nextRiskIndex(record: GambleRecord): number | null {
  if (record.done) return null;
  const { refused, accepted } = bounds(record.steps);
  if (accepted - refused <= 1) return null;
  return Math.floor((refused + accepted) / 2);
}

/** Records a choice at the current step and finishes the gamble when the
 * answer is pinned down (always within three choices). */
export function applyChoice(record: GambleRecord, choice: GambleChoice, ms: number): GambleRecord {
  const riskIndex = nextRiskIndex(record);
  if (riskIndex === null) return record;
  const steps = [...record.steps, { riskIndex, choice, ms }];

  // "Can't choose" means indifferent at this exact risk.
  if (choice === 'unsure') {
    const p = riskAt(riskIndex);
    return { ...record, steps, done: true, indifferenceRisk: p, utility: 1 - p };
  }

  const next = { ...record, steps };
  if (nextRiskIndex(next) !== null) return next;

  // Finished: indifference is the midpoint of the two bounds on a log scale.
  const { refused, accepted } = bounds(steps);
  const p = Math.sqrt(riskAt(refused) * riskAt(accepted));
  return { ...next, done: true, indifferenceRisk: p, utility: 1 - p };
}

// ---------------------------------------------------------------------------
// Curves
// ---------------------------------------------------------------------------

export interface CurvePoint {
  ls: number;
  u: number;
}

/** Utility curve from a set of finished gambles, with the fixed ends added. */
export function gambleCurve(records: Record<number, GambleRecord>): CurvePoint[] {
  const pts: CurvePoint[] = [{ ls: LOW_OUTCOME, u: 0 }, { ls: HIGH_OUTCOME, u: 1 }];
  for (const r of Object.values(records)) {
    if (r.utility !== null) pts.push({ ls: r.point, u: r.utility });
  }
  return pts.sort((a, b) => a.ls - b.ls);
}

/** L&O-style curve from the three slider answers (4->6, 6->8, 8->10), with
 * 2->4 fixed at 100. The running total is scaled so U(10) = 1. */
export const DIRECT_ANCHOR = 100;
export function directCurve(weights: number[]): CurvePoint[] {
  const steps = [DIRECT_ANCHOR, ...weights];
  const total = steps.reduce((s, w) => s + w, 0);
  const pts: CurvePoint[] = [{ ls: LOW_OUTCOME, u: 0 }];
  let running = 0;
  steps.forEach((w, i) => {
    running += w;
    pts.push({ ls: LOW_OUTCOME + 2 * (i + 1), u: total > 0 ? running / total : 0 });
  });
  return pts;
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

export const COMPARE_POINTS = [4, 6, 8];
export const MEAN_GAP_THRESHOLD = 0.1;
export const MAX_GAP_THRESHOLD = 0.2;

export interface CurveComparison {
  meanGap: number;
  maxGap: number;
  /** Average of (a - b). Positive means curve a sits higher, i.e. it is the
   * more cautious / more strongly bent of the two. */
  meanSignedGap: number;
  different: boolean;
}

export function compareCurves(a: CurvePoint[], b: CurvePoint[]): CurveComparison {
  const gaps = COMPARE_POINTS.map((ls) => curveAt(a, ls) - curveAt(b, ls));
  const abs = gaps.map(Math.abs);
  const meanGap = abs.reduce((s, g) => s + g, 0) / abs.length;
  const maxGap = Math.max(...abs);
  const meanSignedGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  return {
    meanGap, maxGap, meanSignedGap,
    different: meanGap >= MEAN_GAP_THRESHOLD || maxGap >= MAX_GAP_THRESHOLD,
  };
}

// ---------------------------------------------------------------------------
// Whole-block state (saved with the game)
// ---------------------------------------------------------------------------

export interface ElicitationState {
  ownPoint: number;
  personalOrder: number[];
  socialOrder: number[];
  personal: Record<number, GambleRecord>;
  social: Record<number, GambleRecord>;
  /** Slider answers for 4->6, 6->8, 8->10 (2->4 is fixed at 100). */
  directWeights: number[] | null;
  whyPersonalSocial: string | null;
  whyMethod: string | null;
  reflection: string | null;
  startedAt: number;
  completed: boolean;
}

export function createElicitationState(playerLS: number | null, seed: number): ElicitationState {
  const ownPoint = pickOwnPoint(playerLS);
  const points = [...FIXED_POINTS, ownPoint];
  const blank = () =>
    Object.fromEntries(points.map((p) => [p, createGambleRecord(p)])) as Record<number, GambleRecord>;
  return {
    ownPoint,
    personalOrder: seededShuffle(points, seed),
    socialOrder: seededShuffle(points, seed + 1),
    personal: blank(),
    social: blank(),
    directWeights: null,
    whyPersonalSocial: null,
    whyMethod: null,
    reflection: null,
    startedAt: Date.now(),
    completed: false,
  };
}

/** All three curves plus the two comparisons the "why" questions depend on. */
export function summariseElicitation(state: ElicitationState) {
  const personal = gambleCurve(state.personal);
  const social = gambleCurve(state.social);
  const direct = state.directWeights ? directCurve(state.directWeights) : null;
  return {
    personal,
    social,
    direct,
    personalVsSocial: compareCurves(personal, social),
    socialVsDirect: direct ? compareCurves(social, direct) : null,
  };
}
