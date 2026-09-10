import { ElectionCycle, Respondent, Policy } from "./types";
import { MetricsEngine } from "./MetricsEngine";
import { PolicyEngine } from "./PolicyEngine";
import { MAOEngine } from "./MAOEngine";
import { availablePolicies } from "../data/policies";
import { FRAMEWORK_RULES } from "./frameworkRules";

export class DifficultyEngine {
  static calculateDynamicScalars(
    playerSeed: number,
    initialPopulation: Respondent[],
    walks: number = 500
  ): Record<ElectionCycle, number> {
    const cycles = [
      ElectionCycle.Benthamite,
      ElectionCycle.Rawlsian,
      ElectionCycle.SocietalUtility,
      ElectionCycle.PersonalUtility
    ];

    const scalars: Record<ElectionCycle, number> = {} as any;

    const TARGET_WIN_RATE_MIN = 0.18;
    const TARGET_WIN_RATE_MAX = 0.23;
    const TARGET_WIN_RATE_CENTER = (TARGET_WIN_RATE_MIN + TARGET_WIN_RATE_MAX) / 2;

    const ITERATIONS = 12;

    for (const cycle of cycles) {
      const schedule = MetricsEngine.generateCycleSchedule(cycle, availablePolicies, 5, playerSeed);
      const maoResult = MAOEngine.calculateMAO(initialPopulation, schedule, cycle, MetricsEngine.getMetricScore);

      let minScalar = 0.0;
      let maxScalar = 1.0;

      // Track the scalar whose measured win rate came closest to the
      // center of the target band, rather than stopping at the first
      // scalar that happened to land inside it. With only `walks` samples
      // per iteration, a single in-band reading can be noise - especially
      // for SocietalUtility, where the win-rate-vs-scalar curve has a
      // steep cliff (per-person SU curves saturate fast for many
      // respondents), so "first hit" was landing right on that cliff and
      // silently overshooting the true win rate. Best-of-all-iterations
      // is far more robust to that than early-exit.
      let bestScalar = FRAMEWORK_RULES[cycle].winThresholdScalar; // Default fallback
      let bestDistance = Infinity;

      for (let iter = 0; iter < ITERATIONS; iter++) {
        const midScalar = (minScalar + maxScalar) / 2;
        const threshold = maoResult.maxScore * midScalar;
        let wins = 0;

        for (let w = 0; w < walks; w++) {
          let currentPop = initialPopulation;
          let currentPath: Policy[] = [];

          for (let t = 0; t < 5; t++) {
            // Filter out policies already used in this path FIRST, THEN
            // restrict to the first 4 - this must match MAOEngine.ts and
            // the UI (PolicyDeckList) exactly, or the simulated walk is
            // sampling from a different option pool than players actually
            // see, which desyncs the calibration from real gameplay.
            const options = schedule[t]
              .filter(opt => !currentPath.some(p => p.id === opt.id))
              .slice(0, 4);
            const validOptions = options.length > 0 ? options : schedule[t];

            // Pseudo-random selection for the walk
            const hash = Math.sin(playerSeed + cycle + iter * 1000 + w * 10 + t) * 10000;
            const rand = hash - Math.floor(hash);
            const pick = validOptions[Math.floor(rand * validOptions.length)];

            currentPath.push(pick);
            currentPop = PolicyEngine.applyPolicy(currentPop, pick);
          }

          const finalScore = MetricsEngine.getMetricScore(currentPop, cycle);
          if (finalScore >= threshold) wins++;
        }

        const winRate = wins / walks;
        const distance = Math.abs(winRate - TARGET_WIN_RATE_CENTER);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestScalar = midScalar;
        }

        // Still bisect toward the target band each iteration - this keeps
        // the search converging on the right region, we just don't stop
        // the moment we touch it.
        if (winRate > TARGET_WIN_RATE_CENTER) {
          minScalar = midScalar;
        } else {
          maxScalar = midScalar;
        }
      }

      scalars[cycle] = bestScalar;
    }
    return scalars;
  }
}