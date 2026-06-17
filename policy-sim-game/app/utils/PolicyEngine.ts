import { Respondent, Policy } from "./types";

// Salting ensures that random people are hit per policy when it's a given % that are hit.
// Rather than the same every time.

export class PolicyEngine {
  static applyPolicy(population: Respondent[], policy: Policy): Respondent[] {
    // Generate a simple numeric salt from the policy ID string
    const policySalt = policy.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    return population.map(r => {
      let newLS = r.currentLS;

      for (const rule of policy.specificRules) {
        // 1. Standard LS threshold targeting
        if (rule.minLS !== undefined && r.currentLS < rule.minLS) continue;
        if (rule.maxLS !== undefined && r.currentLS > rule.maxLS) continue;

        // Warn in development if proportion is arbitrarily set on a universal rule
        // if (process.env.NODE_ENV === 'development' && rule.affectEveryone && rule.proportion !== 1) {
        //   console.warn(`PolicyRule for ${policy.id} specifies affectEveryone: true but has a proportion of ${rule.proportion}`);
        // }

        // 2. Probability targeting 
        if (!rule.affectEveryone) {
          // Salting the pseudo-random generation guarantees different policies hit different demographics
          const pseudoRandom = (Math.sin(r.id + policySalt) + 1) / 2;
          if (pseudoRandom > rule.proportion) continue;
        }

        newLS += rule.impact;
      }

      // 3. Clamp Life Satisfaction strictly between the bounds of 0 and 10
      return { ...r, currentLS: Math.max(0, Math.min(10, newLS)) };
    });
  }
}