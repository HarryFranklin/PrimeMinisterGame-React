import { ElectionCycle, Policy, PolicyRule, Respondent } from '../../utils/types';
import { PolicyEngine } from '../../utils/PolicyEngine';
import { CYCLE_COLORS } from '../../utils/uiHelpers';

/**
 * Each PM's colour runs through the desk's top bar (labels, approval, the
 * countdown, Continue), so every term looks different at a glance.
 * `light` reads on the dark leather; `dark` carries white text.
 */
export const PM_TONES: Record<ElectionCycle, { color: string; light: string; dark: string }> = {
  [ElectionCycle.Benthamite]: { color: CYCLE_COLORS[ElectionCycle.Benthamite], light: '#f472b6', dark: '#be185d' },
  [ElectionCycle.Rawlsian]: { color: CYCLE_COLORS[ElectionCycle.Rawlsian], light: '#60a5fa', dark: '#1d4ed8' },
  [ElectionCycle.SocietalUtility]: { color: CYCLE_COLORS[ElectionCycle.SocietalUtility], light: '#34d399', dark: '#047857' },
  [ElectionCycle.PersonalUtility]: { color: CYCLE_COLORS[ElectionCycle.PersonalUtility], light: '#a78bfa', dark: '#6d28d9' },
};

/** Show the exact score and target under "Judged on". Turn off to show only the status words. */
export const SHOW_EXACT_SCORE = true;

export type TermStatus = 'On track' | 'Close call' | 'Falling behind' | 'Target reached';

/**
 * Where the PM stands, in words. Compares the score now with a steady pace
 * from the term's starting score to the target by election day.
 * `turn` is the current turn (1 = nothing signed yet); `turns` is turns per term.
 */
export function termStatus(score: number, start: number, target: number, turn: number, turns: number): TermStatus {
  if (score >= target) return 'Target reached';
  const done = Math.min(turns, Math.max(0, turn - 1));
  const pace = start + (target - start) * (done / turns);
  const gap = Math.abs(target - start) || 1;
  if (score >= pace - 0.02 * gap) return 'On track';
  if (score >= pace - 0.25 * gap) return 'Close call';
  return 'Falling behind';
}

/** LS columns (0–10) a rule reaches. */
export function ruleBins(rule: PolicyRule): number[] {
  const lo = Math.max(0, Math.ceil((rule.minLS ?? 0) - 0.001));
  const hi = Math.min(10, Math.floor((rule.maxLS ?? 10) + 0.001));
  const out: number[] = [];
  for (let i = lo; i <= hi; i++) out.push(i);
  return out;
}

export type Direction = 1 | -1 | 0;

/** Expected change for someone in column `i` from the rules alone: each rule's
 * impact weighted by the share of people in range it actually reaches. */
function expectedChange(rules: PolicyRule[], i: number): number {
  return rules.reduce((t, r) => t + (ruleBins(r).includes(i) ? r.impact * (r.affectEveryone ? 1 : r.proportion) : 0), 0);
}

/**
 * Overall direction of a bill in each LS column: 1 lifts people there on
 * average, -1 pushes them down, 0 no real change. Worked out from what the
 * bill actually does to the people in each column (the same calculation as
 * the preview), so the bar always agrees with the chart. Empty columns fall
 * back to the rules' expected change.
 */
export function overallByBin(policy: Policy, population: Respondent[]): Direction[] {
  const after = PolicyEngine.applyPolicy(population, policy);
  const sum = new Array(11).fill(0);
  const n = new Array(11).fill(0);
  population.forEach((r, idx) => {
    const b = Math.min(10, Math.max(0, Math.round(r.currentLS)));
    sum[b] += after[idx].currentLS - r.currentLS;
    n[b] += 1;
  });
  return Array.from({ length: 11 }, (_, i) => {
    const change = n[i] > 0 ? sum[i] / n[i] : expectedChange(policy.specificRules, i);
    return change > 0.02 ? 1 : change < -0.02 ? -1 : 0;
  });
}

/** Same as overallByBin, but from a recorded before/after (an enacted bill). */
export function directionsFromChange(before: number[], after: number[]): Direction[] {
  const sum = new Array(11).fill(0);
  const n = new Array(11).fill(0);
  before.forEach((b, idx) => {
    const bin = Math.min(10, Math.max(0, Math.round(b)));
    sum[bin] += after[idx] - b;
    n[bin] += 1;
  });
  return Array.from({ length: 11 }, (_, i) => {
    const change = n[i] > 0 ? sum[i] / n[i] : 0;
    return change > 0.02 ? 1 : change < -0.02 ? -1 : 0;
  });
}
