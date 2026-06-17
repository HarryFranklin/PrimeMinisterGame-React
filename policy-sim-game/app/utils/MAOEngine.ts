import { Respondent, Policy, ElectionCycle } from "./types";
import { PolicyEngine } from "./PolicyEngine";

export class MAOEngine {
  static calculateMAO(
    initialPopulation: Respondent[],
    turnDecks: Policy[][],
    cycle: ElectionCycle,
    metricFunction: (pop: Respondent[], cycle: ElectionCycle) => number
  ): { maxScore: number; optimalPath: Policy[] } {
    let maxScore = -Infinity;
    let bestPath: Policy[] = [];

    function search(turnIndex: number, currentPop: Respondent[], currentPath: Policy[]) {
      // Base Case
      if (turnIndex === turnDecks.length) {
        const score = metricFunction(currentPop, cycle);
        if (score > maxScore) {
          maxScore = score;
          bestPath = [...currentPath];
        }
        return;
      }

      // Filter out any policies that have already been selected in this specific path, 
      // AND restrict the engine to only evaluate the top 4 (matching the UI)
      const options = turnDecks[turnIndex]
        .filter(opt => !currentPath.some(p => p.id === opt.id))
        .slice(0, 4);

      // Recursive Case: Full DFS evaluating all 1,024 valid paths
      for (let i = 0; i < options.length; i++) {
        currentPath.push(options[i]);
        search(turnIndex + 1, PolicyEngine.applyPolicy(currentPop, options[i]), currentPath);
        currentPath.pop(); 
      }
    }

    search(0, initialPopulation, []);

    return { maxScore, optimalPath: bestPath };
  }
}