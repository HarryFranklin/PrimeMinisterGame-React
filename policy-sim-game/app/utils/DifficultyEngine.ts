import { ElectionCycle, Respondent, Policy } from "./types";
import { MetricsEngine } from "./MetricsEngine";
import { PolicyEngine } from "./PolicyEngine";
import { MAOEngine } from "./MAOEngine";
import { availablePolicies } from "../data/policies";
import { FRAMEWORK_RULES } from "./frameworkRules";

export class DifficultyEngine {
  static calculateDynamicScalars(
    playerSeed: number, 
    initialPopulation: Respondent[], 
    walks: number = 500
  ): Record<ElectionCycle, number> {
    const cycles = [
      ElectionCycle.Benthamite, 
      ElectionCycle.Rawlsian, 
      ElectionCycle.SocietalUtility, 
      ElectionCycle.PersonalUtility
    ];
    
    const scalars: Record<ElectionCycle, number> = {} as any;

    for (const cycle of cycles) {
      const schedule = MetricsEngine.generateCycleSchedule(cycle, availablePolicies, 5, playerSeed);
      const maoResult = MAOEngine.calculateMAO(initialPopulation, schedule, cycle, MetricsEngine.getMetricScore);
      
      let minScalar = 0.0;
      let maxScalar = 1.0; 
      let bestScalar = FRAMEWORK_RULES[cycle].winThresholdScalar; // Default fallback

      // Binary search over 8 iterations (plenty for 0.0 - 1.0 precision)
      for (let iter = 0; iter < 8; iter++) {
        const midScalar = (minScalar + maxScalar) / 2;
        const threshold = maoResult.maxScore * midScalar;
        let wins = 0;

        for (let w = 0; w < walks; w++) {
          let currentPop = initialPopulation;
          let currentPath: Policy[] = [];
          
          for (let t = 0; t < 5; t++) {
            const options = schedule[t].filter(opt => !currentPath.some(p => p.id === opt.id));
            const validOptions = options.length > 0 ? options : schedule[t];
            
            // Pseudo-random selection for the walk
            const hash = Math.sin(playerSeed + cycle + iter * 1000 + w * 10 + t) * 10000;
            const rand = hash - Math.floor(hash);
            const pick = validOptions[Math.floor(rand * validOptions.length)];
            
            currentPath.push(pick);
            currentPop = PolicyEngine.applyPolicy(currentPop, pick);
          }
          
          const finalScore = MetricsEngine.getMetricScore(currentPop, cycle);
          if (finalScore >= threshold) wins++;
        }

        const winRate = wins / walks;

        if (winRate > 0.26) {
          // Too easy -> raise the required scalar
          minScalar = midScalar;
        } else if (winRate < 0.19) {
          // Too hard -> lower the required scalar
          maxScalar = midScalar;
        } else {
          // Target hit (between 19% and 26%)
          bestScalar = midScalar;
          break;
        }
        bestScalar = midScalar;
      }
      scalars[cycle] = bestScalar;
    }
    return scalars;
  }
}