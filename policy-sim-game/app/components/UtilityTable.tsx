import { useMemo } from "react";
import { Respondent, ElectionCycle } from "../utils/types";
import { WelfareMetrics } from "../utils/WelfareMetrics";

type ForecastState = 'idle' | 'policy-selected' | 'previewing';

interface UtilityTableProps {
  population: Respondent[];
  previewPopulation: Respondent[] | null;
  cycle: ElectionCycle;
  metricName: string;
  forecastState: ForecastState;
  forecastsRemaining: number;
  onRunForecast: () => void;
  detailsOpen: boolean;
}

const ALL_COLUMNS = Array.from({ length: 11 }, (_, i) => i); 
const DISPLAY_COLUMNS = [2, 3, 4, 5, 6, 7, 8, 9, 10]; 

function buildCycleContext(population: Respondent[], cycle: ElectionCycle) {
  const allLS = population.map(r => r.currentLS);
  const multipliers =
    cycle === ElectionCycle.SocietalUtility
      ? WelfareMetrics.getPopulationCurveMultipliers(allLS)
      : null;
  return { allLS, multipliers };
}

export default function UtilityTable({
  population,
  previewPopulation,
  cycle,
  metricName,
  forecastState,
  forecastsRemaining,
  onRunForecast,
  detailsOpen,
}: UtilityTableProps) {
  const currentCtx = useMemo(
    () => buildCycleContext(population, cycle),
    [population, cycle]
  );

  const baseStats = useMemo(
    () => ALL_COLUMNS.map(col =>
      WelfareMetrics.getColumnStats(col, population, cycle, currentCtx.allLS, currentCtx.multipliers)
    ),
    [population, cycle, currentCtx]
  );

  const previewCtx = useMemo(
    () => (previewPopulation ? buildCycleContext(previewPopulation, cycle) : null),
    [previewPopulation, cycle]
  );

  const previewStats = useMemo(() => {
    if (!previewPopulation || !previewCtx) return null;
    return ALL_COLUMNS.map(col =>
      WelfareMetrics.getColumnStats(col, previewPopulation, cycle, previewCtx.allLS, previewCtx.multipliers)
    );
  }, [previewPopulation, previewCtx, cycle]);

  const theoreticalAvgUtility = useMemo(() => {
    return ALL_COLUMNS.map(col => {
      return population.reduce((sum, r) => {
        const tempR = { ...r, currentLS: col };
        return sum + WelfareMetrics.getCycleUtility(tempR, cycle, population.length, currentCtx.allLS, currentCtx.multipliers);
      }, 0) / population.length;
    });
  }, [population, cycle, currentCtx]);

  const marginalGains = useMemo(() => {
    return ALL_COLUMNS.map(col => {
      if (col >= 10) return 0;
      if (cycle === ElectionCycle.Benthamite || cycle === ElectionCycle.Rawlsian) return 1;

      if (cycle === ElectionCycle.PersonalUtility) {
        return population.reduce((sum, r) => {
          const uBefore = WelfareMetrics.getUtilityForPerson(Math.max(2, col), r.personalUtilities);
          const uAfter = WelfareMetrics.getUtilityForPerson(Math.max(2, col + 1), r.personalUtilities);
          return sum + (uAfter - uBefore);
        }, 0) / population.length;
      }

      if (cycle === ElectionCycle.SocietalUtility) {
        const multsBefore = WelfareMetrics.getPopulationCurveMultipliers([Math.max(2, col)]);
        const multsAfter = WelfareMetrics.getPopulationCurveMultipliers([Math.max(2, col + 1)]);
        const multsDelta = multsAfter.map((m, i) => m - multsBefore[i]);
        
        return population.reduce((sum, r) => {
          let pDelta = 0;
          for (let i = 0; i < 6; i++) pDelta += multsDelta[i] * r.societalUtilities[i];
          return sum + (pDelta / population.length);
        }, 0);
      }
      return 0;
    });
  }, [population, cycle]);

  const marginalLosses = useMemo(() => {
    return ALL_COLUMNS.map(col => {
      if (col <= 2) return 0;
      if (cycle === ElectionCycle.Benthamite || cycle === ElectionCycle.Rawlsian) return 1;

      if (cycle === ElectionCycle.PersonalUtility) {
        return population.reduce((sum, r) => {
          const uBefore = WelfareMetrics.getUtilityForPerson(Math.max(2, col), r.personalUtilities);
          const uAfter = WelfareMetrics.getUtilityForPerson(Math.max(2, col - 1), r.personalUtilities);
          return sum + (uBefore - uAfter); 
        }, 0) / population.length;
      }

      if (cycle === ElectionCycle.SocietalUtility) {
        const multsBefore = WelfareMetrics.getPopulationCurveMultipliers([Math.max(2, col)]);
        const multsAfter = WelfareMetrics.getPopulationCurveMultipliers([Math.max(2, col - 1)]);
        const multsDelta = multsAfter.map((m, i) => m - multsBefore[i]);
        
        const yieldDelta = population.reduce((sum, r) => {
          let pDelta = 0;
          for (let i = 0; i < 6; i++) pDelta += multsDelta[i] * r.societalUtilities[i];
          return sum + (pDelta / population.length);
        }, 0);
        return -yieldDelta;
      }
      return 0;
    });
  }, [population, cycle]);

  const displayedCounts = previewStats ? previewStats.map(s => s.count) : baseStats.map(s => s.count);
  const displayedYield  = previewStats ? previewStats.map(s => s.totalYield) : baseStats.map(s => s.totalYield);

  const baseYield   = baseStats.map(s => s.totalYield).reduce((a, b) => a + b, 0);
  const totalYield  = displayedYield.reduce((a, b) => a + b, 0);
  const totalPeople = displayedCounts.reduce((a, b) => a + b, 0) || 1;

  const score       = totalYield / totalPeople;
  const baseScore   = baseYield / totalPeople;

  const strBaseScore = baseScore.toFixed(2);
  const strScore = score.toFixed(2);
  const isNeutral = strBaseScore === strScore;
  const isPositive = Number(strScore) > Number(strBaseScore);
  
  const scoreColor = isNeutral ? 'text-zinc-800' : isPositive ? 'text-blue-500' : 'text-amber-500';

  const isPreviewing = forecastState === 'previewing';

  return (
    <div className="w-full flex flex-col gap-3 h-full flex-1">
      <div className="flex-1 flex flex-col min-h-0 overflow-x-auto pb-2">
        <table className="w-full min-w-[450px] table-fixed border-collapse text-center text-xs">
          <colgroup>
            <col style={{ width: '64px' }} />
            {DISPLAY_COLUMNS.map(col => <col key={col} />)}
          </colgroup>
          <thead>
            <tr>
              <th className="bg-zinc-900 text-white text-left px-2 py-3 font-bold uppercase tracking-wider text-[10px] rounded-tl-lg relative">
                <div className="flex items-center gap-1">
                  Life Satis.
                  <div className="group relative inline-flex cursor-pointer">
                    <span className="bg-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-600 rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-black transition-colors">?</span>
                    
                    <div className="absolute hidden group-hover:block top-full left-0 mt-2 w-56 bg-zinc-800 text-white text-[11px] p-3 rounded-lg shadow-2xl z-[100] normal-case tracking-normal border border-zinc-700 pointer-events-none text-left">
                      In this simulation, a score of 2 represents the absolute baseline of survival (0 Utility). Scores cannot mathematically fall below this point.
                      <div className="absolute bottom-full left-2 -mb-px border-4 border-transparent border-b-zinc-800"></div>
                    </div>
                  </div>
                </div>
              </th>
              {DISPLAY_COLUMNS.map(col => (
                <th key={col} className="bg-zinc-900 text-white px-1 py-3 font-black text-sm">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Row 1: % People */}
            <tr className="border-b border-zinc-200">
              <td className="bg-zinc-100 text-left px-2 py-4 font-bold text-zinc-600 text-[10px] uppercase tracking-wide">
                People (%)
              </td>
              {DISPLAY_COLUMNS.map(col => {
                const before = baseStats[col].count;
                const after  = displayedCounts[col];
                const pctBefore = Math.round((before / population.length) * 100);
                const pctAfter = Math.round((after / population.length) * 100);
                const pctDelta = pctAfter - pctBefore;
                
                const isPositiveDelta = pctDelta > 0;
                const hasChanged = isPreviewing && pctDelta !== 0;
                
                const cellClasses = hasChanged 
                  ? (isPositiveDelta ? 'bg-blue-500/10 border-blue-500/20 text-blue-700' : 'bg-amber-500/10 border-amber-500/20 text-amber-700')
                  : 'bg-zinc-50 border-zinc-100 text-zinc-900';

                return (
                  <td key={col} className={`px-1 py-4 font-bold leading-none border-x transition-colors duration-300 ${cellClasses}`}>
                    {pctAfter}
                    {hasChanged && detailsOpen && (
                      <span className={`block text-[11px] font-black mt-1 ${isPositiveDelta ? 'text-blue-600' : 'text-amber-600'}`}>
                        {isPositiveDelta ? '+' : ''}{pctDelta}%
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
            
            {/* Row 2: Value of +/- 1 LS (Straddling Columns) */}
            <tr className="border-b border-zinc-200">
              <td className="bg-white text-left px-2 py-3 font-bold text-zinc-500 text-[10px] uppercase tracking-wide leading-tight z-0">
                Transition <br/> Value
              </td>
              {DISPLAY_COLUMNS.map(col => {
                const gain = marginalGains[col]; 
                const lossFromNext = marginalLosses[col + 1] || 0; 
                const isLast = col === 10;

                return (
                  <td key={col} className="bg-white px-0.5 py-3 border-x border-zinc-100 align-middle relative">
                    {!isLast && (
                      <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 flex flex-col gap-1.5 items-center justify-center z-10 w-11">
                        <div className="text-emerald-600 bg-emerald-50 px-1 rounded-md w-full py-1 flex flex-col items-center leading-none border border-emerald-200 shadow-sm">
                          <span className="text-[9px] font-black tracking-tighter">+{gain.toFixed(2)}</span>
                        </div>
                        <div className="text-rose-600 bg-rose-50 px-1 rounded-md w-full py-1 flex flex-col items-center leading-none border border-rose-200 shadow-sm">
                          <span className="text-[9px] font-black tracking-tighter">-{lossFromNext.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>

            {/* Row 3: Contribution to Total Score */}
            <tr>
              <td className="bg-zinc-100 text-left px-2 py-4 font-bold text-zinc-600 text-[10px] uppercase tracking-wide rounded-bl-lg">
                Column Score
              </td>
              {DISPLAY_COLUMNS.map(col => {
                const beforeVal = baseStats[col].totalYield / totalPeople;
                const afterVal = displayedYield[col] / totalPeople;
                
                const strBeforeVal = beforeVal.toFixed(2);
                const strAfterVal = afterVal.toFixed(2);
                const valNeutral = strBeforeVal === strAfterVal;
                const valPositive = Number(strAfterVal) > Number(strBeforeVal);

                const hasChanged = isPreviewing && !valNeutral;
                
                const cellClasses = hasChanged 
                  ? (valPositive ? 'bg-blue-500/10 border-blue-500/20 text-blue-700' : 'bg-amber-500/10 border-amber-500/20 text-amber-700')
                  : 'bg-zinc-50 border-zinc-100 text-zinc-900';

                return (
                  <td key={col} className={`px-1 py-4 font-bold leading-none border-x transition-colors duration-300 ${cellClasses}`}>
                    {afterVal > 0 ? strAfterVal : '-'}
                    {hasChanged && detailsOpen && (
                      <span className={`block text-[11px] font-black mt-1 ${valPositive ? 'text-blue-600' : 'text-amber-600'}`}>
                        {valPositive ? '+' : ''}{(afterVal - beforeVal).toFixed(2)}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Score Output Box */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 lg:p-5 flex items-center justify-between shadow-sm shrink-0 mt-auto">
        <span className="text-xs lg:text-sm font-black uppercase tracking-widest text-zinc-800">
          {metricName}
        </span>
        <div className="flex items-center gap-3">
          {forecastState === 'previewing' && !isNeutral ? (
            <span className="text-xl lg:text-2xl font-black tabular-nums text-zinc-800">
              {strBaseScore} <span className="text-zinc-400 font-bold mx-2">→</span> <span className={scoreColor}>{strScore}</span>
            </span>
          ) : (
            <span className="text-xl lg:text-2xl font-black tabular-nums text-zinc-800">
              {strScore}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}