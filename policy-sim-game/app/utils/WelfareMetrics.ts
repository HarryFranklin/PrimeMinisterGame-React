import { Respondent } from './types';

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export class WelfareMetrics {
  
  // Maps a Life Satisfaction score to a Utility value using the respondent's unique curve
  static getUtilityForPerson(lsScore: number, curve: number[]): number {
    if (lsScore <= -0.9) return curve[0]; // Death state

    const score = Math.max(lsScore, 2.0); // Clamp to minimum available data
    const exactIndex = score / 2.0;
    
    let lowerIndex = Math.floor(exactIndex);
    let upperIndex = Math.ceil(exactIndex);
    
    // Safety clamp (indices 1 through 5 represent LS 2, 4, 6, 8, 10)
    if (lowerIndex < 1) lowerIndex = 1;
    if (upperIndex > 5) upperIndex = 5;
    if (lowerIndex > 5) lowerIndex = 5;

    const t = exactIndex - lowerIndex; 
    return lerp(curve[lowerIndex], curve[upperIndex], t);
  }

  // Calculates Societal Fairness by evaluating the whole population against one respondent's empathy curve
  static evaluateDistribution(populationLS: number[], respondentUOthersCurve: number[]): number {
    let totalUtility = 0;
    for (let i = 0; i < populationLS.length; i++) {
      totalUtility += this.getUtilityForPerson(populationLS[i], respondentUOthersCurve);
    }
    return totalUtility / populationLS.length;
  }

  /**
   * Calculates the Standard Deviation of Life Satisfaction for the population.
   * Acts as a mathematical proxy for inequality (lower = more equal).
   */
  static calculateInequalityIndex(population: Respondent[]): number {
    if (population.length === 0) return 0;
    const mean = population.reduce((sum, r) => sum + r.currentLS, 0) / population.length;
    const squaredDiffs = population.map(r => Math.pow(r.currentLS - mean, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / population.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculates the Societal Floor (Minimum Life Satisfaction).
   * Used as the target metric for the Rawlsian Framework.
   */
  static calculateSocietalFloor(population: Respondent[]): number {
    if (population.length === 0) return 0;
    return Math.min(...population.map(r => r.currentLS));
  }

  /**
   * Maps a raw metric score against the MAO to democratic Approval Rating.
   * 90% of MAO = 51% Approval.
   */
  static calculateApprovalRating(currentScore: number, cycleMAO: number): number {
    if (cycleMAO <= 0) return 0; // Fallback safety
    const threshold = cycleMAO * 0.90;
    
    let approvalRating = 0;
    if (currentScore >= threshold) {
      // Maps [Threshold -> MAO] to [51% -> 100%]
      const range = cycleMAO - threshold;
      const progress = range <= 0 ? 1 : (currentScore - threshold) / range;
      approvalRating = 51 + (progress * 49);
    } else {
      // Maps [0 -> Threshold] to [0% -> 51%]
      const progress = Math.max(0, currentScore) / threshold;
      approvalRating = progress * 51;
    }
    
    return Math.max(0, Math.min(100, approvalRating));
  }
}