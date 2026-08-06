import React, { useEffect, useMemo } from 'react';
import { ElectionCycle, Respondent } from '../../../utils/types';
import { DPMMessage } from '../SharedModalComponents';
import { track } from '../../../client/telemetry';
import { useDwellTimer } from '../../../client/hooks';

interface StagePopulationChangeProps {
  finalPopulation: Respondent[];
  currentCycle: ElectionCycle;
  onReady: () => void;
  onDefinitionToggle: (title: string, desc: string) => void;
}

interface CohortGroup {
  label: string;        
  avgStartLS: number;   
  avgEndLS: number;     
  count: number;
  pctString: string; 
}

interface Cohort {
  totalCount: number;
  percentage: string;
  groups: CohortGroup[]; 
}

interface CohortBreakdown {
  improved: Cohort;
  stable: Cohort;
  declined: Cohort;
}

const CHANGE_THRESHOLD = 0.5;
const DISPLAY_LIMIT = 4;

function getLifeSituationLabel(ls: number): string {
  if (ls <= 3) return "Struggling";
  if (ls <= 5) return "Just Getting By";
  if (ls <= 8) return "Comfortable";
  return "Wealthy";
}

function computeCohortBreakdown(finalPopulation: Respondent[], currentCycle: ElectionCycle): CohortBreakdown {
  const improvedMap = new Map<string, { sumStart: number; sumEnd: number; count: number }>();
  const stableMap = new Map<string, { sumStart: number; sumEnd: number; count: number }>();
  const declinedMap = new Map<string, { sumStart: number; sumEnd: number; count: number }>();

  let improvedTotal = 0;
  let stableTotal = 0;
  let declinedTotal = 0;

  finalPopulation.forEach((p) => {
    const ledger = p.historicalLedger.find((l) => l.cycle === currentCycle);
    if (!ledger || ledger.turns.length === 0) return;

    const startLS = ledger.turns[0].ls;
    const endLS = ledger.turns[ledger.turns.length - 1].ls;
    const diff = endLS - startLS;
    
    const label = getLifeSituationLabel(startLS);

    let targetMap;
    if (diff > CHANGE_THRESHOLD) {
      targetMap = improvedMap;
      improvedTotal++;
    } else if (diff < -CHANGE_THRESHOLD) {
      targetMap = declinedMap;
      declinedTotal++;
    } else {
      targetMap = stableMap;
      stableTotal++;
    }

    if (!targetMap.has(label)) {
      targetMap.set(label, { sumStart: 0, sumEnd: 0, count: 0 });
    }
    const bucket = targetMap.get(label)!;
    bucket.sumStart += startLS;
    bucket.sumEnd += endLS;
    bucket.count++;
  });

  const totalPop = finalPopulation.length || 1;

  const mapToCohort = (map: Map<string, { sumStart: number; sumEnd: number; count: number }>, totalCount: number): Cohort => {
    const rawPct = (totalCount / totalPop) * 100;
    const roundedPct = Math.round(rawPct);

    let headerPctString = `~${roundedPct}%`;
    if (totalCount > 0 && roundedPct === 0) {
      headerPctString = '<1%';
    } else if (totalCount === 0) {
      headerPctString = '0%';
    }

    const groups: CohortGroup[] = Array.from(map.entries())
      .map(([label, data]) => {
        const groupPctRaw = (data.count / totalPop) * 100;
        const groupPctRounded = Math.round(groupPctRaw);
        
        let pctString = `~${groupPctRounded}%`;
        if (data.count > 0 && groupPctRounded === 0) {
          pctString = '<1%';
        }

        return {
          label,
          avgStartLS: data.sumStart / data.count,
          avgEndLS: data.sumEnd / data.count,
          count: data.count,
          pctString,
        };
      })
      .sort((a, b) => b.count - a.count);

    return {
      totalCount,
      percentage: headerPctString,
      groups,
    };
  };

  return {
    improved: mapToCohort(improvedMap, improvedTotal),
    stable: mapToCohort(stableMap, stableTotal),
    declined: mapToCohort(declinedMap, declinedTotal),
  };
}

