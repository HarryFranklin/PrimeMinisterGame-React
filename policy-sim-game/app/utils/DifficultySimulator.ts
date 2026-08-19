import { Respondent, Policy, ElectionCycle } from "./types";
import { loadPopulation } from "./dataLoader";
import { PolicyEngine } from "./PolicyEngine";
import { MAOEngine } from "./MAOEngine";
import { availablePolicies } from "../data/policies";
import { MetricsEngine } from './MetricsEngine';
import { DifficultyEngine } from './DifficultyEngine';

export class DifficultySimulator {
  static runDeterministicSimulation(iterations: number = 10000, playerSeed: number = 12345) {
    console.log(`Running seed-accurate simulation (${iterations} random walks for seed ${playerSeed})...`);
    
    const population = loadPopulation();
    const cycles = [
      ElectionCycle.Benthamite, 
      ElectionCycle.Rawlsian, 
      ElectionCycle.SocietalUtility, 
      ElectionCycle.PersonalUtility
    ];
    
    // Step 1: Calculate the dynamic scalars for this specific seed (simulating the Setup phase)
    console.log("Calculating dynamic win thresholds...");
    const dynamicScalars = DifficultyEngine.calculateDynamicScalars(playerSeed, population, 500);
    console.log("Dynamic Scalars applied:", dynamicScalars);
    
    const results: Record<string, any> = {};

    // Step 2: Run the full 10,000 iterations against the new dynamic thresholds
    for (const cycle of cycles) {
      const staticSchedule = MetricsEngine.generateCycleSchedule(cycle, availablePolicies, 5, playerSeed);
      const maoResult = MAOEngine.calculateMAO(population, staticSchedule, cycle, MetricsEngine.getMetricScore);
      
      const scalar = dynamicScalars[cycle];
      const winThreshold = maoResult.maxScore * scalar;
      
      let winCount = 0;

      for (let i = 0; i < iterations; i++) {
        let currentPop = population;
        let currentPath: Policy[] = [];
        
        for (let t = 0; t < 5; t++) {
          const options = staticSchedule[t].filter(opt => !currentPath.some(p => p.id === opt.id));
          const validOptions = options.length > 0 ? options : staticSchedule[t];
          
          // Use a different pseudo-random sequence for the actual gameplay walks
          const hash = Math.sin(playerSeed + cycle + i * 1000 + t) * 10000;
          const rand = hash - Math.floor(hash);
          const randomPick = validOptions[Math.floor(rand * validOptions.length)];
          
          currentPath.push(randomPick);
          currentPop = PolicyEngine.applyPolicy(currentPop, randomPick);
        }

        const randomWalkScore = MetricsEngine.getMetricScore(currentPop, cycle);
        
        if (randomWalkScore >= winThreshold) {
          winCount++;
        }
      }

      results[ElectionCycle[cycle]] = {
        "Target Scalar": scalar.toFixed(4),
        "Random Win Probability": ((winCount / iterations) * 100).toFixed(2) + "%"
      };
    }

    console.table(results);
    return results;
  }
}