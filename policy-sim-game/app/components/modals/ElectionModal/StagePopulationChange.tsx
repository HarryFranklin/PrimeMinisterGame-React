/**
 * Page 3 of the election sequence.
 * Shows what percentage of the population improved, stayed stable, or declined.
 */

import React, { useEffect, useMemo } from 'react';
import { ElectionCycle, Respondent } from '../../../utils/types';
import { DPMMessage } from '../SharedModalComponents';

interface StagePopulationChangeProps {
  finalPopulation: Respondent[];
  currentCycle: ElectionCycle;
  onReady: () => void;
}

interface CohortCounts {
  improved: number;
  stable: number;
  declined: number;
}

function computeCohorts(finalPopulation: Respondent[], currentCycle: ElectionCycle): CohortCounts {
  let improved = 0;
  let stable = 0;
  let declined = 0;

  finalPopulation.forEach(p => {
    const ledger = (p as any).historicalLedger?.find((l: any) => l.cycle === currentCycle);
    if (!ledger || ledger.turns.length === 0) return;

    const startLS = ledger.turns[0].ls;
    const endLS = ledger.turns[ledger.turns.length - 1].ls;
    const diff = endLS - startLS;

    if (diff > 0.5) improved++;
    else if (diff < -0.5) declined++;
    else stable++;
  });

  const total = finalPopulation.length || 1;
  return {
    improved: Math.round((improved / total) * 100),
    stable: Math.round((stable / total) * 100),
    declined: Math.round((declined / total) * 100),
  };
}

const COHORT_CONFIGS = [
  {
    key: 'improved' as const,
    label: 'Improved',
    icon: '📈',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    iconBg: 'bg-emerald-100',
    textColor: 'text-emerald-600',
    labelColor: 'text-emerald-900',
  },
  {
    key: 'stable' as const,
    label: 'Unchanged',
    icon: '➖',
    bg: 'bg-zinc-50',
    border: 'border-zinc-200',
    iconBg: 'bg-zinc-200',
    textColor: 'text-zinc-600',
    labelColor: 'text-zinc-700',
  },
  {
    key: 'declined' as const,
    label: 'Declined',
    icon: '📉',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    iconBg: 'bg-rose-100',
    textColor: 'text-rose-600',
    labelColor: 'text-rose-900',
  },
];

export default function StagePopulationChange({
  finalPopulation,
  currentCycle,
  onReady,
}: StagePopulationChangeProps) {
  const cohorts = useMemo(
    () => computeCohorts(finalPopulation, currentCycle),
    [finalPopulation, currentCycle]
  );

  // No interaction required — enable immediately
  useEffect(() => {
    onReady();
  }, [onReady]);

  return (
    <div className="flex flex-col gap-4 animate-in fade-in w-full">
      <DPMMessage title="How The Population Changed">
        "We've tracked the electorate based on how their overall life satisfaction shifted during your administration."
      </DPMMessage>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-2">
        {COHORT_CONFIGS.map(({ key, label, icon, bg, border, iconBg, textColor, labelColor }) => (
          <div
            key={key}
            className={`${bg} rounded-xl border ${border} p-6 flex flex-col items-center text-center shadow-sm`}
          >
            <div className={`w-12 h-12 ${iconBg} rounded-full flex items-center justify-center text-xl mb-4 shadow-inner`}>
              {icon}
            </div>
            <h4 className={`font-black ${labelColor} uppercase tracking-widest text-xs mb-1`}>{label}</h4>
            <p className={`text-4xl font-black ${textColor}`}>{cohorts[key]}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}