const DemographicRow = ({ group, theme }: { group: CohortGroup, theme: 'emerald' | 'rose' | 'zinc' }) => {
  const diff = group.avgEndLS - group.avgStartLS;
  
  const themes = {
    emerald: { text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    rose: { text: 'text-rose-600', badge: 'bg-rose-100 text-rose-800 border-rose-200' },
    zinc: { text: 'text-zinc-600', badge: 'bg-zinc-100 text-zinc-700 border-zinc-200' }
  };
  const colors = themes[theme];

  return (
    <div className="bg-white border border-zinc-200/80 rounded-xl px-2 py-1.5 shadow-sm flex items-center justify-between gap-1 shrink-0">
      
      {/* Left side: Percentage Badge + Label */}
      <div className="flex items-center gap-2 min-w-0">
        <span className={`px-1.5 py-0.5 rounded-md border flex items-center justify-center text-[12px] font-black shadow-sm shrink-0 whitespace-nowrap min-w-[36px] ${colors.badge}`}>
          {group.pctString}
        </span>
        <span className="text-[11px] font-black uppercase tracking-widest text-zinc-700 truncate">
          {group.label}
        </span>
      </div>
      
      {/* Right side: Delta Only */}
      <div className="flex items-center shrink-0 pl-1">
        <span className={`text-[11px] font-black ${colors.text} text-right`}>
          {diff > 0 ? '+' : ''}{diff.toFixed(1)} LS
        </span>
      </div>

    </div>
  );
};

const COHORT_CONFIGS = [
  {
    key: 'improved' as const,
    label: 'Improved',
    icon: '📈',
    bg: 'bg-emerald-100',
    border: 'border-emerald-200',
    iconBg: 'bg-emerald-100',
    textColor: 'text-emerald-600',
    labelColor: 'text-emerald-900',
    theme: 'emerald' as const,
  },
  {
    key: 'stable' as const,
    label: 'Unchanged',
    icon: '➖',
    bg: 'bg-zinc-100',
    border: 'border-zinc-200',
    iconBg: 'bg-zinc-200',
    textColor: 'text-zinc-600',
    labelColor: 'text-zinc-700',
    theme: 'zinc' as const,
  },
  {
    key: 'declined' as const,
    label: 'Declined',
    icon: '📉',
    bg: 'bg-rose-100',
    border: 'border-rose-200',
    iconBg: 'bg-rose-100',
    textColor: 'text-rose-600',
    labelColor: 'text-rose-900',
    theme: 'rose' as const,
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

  const dwell = useDwellTimer();

  useEffect(() => {
    track('wellbeing_changes_opened', { cycle: ElectionCycle[currentCycle] });
    dwell.start();
  }, []);

  useEffect(() => {
    track('wellbeing_changes_closed', { cycle: ElectionCycle[currentCycle], dwell_ms: dwell.stop() });
    onReady();
  }, [onReady]);

  const thresholdNote =
    `WHAT COUNTS AS A CHANGE?\n` +
    `A citizen is "Improved" if their life satisfaction rose by more than ${CHANGE_THRESHOLD} points, and "Declined" if it fell by more than ${CHANGE_THRESHOLD} points.\n\n` +
    `Smaller movements are grouped as "Unchanged".\n\n` +
    `STARTING LIFE SITUATIONS:\n` +
    `• Struggling: 0 to 3 LS\n` +
    `• Just Getting By: 3 to 5 LS\n` +
    `• Comfortable: 5 to 8 LS\n` +
    `• Wealthy: 8 to 10 LS`;

  return (
    <div className="flex flex-col gap-4 animate-in fade-in w-full h-full min-h-0">
      
      <DPMMessage title="How The Population Changed">
        <span className="leading-relaxed">
          We've clustered the electorate into demographics based on their starting life satisfaction to see exactly who won and who lost during your term.
          <button
            onClick={() => {
              track('wellbeing_note_clicked', { cycle: ElectionCycle[currentCycle] });
              onDefinitionToggle('Categories & Thresholds', thresholdNote);
            }}
            className="inline-flex items-center gap-1 bg-pink-50 hover:bg-pink-100 border border-pink-200 rounded-full px-2 py-0.5 ml-1.5 transition-colors cursor-pointer align-text-bottom relative -top-0.5 shrink-0 not-italic"
          >
            <span className="w-3 h-3 rounded-full bg-pink-500 text-white text-[8px] font-black flex items-center justify-center shrink-0 not-italic">
              i
            </span>
            <span className="text-[9px] font-bold text-pink-700 whitespace-nowrap uppercase tracking-wider not-italic">Definitions</span>
          </button>
        </span>
      </DPMMessage>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full flex-1 min-h-0">
        {COHORT_CONFIGS.map(({ key, label, icon, bg, border, iconBg, textColor, labelColor, theme }) => {
          const cohort = cohorts[key];
          const displayGroups = cohort.groups.slice(0, DISPLAY_LIMIT);

          return (
            <div
              key={key}
              className={`${bg} rounded-xl border ${border} p-2.5 flex flex-col shadow-sm min-h-0`}
            >
              {/* Condensed Header */}
              <div className="flex items-center gap-2.5 shrink-0 mb-2.5 pl-0.5">
                <div className={`w-8 h-8 ${iconBg} rounded-full flex items-center justify-center text-base shadow-inner shrink-0`}>
                  {icon}
                </div>
                <div className="flex items-baseline gap-1.5 min-w-0">
                  <span className={`text-2xl font-black leading-none ${textColor}`}>
                    {cohort.percentage}
                  </span>
                  <h4 className={`font-black ${labelColor} uppercase tracking-widest text-[11px]`}>
                    {label}
                  </h4>
                </div>
              </div>

              {/* Rows Container */}
              <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5 pr-1 pb-1">
                {displayGroups.length === 0 ? (
                  <p className="text-[11px] text-zinc-400 italic text-center py-3">No significant demographics in this category.</p>
                ) : (
                  displayGroups.map((group) => (
                    <DemographicRow key={group.label} group={group} theme={theme} />
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