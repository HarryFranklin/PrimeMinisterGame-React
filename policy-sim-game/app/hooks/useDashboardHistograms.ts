import { useMemo } from 'react';
import { Respondent, ElectionCycle, Policy, TurnHistory, PolicyRule } from '../utils/types';
import { IMPACT_COLORS } from '../utils/uiHelpers';

// NOTE: bucketing (clamp+round LS into a 0-10 bin) is intentionally left
// inline here, matching the existing pattern elsewhere in the codebase
// (WelfareMetrics.getColumnStats, useGameEngine.generateHistogramData).
// Consolidating it into one shared helper is a separate, deferred cleanup.
const bucket = (ls: number): number => Math.min(10, Math.max(0, Math.round(ls)));

export interface HistogramSegment {
  label: string;
  value: number;
  color: string;
}

export interface HistogramBin {
  name: number;
  count: number;
  segments?: HistogramSegment[];
}

interface UseDashboardHistogramsArgs {
  population: Respondent[];
  previewPopulation: Respondent[];
  currentCycle: ElectionCycle;
  currentHistogramData: { name: number; count: number }[];
  isParliamentDissolved: boolean;
  hoveredHistoryTurn: number | null;
  selectedPolicy: Policy | null;
  history: TurnHistory[];
  availablePolicies: Policy[];
  detailsOpen: boolean;
}

const buildMovementSegments = (before: number[], after: number[]): HistogramSegment[] => {
  const segments: HistogramSegment[] = [];
  const improveCount = after.filter((v, i) => v - before[i] > 0.05).length;
  const worsenCount = after.filter((v, i) => v - before[i] < -0.05).length;
  const stableCount = after.length - improveCount - worsenCount;

  if (improveCount > 0) segments.push({ label: 'Improved', value: improveCount, color: IMPACT_COLORS['Will improve'] });
  if (stableCount > 0) segments.push({ label: 'Stable', value: stableCount, color: IMPACT_COLORS['Will be stable'] });
  if (worsenCount > 0) segments.push({ label: 'Worsened', value: worsenCount, color: IMPACT_COLORS['Will worsen'] });
  return segments;
};

/**
 * Derives everything the dashboard's two histogram panels and the "Enacted
 * Legislation" list need from raw game state. This used to live inline
 * inside DashboardTab as four separate useMemo blocks; pulling it out here
 * makes each derivation independently readable/testable and shrinks the
 * component that was mixing this with rendering.
 */
export function useDashboardHistograms({
  population,
  previewPopulation,
  currentCycle,
  currentHistogramData,
  isParliamentDissolved,
  hoveredHistoryTurn,
  selectedPolicy,
  history,
  availablePolicies,
  detailsOpen,
}: UseDashboardHistogramsArgs) {
  const topHistogramData = useMemo((): HistogramBin[] => {
    if (isParliamentDissolved && hoveredHistoryTurn !== null) {
      return Array.from({ length: 11 }, (_, i) => {
        const count = population.filter((r) => {
          const ledger = r.historicalLedger.find((l) => l.cycle === currentCycle);
          if (!ledger) return false;
          const turnData = ledger.turns.find((t) => t.turn === hoveredHistoryTurn - 1);
          return turnData && bucket(turnData.ls) === i;
        }).length;
        return { name: i, count };
      });
    }
    return currentHistogramData.map((d) => ({ name: d.name, count: d.count }));
  }, [population, hoveredHistoryTurn, isParliamentDissolved, currentCycle, currentHistogramData]);

  const bottomHistogramData = useMemo((): HistogramBin[] => {
    if (isParliamentDissolved) {
      if (hoveredHistoryTurn === null) return [];

      return Array.from({ length: 11 }, (_, i) => {
        const residentsInBinBefore = population.filter((r) => {
          const ledger = r.historicalLedger.find((l) => l.cycle === currentCycle);
          if (!ledger) return false;
          const turnData = ledger.turns.find((t) => t.turn === hoveredHistoryTurn - 1);
          return turnData && bucket(turnData.ls) === i;
        });

        const before: number[] = [];
        const after: number[] = [];
        residentsInBinBefore.forEach((r) => {
          const ledger = r.historicalLedger.find((l) => l.cycle === currentCycle)!;
          before.push(ledger.turns.find((t) => t.turn === hoveredHistoryTurn - 1)!.ls);
          after.push(ledger.turns.find((t) => t.turn === hoveredHistoryTurn)!.ls);
        });

        return { name: i, count: residentsInBinBefore.length, segments: buildMovementSegments(before, after) };
      });
    }

    if (!selectedPolicy) return [];
    return Array.from({ length: 11 }, (_, i) => {
      const residentsProjectedToThisBin = previewPopulation.filter((r) => bucket(r.currentLS) === i);
      const before: number[] = [];
      const after: number[] = [];
      residentsProjectedToThisBin.forEach((r) => {
        const idx = previewPopulation.indexOf(r);
        before.push(population[idx].currentLS);
        after.push(r.currentLS);
      });

      return {
        name: i,
        count: residentsProjectedToThisBin.length,
        segments: buildMovementSegments(before, after),
      };
    });
  }, [population, hoveredHistoryTurn, isParliamentDissolved, currentCycle, selectedPolicy, previewPopulation]);

  const enactedLegislation = useMemo(() => {
    return history
      .filter((h) => h.turn > 1)
      .map((h) => {
        const pDetails = availablePolicies.find((pol) => pol.id === h.enactedPolicyId);
        return { ...h, description: pDetails?.description };
      });
  }, [history, availablePolicies]);

  const highlightedBins = useMemo((): number[] | null => {
    if (!selectedPolicy || !detailsOpen || isParliamentDissolved) return null;
    const bins = new Set<number>();
    selectedPolicy.specificRules.forEach((r: PolicyRule) => {
      const min = r.minLS !== undefined ? Math.round(r.minLS) : 0;
      const max = r.maxLS !== undefined ? Math.round(r.maxLS) : 10;
      for (let i = min; i <= max; i++) {
        if (i >= 0 && i <= 10) bins.add(i);
      }
    });
    return Array.from(bins);
  }, [selectedPolicy, detailsOpen, isParliamentDissolved]);

  return { topHistogramData, bottomHistogramData, enactedLegislation, highlightedBins };
}
