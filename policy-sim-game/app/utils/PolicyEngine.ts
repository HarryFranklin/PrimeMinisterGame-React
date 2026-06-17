import { Respondent, Policy } from "./types";

export class PolicyEngine {
  static applyPolicy(population: Respondent[], policy: Policy): Respondent[] {
    // Generate a simple numeric salt from the policy ID string
    const policySalt = policy.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    return population.map(r => {
      let newLS = r.currentLS;

      for (let i = 0; i < policy.specificRules.length; i++) {
        const rule = policy.specificRules[i];
        
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

        // 3. Deterministic Variance (Smoothing)
        // Combine the citizen ID, policy salt, and rule index to create a distinct, repeatable seed
        const noiseSeed = r.id + policySalt + (i * 137);
        const pseudoRandomNoise = (Math.sin(noiseSeed) + 1) / 2; 
        
        // Creates a multiplier between 0.9 and 1.1 (±10%)
        const varianceModifier = 1 + (pseudoRandomNoise - 0.5) * 0.2;
        
        newLS += (rule.impact * varianceModifier);
      }

      // 4. Clamp Life Satisfaction strictly between the bounds of 0 and 10
      return { ...r, currentLS: Math.max(0, Math.min(10, newLS)) };
    });
  }
}