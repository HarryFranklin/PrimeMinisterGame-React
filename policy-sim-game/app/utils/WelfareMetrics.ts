import { Respondent, ElectionCycle } from './types';

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export class WelfareMetrics {
  static getUtilityForPerson(lsScore: number, curve: number[]): number {
    const score = Math.max(lsScore, 2.0);
    const exactIndex = score / 2.0;
    
    let lowerIndex = Math.floor(exactIndex);
    let upperIndex = Math.ceil(exactIndex);
    
    if (lowerIndex < 1) lowerIndex = 1;
    if (upperIndex > 5) upperIndex = 5;
    if (lowerIndex > 5) lowerIndex = 5;
    
    const t = exactIndex - lowerIndex;
    return lerp(curve[lowerIndex], curve[upperIndex], t) * 10;
  }

  static getPopulationCurveMultipliers(populationLS: number[]): number[] {
    const multipliers = [0, 0, 0, 0, 0, 0];

    for (let i = 0; i < populationLS.length; i++) {
      const lsScore = populationLS[i];
      const score = Math.max(lsScore, 2.0);
      const exactIndex = score / 2.0;
      
      let lowerIndex = Math.floor(exactIndex);
      let upperIndex = Math.ceil(exactIndex);
      
      if (lowerIndex < 1) lowerIndex = 1;
      if (upperIndex > 5) upperIndex = 5;
      if (lowerIndex > 5) lowerIndex = 5;
      
      const t = exactIndex - lowerIndex;
      multipliers[lowerIndex] += (1 - t) * 10;
      multipliers[upperIndex] += t * 10;
    }

    return multipliers;
  }

  static evaluateDistribution(populationLS: number[], respondentUOthersCurve: number[]): number {
    let totalUtility = 0;
    for (let i = 0; i < populationLS.length; i++) {
      totalUtility += this.getUtilityForPerson(populationLS[i], respondentUOthersCurve);
    }
    return totalUtility / populationLS.length;
  }

  // Centralised cycle utility evaluator to prevent logic duplication
  static getCycleUtility(respondent: Respondent, cycle: ElectionCycle, populationLength: number, allLS: number[], multipliers?: number[] | null): number {
    if (cycle === ElectionCycle.Benthamite || cycle === ElectionCycle.Rawlsian) {
      return respondent.currentLS;
    } else if (cycle === ElectionCycle.PersonalUtility) {
      return WelfareMetrics.getUtilityForPerson(respondent.currentLS, respondent.personalUtilities);
    } else if (cycle === ElectionCycle.SocietalUtility) {
      if (multipliers) {
        let personSocietalUtility = 0;
        for (let i = 0; i < 6; i++) {
          personSocietalUtility += multipliers[i] * respondent.societalUtilities[i];
        }
        return personSocietalUtility / populationLength;
      }
      return WelfareMetrics.evaluateDistribution(allLS, respondent.societalUtilities);
    }
    return respondent.currentLS;
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