import { Respondent, Policy } from "./types";

export class PolicyEngine {
  static applyPolicy(population: Respondent[], policy: Policy): Respondent[] {
    return population.map(r => {
      let newLS = r.currentLS;

      for (const rule of policy.specificRules) {
        
        // NEW: Check demographic targeting
        if (rule.targetDemographic) {
          const td = rule.targetDemographic;
          if (td.wealth && r.demographics.wealth !== td.wealth) continue;
          if (td.age && r.demographics.age !== td.age) continue;
          if (td.isStudent !== undefined && r.demographics.isStudent !== td.isStudent) continue;
          if (td.isParent !== undefined && r.demographics.isParent !== td.isParent) continue;
          if (td.isEnvironmentalist !== undefined && r.demographics.isEnvironmentalist !== td.isEnvironmentalist) continue;
          if (td.isCommuter !== undefined && r.demographics.isCommuter !== td.isCommuter) continue;
        }

        // Standard LS threshold targeting
        if (rule.minLS !== undefined && r.currentLS < rule.minLS) continue;
        if (rule.maxLS !== undefined && r.currentLS > rule.maxLS) continue;

        // Probability targeting
        if (!rule.affectEveryone) {
          const pseudoRandom = (Math.sin(r.id) + 1) / 2;
          if (pseudoRandom > rule.proportion) continue;
        }

        newLS += rule.impact;
      }

      // Clamp LS between 0 and 10
      return { ...r, currentLS: Math.max(0, Math.min(10, newLS)) };
    });
  }
}