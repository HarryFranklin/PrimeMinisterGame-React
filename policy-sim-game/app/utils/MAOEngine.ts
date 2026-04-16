import { Respondent, Policy, ElectionCycle } from "./types";
import { PolicyEngine } from "./PolicyEngine";

export class MAOEngine {
  static calculateMAO(
    initialPopulation: Respondent[],
    turnDecks: Policy[][],
    cycle: ElectionCycle,
    metricFunction: (pop: Respondent[], cycle: ElectionCycle) => number
  ): { maxScore: number; optimalPath: Policy[] } { // <-- Updated return type
    let maxScore = -Infinity;
    let bestPath: Policy[] = [];

    function search(turnIndex: number, currentPop: Respondent[], currentPath: Policy[]) {
      // Base Case: Reached the end of the 5-turn cycle
      if (turnIndex === turnDecks.length) {
        const score = metricFunction(currentPop, cycle);
        if (score > maxScore) {
          maxScore = score;
          bestPath = [...currentPath]; // <-- Save the winning path!
        }
        return;
      }

      // Recursive Case: Test all 3 policy options for the current turn
      const options = turnDecks[turnIndex];
      for (let i = 0; i < options.length; i++) {
        const nextPop = PolicyEngine.applyPolicy(currentPop, options[i]);
        
        currentPath.push(options[i]); // Add choice to path
        search(turnIndex + 1, nextPop, currentPath);
        currentPath.pop(); // Remove choice (backtrack) to test the next option
      }
    }

    // Initiate recursive depth-first search
    search(0, initialPopulation, []);
    return { maxScore, optimalPath: bestPath };
  }
}