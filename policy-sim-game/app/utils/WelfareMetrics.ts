import { Respondent, ElectionCycle } from './types';

const UNIVERSAL_PERSONAL_UTILITY: Record<number, number> = {
  2: 0.0, 3: 0.275568, 4: 0.551136, 5: 0.664072, 6: 0.777007, 7: 0.841651, 8: 0.906294, 9: 0.953147, 10: 1.0
};

const UNIVERSAL_SOCIETAL_UTILITY: Record<number, number> = {
  2: 0.0, 3: 0.358417, 4: 0.716835, 5: 0.795576, 6: 0.874317, 7: 0.910711, 8: 0.947105, 9: 0.973553, 10: 1.0
};

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export class WelfareMetrics {
  
  static getUtility(lsScore: number, type: 'personal' | 'societal'): number {
    const score = Math.max(2.0, Math.min(10.0, lsScore));
    const lowerIndex = Math.floor(score);
    const upperIndex = Math.ceil(score);
    const t = score - lowerIndex;

    const table = type === 'personal' ? UNIVERSAL_PERSONAL_UTILITY : UNIVERSAL_SOCIETAL_UTILITY;

    if (lowerIndex === upperIndex) return table[lowerIndex] * 10;
    return lerp(table[lowerIndex], table[upperIndex], t) * 10;
  }

  // Backward compatibility stub: Returns null so old hooks don't crash
  static getPopulationCurveMultipliers(populationLS: number[]): null {
    return null;
  }

  /** Anchor LS points the per-person PU/SU curves are sampled at in the
   * source JSON: [U_Death, U_2, U_4, U_6, U_8, U_10]. */
  private static readonly CURVE_ANCHORS = [0, 2, 4, 6, 8, 10];

  /** Interpolates ONE respondent's own PU or SU curve (loaded from
   * personalUtilities.json / societalUtilities.json onto Respondent.personalUtilities
   * / .societalUtilities) at a given LS score. Falls back to the universal
   * reference curve if a respondent is missing curve data. */
  static getUtilityForPerson(lsScore: number, curve?: number[]): number {
    if (!curve || curve.length !== WelfareMetrics.CURVE_ANCHORS.length) {
      return this.getUtility(lsScore, 'personal');
    }

    const anchors = WelfareMetrics.CURVE_ANCHORS;
    const score = Math.max(anchors[0], Math.min(anchors[anchors.length - 1], lsScore));

    let i = 0;
    while (i < anchors.length - 2 && score > anchors[i + 1]) i++;

    const lower = anchors[i];
    const upper = anchors[i + 1];
    const t = upper === lower ? 0 : (score - lower) / (upper - lower);

    return lerp(curve[i], curve[i + 1], t) * 10;
  }

  /** Average utility a population's LS values would score when run through
   * ONE respondent's own curve (used for the "empathy citizen" comparison -
   * how would this specific person rate everyone else's welfare). */
  static evaluateDistribution(populationLS: number[], curve?: number[]): number {
    let totalUtility = 0;
    for (let i = 0; i < populationLS.length; i++) {
      totalUtility += this.getUtilityForPerson(populationLS[i], curve);
    }
    return populationLS.length > 0 ? totalUtility / populationLS.length : 0;
  }

  static getCycleUtility(
    respondent: Respondent, 
    cycle: ElectionCycle, 
    populationLength: number, 
    allLS: number[], 
    multipliers?: any // Kept for backwards compatibility
  ): number {
    const flooredLS = Math.max(2.0, respondent.currentLS);

    if (cycle === ElectionCycle.Benthamite || cycle === ElectionCycle.Rawlsian) {
      return flooredLS;
    } else if (cycle === ElectionCycle.PersonalUtility) {
      return WelfareMetrics.getUtilityForPerson(flooredLS, respondent.personalUtilities);
    } else if (cycle === ElectionCycle.SocietalUtility) {
      // Return the individual's own SU curve value so the table can calculate column contributions accurately
      return WelfareMetrics.getUtilityForPerson(flooredLS, respondent.societalUtilities);
    }
    return flooredLS;
  }

  static getColumnStats(
    col: number,
    population: Respondent[],
    cycle: ElectionCycle,
    allLS: number[],
    multipliers?: any // Kept for backwards compatibility
  ): { count: number; avgUtility: number; totalYield: number } {
    const citizens = population.filter(
      r => Math.min(10, Math.max(0, Math.round(r.currentLS))) === col
    );
    const count = citizens.length;
    if (count === 0) return { count: 0, avgUtility: 0, totalYield: 0 };

    const totalYield = citizens.reduce(
      (sum, r) => sum + WelfareMetrics.getCycleUtility(r, cycle, population.length, allLS),
      0
    );

    return { count, avgUtility: totalYield / count, totalYield };
  }

  static calculateInequalityIndex(population: Respondent[]): number {
    if (population.length === 0) return 0;
    const mean = population.reduce((sum, r) => sum + r.currentLS, 0) / population.length;
    const squaredDiffs = population.map(r => Math.pow(r.currentLS - mean, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / population.length;
    return Math.sqrt(variance);
  }

  static calculateSocietalFloor(population: Respondent[]): number {
    if (population.length === 0) return 0;
    return Math.min(...population.map(r => r.currentLS));
  }

  static calculateApprovalRating(currentScore: number, cycleMAO: number, scalar: number): number {
    if (cycleMAO <= 0) return 0;
    const threshold = cycleMAO * scalar;
    let approvalRating = 0;
    if (currentScore >= threshold) {
      const range = cycleMAO - threshold;
      const progress = range <= 0 ? 1 : (currentScore - threshold) / range;
      approvalRating = 51 + (progress * 49);
    } else {
      const progress = Math.max(0, currentScore) / threshold;
      approvalRating = progress * 51;
    }
    const finalRating = Math.max(0, Math.min(100, approvalRating));
    return Math.round(finalRating * 10) / 10;
  }
}