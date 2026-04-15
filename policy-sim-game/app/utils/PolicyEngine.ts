import { Respondent, Policy } from "./types";

export class PolicyEngine {
  static applyPolicy(population: Respondent[], policy: Policy): Respondent[] {
    return population.map(r => {
      let newLS = r.currentLS;

      for (const rule of policy.specificRules) {
        
        // 1. Strict Demographic Targeting
        if (rule.targetDemographic) {
          const td = rule.targetDemographic;
          if (td.wealth && r.demographics.wealth !== td.wealth) continue;
          if (td.age && r.demographics.age !== td.age) continue;
        }

        // 2. Standard LS threshold targeting
        if (rule.minLS !== undefined && r.currentLS < rule.minLS) continue;
        if (rule.maxLS !== undefined && r.currentLS > rule.maxLS) continue;

        // 3. Probability targeting (for policies that only affect a percentage of a demographic)
        if (!rule.affectEveryone) {
          // Uses deterministic pseudo-randomness based on ID so the exact same people are consistently affected
          const pseudoRandom = (Math.sin(r.id) + 1) / 2;
          if (pseudoRandom > rule.proportion) continue;
        }

        newLS += rule.impact;
      }

      // 4. Clamp Life Satisfaction strictly between the bounds of 0 and 10
      return { ...r, currentLS: Math.max(0, Math.min(10, newLS)) };
    });
  }
}