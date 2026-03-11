import { Respondent, Policy } from "./types";

export class PolicyEngine {
  static applyPolicy(population: Respondent[], policy: Policy): Respondent[] {
    return population.map((r) => {
      let newLS = r.currentLS;

      policy.specificRules.forEach((rule) => {
        if (r.currentLS >= rule.minLS && r.currentLS <= rule.maxLS) {
          // Use the respondent ID as a seed for deterministic probability
          const pseudoRandom = (Math.sin(r.id) + 1) / 2;
          
          if (rule.affectEveryone || pseudoRandom <= rule.proportion) {
            newLS += rule.impact;
          }
        }
      });

      // Clamp LS between 0 and 10
      newLS = Math.max(0, Math.min(10, newLS));

      return { ...r, currentLS: newLS };
    });
  }
}