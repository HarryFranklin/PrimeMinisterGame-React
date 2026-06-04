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

      // --- BEAM SEARCH OPTIMISATION ---
      // Evaluate the immediate impact of all remaining valid options
      const evaluatedOptions = options.map(opt => {
        const nextPop = PolicyEngine.applyPolicy(currentPop, opt);
        const score = metricFunction(nextPop, cycle);
        return { opt, nextPop, score };
      });

      // Sort by best immediate score and slice the top 3.
      // This trims the DFS tree from 32,768 paths back down to 243.
      evaluatedOptions.sort((a, b) => b.score - a.score);
      const bestOptions = evaluatedOptions.slice(0, 3);

      // Recursive Case: Only test the 3 most viable paths
      for (let i = 0; i < bestOptions.length; i++) {
        currentPath.push(bestOptions[i].opt);
        search(turnIndex + 1, bestOptions[i].nextPop, currentPath);
        currentPath.pop(); 
      }
    }

    search(0, initialPopulation, []);
    return { maxScore, optimalPath: bestPath };
  }
}