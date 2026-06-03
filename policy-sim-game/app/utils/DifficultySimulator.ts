import { Respondent, Policy, ElectionCycle } from "./types";
import { loadPopulation } from "./dataLoader";
import { WelfareMetrics } from "./WelfareMetrics";
import { PolicyEngine } from "./PolicyEngine";
import { MAOEngine } from "./MAOEngine";
import { availablePolicies } from "../data/policies";
import { FRAMEWORK_RULES } from "./frameworkRules";

export class DifficultySimulator {
  private static getMetricScore(pop: Respondent[], cycle: ElectionCycle): number {
    if (pop.length === 0) return 0;
    if (cycle === ElectionCycle.Benthamite) return pop.reduce((s, r) => s + r.currentLS, 0) / pop.length;
    if (cycle === ElectionCycle.Rawlsian) return WelfareMetrics.calculateSocietalFloor(pop);
    
    const allLS = pop.map(p => p.currentLS);
    if (cycle === ElectionCycle.SocietalUtility) return pop.reduce((s, r) => s + WelfareMetrics.evaluateDistribution(allLS, r.societalUtilities), 0) / pop.length;
    return pop.reduce((s, r) => s + WelfareMetrics.getUtilityForPerson(r.currentLS, r.personalUtilities), 0) / pop.length;
  }

  /**
   * The deterministic generator from useGameEngine.ts
   * This guarantees the simulation tests the precise layout players A and B experience
   */
  private static generateCycleSchedule(cycle: ElectionCycle, available: Policy[]): Policy[][] {
    const schedule: Policy[][] = [];
    let seed = cycle * 12345 + 1; // Explicitly mirrors the exact game seed structure
    
    const pseudoRandom = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };
    
    let pool = [...available];
    for (let t = 0; t < 5; t++) {
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

  /**
   * Runs the random walk simulation. Because the schedule for a cycle is completely 
   * static/deterministic, running a single random walk 10,000 times will map out 
   * the exact probability curve of guessing a win on this specific layout.
   */
  static runDeterministicSimulation(iterations: number = 10000) {
    console.log(`Running seed-accurate simulation (${iterations} random walks)...`);
    const population = loadPopulation();
    const cycles = [
      ElectionCycle.Benthamite, 
      ElectionCycle.Rawlsian, 
      ElectionCycle.PersonalUtility, 
      ElectionCycle.SocietalUtility
    ];
    
    const results: Record<string, any> = {};

    for (const cycle of cycles) {
      // Get the exact schedule the actual players will use
      const staticSchedule = this.generateCycleSchedule(cycle, availablePolicies);
      const maoResult = MAOEngine.calculateMAO(population, staticSchedule, cycle, this.getMetricScore);
      
      // Pull the dynamic scalar from the central rules file
      const scalar = FRAMEWORK_RULES[cycle].winThresholdScalar;
      const winThreshold = maoResult.maxScore * scalar; 
      
      let winCount = 0;
      let totalRandomScore = 0;

      for (let i = 0; i < iterations; i++) {
        let currentPop = population;
        let currentPath: Policy[] = [];
        
        for (let t = 0; t < 5; t++) {
          // Enforce your strict mutual exclusivity rule
          const options = staticSchedule[t].filter(opt => !currentPath.some(p => p.id === opt.id));
          const validOptions = options.length > 0 ? options : staticSchedule[t];
          
          // Random walk selects a valid option from the static tray
          const randomPick = validOptions[Math.floor(Math.random() * validOptions.length)];
          currentPath.push(randomPick);
          currentPop = PolicyEngine.applyPolicy(currentPop, randomPick);
        }

        const randomWalkScore = this.getMetricScore(currentPop, cycle);
        totalRandomScore += randomWalkScore;
        
        if (randomWalkScore >= winThreshold) {
          winCount++;
        }
      }

      results[ElectionCycle[cycle]] = {
        "Optimal Score (MAO)": maoResult.maxScore.toFixed(3),
        "Target Score (90%)": winThreshold.toFixed(3),
        "Avg Random Walk Score": (totalRandomScore / iterations).toFixed(3),
        "Random Win Chance": ((winCount / iterations) * 100).toFixed(2) + "%"
      };
    }

    console.table(results);
    return results;
  }
}