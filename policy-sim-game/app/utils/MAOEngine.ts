import { Respondent, Policy, ElectionCycle } from "./types";
import { PolicyEngine } from "./PolicyEngine";

export class MAOEngine {
  static calculateMAO(
    initialPopulation: Respondent[],
    turnDecks: Policy[][],
    cycle: ElectionCycle,
    metricFunction: (pop: Respondent[], cycle: ElectionCycle) => number
  ): number {
    let maxScore = -Infinity;

    function search(turnIndex: number, currentPop: Respondent[]) {
      // Base Case: Reached the end of the 5-turn cycle
      if (turnIndex === turnDecks.length) {
        const score = metricFunction(currentPop, cycle);
        if (score > maxScore) maxScore = score;
        return;
      }

      // Recursive Case: Test all 3 policy options for the current turn
      const options = turnDecks[turnIndex];
      for (let i = 0; i < options.length; i++) {
        const nextPop = PolicyEngine.applyPolicy(currentPop, options[i]);
        search(turnIndex + 1, nextPop);
      }
    }

    // Initiate recursive depth-first search
    search(0, initialPopulation);
    return maxScore;
  }
}