/**
 * Term points: a score for each term, shown only between terms (the morning
 * paper's back page and the level select), never during play.
 *
 *   approval      final approval x 100 (75.3% = 7,530)
 *   reelected     bonus for winning the election (approval >= 51%)
 *   perfect       bonus for 100% approval
 *   press         per correct press conference answer (answers also move approval)
 *   pressBonus    both press conference answers correct
 *
 * Each term can be played once more (win or lose); the better attempt counts.
 */
import { WIN_THRESHOLD } from './polls';

export const POINTS = {
  perApprovalPoint: 100,
  reelected: 2000,
  perfectApproval: 1000,
  perPressAnswer: 250,
  bothPressAnswers: 500,
} as const;

/** Questions asked at each press conference. */
export const PRESS_QUESTIONS = 2;

/** Attempts allowed per term: the first, plus one optional retry. */
export const MAX_ATTEMPTS = 2;

export interface TermPoints {
  approval: number;
  reelected: number;
  perfect: number;
  press: number;
  pressBonus: number;
  total: number;
}

export function termPoints(approvalRating: number, pressCorrect: number): TermPoints {
  const approval = Math.round(approvalRating * POINTS.perApprovalPoint);
  const reelected = approvalRating >= WIN_THRESHOLD ? POINTS.reelected : 0;
  const perfect = approvalRating >= 100 ? POINTS.perfectApproval : 0;
  const press = pressCorrect * POINTS.perPressAnswer;
  const pressBonus = pressCorrect >= PRESS_QUESTIONS ? POINTS.bothPressAnswers : 0;
  return { approval, reelected, perfect, press, pressBonus, total: approval + reelected + perfect + press + pressBonus };
}

export const formatPoints = (n: number) => Math.round(n).toLocaleString('en-GB');

/** One line for the paper: "7,530 approval + 2,000 re-elected + 500 press + 500 both right = 10,530". */
export function pointsBreakdown(p: TermPoints): string {
  const parts = [`${formatPoints(p.approval)} approval`];
  if (p.reelected) parts.push(`${formatPoints(p.reelected)} re-elected`);
  if (p.perfect) parts.push(`${formatPoints(p.perfect)} for 100%`);
  if (p.press) parts.push(`${formatPoints(p.press)} press answers`);
  if (p.pressBonus) parts.push(`${formatPoints(p.pressBonus)} both right`);
  return `${parts.join(' + ')} = ${formatPoints(p.total)} points`;
}
