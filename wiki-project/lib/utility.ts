/**
 * Utility conversion: maps a raw 0-10 Life Satisfaction score onto a 0-1
 * utility value, using the diminishing-marginal-utility curves described in
 * the wiki (see /wiki/mathematics-of-utility, /wiki/personal-utility,
 * /wiki/societal-utility).
 *
 * Two curves are provided:
 *  - Personal Utility: how a person weighs a change in their own LS.
 *  - Societal Utility: how a change in someone's LS should be weighed when
 *    evaluating a policy's effect on society (more front-loaded — it
 *    penalises low scores more heavily, reflecting inequality aversion).
 *
 * Both tables are only defined for whole-number LS scores from 2 to 10.
 * Scores below 2 are treated as 0 utility (no meaningful cushion left to
 * diminish from); scores are linearly interpolated between whole numbers.
 */

export const PERSONAL_UTILITY_TABLE: Readonly<Record<number, number>> = {
  2: 0.0,
  3: 0.275568,
  4: 0.551136,
  5: 0.664072,
  6: 0.777007,
  7: 0.841651,
  8: 0.906294,
  9: 0.953147,
  10: 1.0,
};

export const SOCIETAL_UTILITY_TABLE: Readonly<Record<number, number>> = {
  2: 0.0,
  3: 0.358417,
  4: 0.716835,
  5: 0.795576,
  6: 0.874317,
  7: 0.910711,
  8: 0.947105,
  9: 0.973553,
  10: 1.0,
};

/** Linearly interpolates a raw LS score against a whole-number utility table. */
function lookupUtility(table: Readonly<Record<number, number>>, lifeSatisfaction: number): number {
  if (lifeSatisfaction <= 2) return 0;
  if (lifeSatisfaction >= 10) return 1;

  const lower = Math.floor(lifeSatisfaction);
  const upper = Math.ceil(lifeSatisfaction);

  if (lower === upper) return table[lower];

  const lowerValue = table[lower];
  const upperValue = table[upper];
  const t = lifeSatisfaction - lower;

  return lowerValue + (upperValue - lowerValue) * t;
}

/** Converts a raw 0-10 Life Satisfaction score into Personal Utility (0-1). */
export function personalUtility(lifeSatisfaction: number): number {
  return lookupUtility(PERSONAL_UTILITY_TABLE, lifeSatisfaction);
}

/** Converts a raw 0-10 Life Satisfaction score into Societal Utility (0-1). */
export function societalUtility(lifeSatisfaction: number): number {
  return lookupUtility(SOCIETAL_UTILITY_TABLE, lifeSatisfaction);
}