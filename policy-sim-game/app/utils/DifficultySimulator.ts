import { Respondent, Policy, ElectionCycle } from "./types";
import { loadPopulation } from "./dataLoader";
import { PolicyEngine } from "./PolicyEngine";
import { MAOEngine } from "./MAOEngine";
import { availablePolicies } from "../data/policies";
import { FRAMEWORK_RULES } from "./frameworkRules";
import { MetricsEngine } from './MetricsEngine';

export class DifficultySimulator {
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
      const staticSchedule = MetricsEngine.generateCycleSchedule(cycle, availablePolicies, 5);
      const maoResult = MAOEngine.calculateMAO(population, staticSchedule, cycle, MetricsEngine.getMetricScore);
      
      const scalar = FRAMEWORK_RULES[cycle].winThresholdScalar;
      const winThreshold = maoResult.maxScore * scalar;
      
      let winCount = 0;
      for (let i = 0; i < iterations; i++) {
        let currentPop = population;
        let currentPath: Policy[] = [];
        
        for (let t = 0; t < 5; t++) {
          const options = staticSchedule[t].filter(opt => !currentPath.some(p => p.id === opt.id));
          const validOptions = options.length > 0 ? options : staticSchedule[t];
          
          const randomPick = validOptions[Math.floor(Math.random() * validOptions.length)];
          currentPath.push(randomPick);
          currentPop = PolicyEngine.applyPolicy(currentPop, randomPick);
        }
        const randomWalkScore = MetricsEngine.getMetricScore(currentPop, cycle);
        
        if (randomWalkScore >= winThreshold) {
          winCount++;
        }
      }
      results[ElectionCycle[cycle]] = {
        "Random Win Probability": ((winCount / iterations) * 100).toFixed(2) + "%"
      };
    }
    console.table(results);
    return results;
  }
}