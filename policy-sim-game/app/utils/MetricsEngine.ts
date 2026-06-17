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
    
    const allLS = cycle === ElectionCycle.SocietalUtility ? pop.map(p => p.currentLS) : [];
    const multipliers = cycle === ElectionCycle.SocietalUtility ? WelfareMetrics.getPopulationCurveMultipliers(allLS) : null;

    let totalUtility = 0;
    for (let i = 0; i < pop.length; i++) {
        totalUtility += WelfareMetrics.getCycleUtility(pop[i], cycle, pop.length, allLS, multipliers);
    }

    return totalUtility / pop.length;
  }

  static generateCycleSchedule(cycle: ElectionCycle, available: Policy[], turnsPerCycle: number): Policy[][] {
    const schedule: Policy[][] = [];
    
    // The pseudo-random seed is deliberately deterministic per cycle so that players 
    // encountering failure will always face the exact same sequence of policies upon retrying.
    // This allows them to systematically deduce and learn the optimal path.
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