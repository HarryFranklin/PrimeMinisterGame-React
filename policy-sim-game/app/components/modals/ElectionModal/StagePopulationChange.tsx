import React, { useEffect, useMemo } from 'react';
import { ElectionCycle, Respondent } from '../../../utils/types';
import { DPMMessage } from '../SharedModalComponents';
import { LSChangeBadge } from '../../ui';

interface StagePopulationChangeProps {
  finalPopulation: Respondent[];
  currentCycle: ElectionCycle;
  onReady: () => void;
  onDefinitionToggle: (title: string, desc: string) => void;
}

interface CohortMember {
  id: number;
  name: string;
  startLS: number;
  endLS: number;
  diff: number;
}

interface Cohort {
  count: number;
  percentage: number | string;
  /** Full sorted membership - used for the count/percentage and as the pool DISPLAY_LIMIT is drawn from. */
  members: CohortMember[];
}

interface CohortBreakdown {
  improved: Cohort;
  stable: Cohort;
  declined: Cohort;
}

const CHANGE_THRESHOLD = 0.5;
/** Max people listed per cohort — the header % /count already reflects everyone; this just keeps the list scannable. */
const DISPLAY_LIMIT = 5;

/**
 * Buckets the population into improved/stable/declined based on how much
 * each citizen's life satisfaction moved during the cycle, and — this is
 * the point of the feature — keeps track of *who* is in each bucket, not
 * just how many. A 25/48/27 split reads very differently once you can see
 * that the 27% who declined were already comfortable, or that the 48%
 * "unchanged" includes everyone who was worst-off to begin with.
 */
function computeCohortBreakdown(finalPopulation: Respondent[], currentCycle: ElectionCycle): CohortBreakdown {
  const improved: CohortMember[] = [];
  const stable: CohortMember[] = [];
  const declined: CohortMember[] = [];

  finalPopulation.forEach((p) => {
    const ledger = p.historicalLedger.find((l) => l.cycle === currentCycle);
    if (!ledger || ledger.turns.length === 0) return;

    const startLS = ledger.turns[0].ls;
    const endLS = ledger.turns[ledger.turns.length - 1].ls;
    const diff = endLS - startLS;
    const member: CohortMember = { id: p.id, name: p.name, startLS, endLS, diff };

    if (diff > CHANGE_THRESHOLD) improved.push(member);
    else if (diff < -CHANGE_THRESHOLD) declined.push(member);
    else stable.push(member);
  });

  // Most dramatic movers first for improved/declined; for "stable", the
  // truest-to-zero changes first, so the top of that list is genuinely
  // unaffected people rather than just-under-the-threshold near-misses.
  improved.sort((a, b) => b.diff - a.diff);
  declined.sort((a, b) => a.diff - b.diff);
  stable.sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff));

  const total = finalPopulation.length || 1;
    
    const toCohort = (members: CohortMember[]): Cohort => {
      const rawPct = (members.length / total) * 100;
      const rounded = Math.round(rawPct);
      
      return {
        count: members.length,
        // If there are members but the percentage rounds down to 0, display '<1' instead
        percentage: members.length > 0 && rounded === 0 ? '<1' : rounded,
        members,
      };
    };

    return { improved: toCohort(improved), stable: toCohort(stable), declined: toCohort(declined) };
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
    label: 'Unchanged *',
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
  onDefinitionToggle,
}: StagePopulationChangeProps) {
  const cohorts = useMemo(
    () => computeCohortBreakdown(finalPopulation, currentCycle),
    [finalPopulation, currentCycle]
  );

  useEffect(() => {
    onReady();
  }, [onReady]);

  const thresholdNote =
    `A citizen counts as "Improved" if their life satisfaction rose by more than ${CHANGE_THRESHOLD} points during your term, and "Declined" if it fell by more than ${CHANGE_THRESHOLD} points.\n\n` +
    `Smaller movements (i.e. +0.2, -0.3) are grouped as "Unchanged".\n\n` +
    `That threshold exists so the three categories reflect meaningful shifts rather than noise, but it does mean "Unchanged" isn't always literally zero movement.`;

  return (
    <div className="flex flex-col gap-4 animate-in fade-in w-full h-full min-h-0">
      <DPMMessage title="How The Population Changed">
        {`We've tracked the electorate based on how their overall life satisfaction shifted during your administration.`}
      </DPMMessage>

      <button
        onClick={() => onDefinitionToggle('Change Thresholds', thresholdNote)}
        className="self-start flex items-center gap-1.5 bg-pink-50 hover:bg-pink-100 border border-pink-200 rounded-full pl-1.5 pr-3 py-1 transition-colors cursor-pointer shrink-0"
      >
        <span className="w-4 h-4 rounded-full bg-pink-500 text-white text-[10px] font-black flex items-center justify-center shrink-0">
          *
        </span>
        <span className="text-[11px] font-bold text-pink-700">Note: what counts as a change?</span>
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full flex-1 min-h-0">
        {COHORT_CONFIGS.map(({ key, label, icon, bg, border, iconBg, textColor, labelColor }) => {
          const cohort = cohorts[key];
          const displayMembers = cohort.members.slice(0, DISPLAY_LIMIT);

          return (
            <div
              key={key}
              className={`${bg} rounded-xl border ${border} p-3 flex flex-col shadow-sm min-h-0`}
            >
              <div className="flex items-center gap-3 shrink-0 mb-3">
                <div className={`w-10 h-10 ${iconBg} rounded-full flex items-center justify-center text-lg shadow-inner shrink-0`}>
                  {icon}
                </div>
                <div className="min-w-0">
                  <h4 className={`font-black ${labelColor} uppercase tracking-widest text-[10px] mb-0.5`}>{label}</h4>
                  <p className={`text-2xl font-black leading-none ${textColor}`}>
                    {cohort.percentage}%{' '}
                  </p>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5 pr-1">
                {displayMembers.length === 0 ? (
                  <p className="text-[11px] text-zinc-400 italic text-center py-4">No one in this group.</p>
                ) : (
                  displayMembers.map((member) => (
                    <div
                      key={member.id}
                      className="bg-white/80 border border-zinc-200/80 rounded-lg px-2 py-1.5 flex items-center justify-between gap-2 shadow-sm"
                    >
                      <span className="text-[12px] font-bold text-zinc-800 truncate">{member.name}</span>
                      <LSChangeBadge startLS={member.startLS} endLS={member.endLS} size="sm" />
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
