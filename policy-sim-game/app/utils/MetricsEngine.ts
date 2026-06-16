import { Respondent, ElectionCycle, Policy } from "./types";
import { WelfareMetrics } from "./WelfareMetrics";

export class MetricsEngine {
  static getMetricScore(pop: Respondent[], cycle: ElectionCycle): number {
    if (pop.length === 0) return 0;
    
    if (cycle === ElectionCycle.Benthamite) {
        return pop.reduce((s, r) => s + r.currentLS, 0) / pop.length;
    }
    
    if (cycle === ElectionCycle.Rawlsian) {
        return WelfareMetrics.calculateSocietalFloor(pop);
    }
    
    if (cycle === ElectionCycle.SocietalUtility) {

      const allLS = pop.map(p => p.currentLS);
      const multipliers = WelfareMetrics.getPopulationCurveMultipliers(allLS);
      let totalPopUtility = 0;
      
      for (let i = 0; i < pop.length; i++) {
        const r = pop[i];
        let personSocietalUtility = 0;
        for (let j = 0; j < 6; j++) {
          personSocietalUtility += multipliers[j] * r.societalUtilities[j];
        }
        totalPopUtility += (personSocietalUtility / pop.length);
      }
      return totalPopUtility / pop.length;
    }

    return pop.reduce((s, r) => s + WelfareMetrics.getUtilityForPerson(r.currentLS, r.personalUtilities), 0) / pop.length;
  }

  static generateCycleSchedule(cycle: ElectionCycle, available: Policy[], turnsPerCycle: number): Policy[][] {
    const schedule: Policy[][] = [];
    let seed = cycle * 12345 + 1;

    const pseudoRandom = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    let pool = [...available];
    for (let t = 0; t < turnsPerCycle; t++) {
      const turnPolicies: Policy[] = [];
      for (let p = 0; p < 8; p++) {
        if (pool.length === 0) pool = [...available];
        const index = Math.floor(pseudoRandom() * pool.length);
        turnPolicies.push(pool[index]);
        pool.splice(index, 1);
      }
      schedule.push(turnPolicies);
    }
    return schedule;
  }
}