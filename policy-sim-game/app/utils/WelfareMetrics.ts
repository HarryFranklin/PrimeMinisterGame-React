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
}