import { Respondent, Policy } from "./types";

export class PolicyEngine {
  static applyPolicy(population: Respondent[], policy: Policy): Respondent[] {
    return population.map(r => {
      let newLS = r.currentLS;

      for (const rule of policy.specificRules) {
        // 1. Standard LS threshold targeting
        if (rule.minLS !== undefined && r.currentLS < rule.minLS) continue;
        if (rule.maxLS !== undefined && r.currentLS > rule.maxLS) continue;

        // 2. Probability targeting (for policies that only affect a percentage of the population)
        if (!rule.affectEveryone) {
          // Uses deterministic pseudo-randomness based on ID so the exact same people are consistently affected
          const pseudoRandom = (Math.sin(r.id) + 1) / 2;
          if (pseudoRandom > rule.proportion) continue;
        }

        newLS += rule.impact;
      }

      // 3. Clamp Life Satisfaction strictly between the bounds of 0 and 10
      return { ...r, currentLS: Math.max(0, Math.min(10, newLS)) };
    });
  }
}