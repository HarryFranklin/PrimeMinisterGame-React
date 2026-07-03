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
}

const COLUMNS = Array.from({ length: 11 }, (_, i) => i); // LS 0-10

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
}: UtilityTableProps) {
  const currentCtx = useMemo(
    () => buildCycleContext(population, cycle),
    [population, cycle]
  );

  const baseStats = useMemo(
    () => COLUMNS.map(col =>
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
    return COLUMNS.map(col =>
      WelfareMetrics.getColumnStats(col, previewPopulation, cycle, previewCtx.allLS, previewCtx.multipliers)
    );
  }, [previewPopulation, previewCtx, cycle]);

  const displayedCounts = previewStats ? previewStats.map(s => s.count) : baseStats.map(s => s.count);
  const displayedYield  = previewStats ? previewStats.map(s => s.totalYield) : baseStats.map(s => s.totalYield);

  const baseYield   = baseStats.map(s => s.totalYield).reduce((a, b) => a + b, 0);
  const totalYield  = displayedYield.reduce((a, b) => a + b, 0);
  const totalPeople = displayedCounts.reduce((a, b) => a + b, 0) || 1;

  const score       = totalYield / totalPeople;
  const baseScore   = baseYield / totalPeople;
  const scoreDelta  = score - baseScore;

  const isPreviewing = forecastState === 'previewing';

  return (
    <div className="w-full flex flex-col gap-3">
      <table className="w-full table-fixed border-collapse text-center text-[11px]">
        <colgroup>
          <col style={{ width: '72px' }} />
          {COLUMNS.map(col => <col key={col} />)}
        </colgroup>
        <thead>
          <tr>
            <th className="bg-zinc-900 text-white text-left px-2 py-1.5 font-bold uppercase tracking-wider text-[9px] rounded-tl-lg">
              Life Satisfaction
            </th>
            {COLUMNS.map(col => (
              <th key={col} className="bg-zinc-900 text-white px-1 py-1.5 font-black">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Row 1: % People */}
          <tr className="border-b border-zinc-200">
            <td className="bg-zinc-100 text-left px-2 py-1.5 font-bold text-zinc-600 text-[9px] uppercase tracking-wide">
              People (%)
            </td>
            {COLUMNS.map(col => {
              const before = baseStats[col].count;
              const after  = displayedCounts[col];
              const pctBefore = Math.round((before / population.length) * 100);
              const pctAfter = Math.round((after / population.length) * 100);
              const pctDelta = pctAfter - pctBefore;

              return (
                <td key={col} className="bg-zinc-50 px-1 py-1.5 font-bold text-zinc-900 leading-none">
                  {pctAfter}
                  {isPreviewing && pctDelta !== 0 && (
                    <span className={`block text-[9px] font-black mt-0.5 ${pctDelta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {pctDelta > 0 ? '+' : ''}{pctDelta}%
                    </span>
                  )}
                </td>
              );
            })}
          </tr>
          {/* Row 2: Avg Utility */}
          <tr className="border-b border-zinc-200">
            <td className="bg-white text-left px-2 py-1.5 font-bold text-zinc-400 text-[9px] uppercase tracking-wide">
              Avg. Utility
            </td>
            {COLUMNS.map(col => (
              <td key={col} className="bg-white px-1 py-1.5 text-zinc-500">
                {baseStats[col].count > 0 ? baseStats[col].avgUtility.toFixed(2) : '-'}
              </td>
            ))}
          </tr>
          {/* Row 3: Score */}
          <tr>
            <td className="bg-zinc-100 text-left px-2 py-1.5 font-bold text-zinc-600 text-[9px] uppercase tracking-wide rounded-bl-lg">
              Score
            </td>
            {COLUMNS.map(col => (
              <td key={col} className="bg-zinc-50 px-1 py-1.5 font-bold text-zinc-900">
                {displayedYield[col] > 0 ? displayedYield[col].toFixed(1) : '-'}
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <div className="px-3 py-2 border-b border-zinc-100 bg-zinc-50">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
            How your score is calculated
          </p>
          <p className="text-[13px] font-black text-zinc-800 leading-tight mt-0.5">
            {metricName}
          </p>
        </div>

        {forecastState === 'idle' && (
          <div className="px-3 py-3 flex items-center gap-0">
            <EquationTerm label="Total Score" value={totalYield.toFixed(1)} />
            <EquationOp>÷</EquationOp>
            <EquationTerm label="Citizens" value={String(totalPeople)} />
            <EquationOp>=</EquationOp>
            <EquationTerm label="Score" value={score.toFixed(2)} highlight />
          </div>
        )}

        {forecastState === 'previewing' && (
          <div className="px-3 py-3 flex items-center gap-0">
            <EquationTerm
              label="Total Score"
              value={totalYield.toFixed(1)}
              delta={(scoreDelta * totalPeople).toFixed(1)}
              deltaPositive={scoreDelta >= 0}
              active
            />
            <EquationOp>÷</EquationOp>
            <EquationTerm label="Citizens" value={String(totalPeople)} />
            <EquationOp>=</EquationOp>
            <EquationTerm
              label="Score"
              value={`${baseScore.toFixed(2)} → ${score.toFixed(2)}`}
              highlight
              active
            />
          </div>
        )}
      </div>
    </div>
  );
}

function EquationTerm({
  label, value, delta, deltaPositive, highlight = false, active = false,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  highlight?: boolean;
  active?: boolean;
}) {
  return (
    <div className="flex-1 flex flex-col items-center gap-0.5 py-2">
      <span className={`text-[9px] font-bold uppercase tracking-widest ${highlight ? 'text-pink-400' : 'text-zinc-400'}`}>
        {label}
      </span>
      <span className={`text-lg font-black tabular-nums leading-none transition-colors duration-300 ${
        active ? 'text-pink-600' : highlight ? 'text-zinc-900' : 'text-zinc-900'
      }`}>
        {value}
      </span>
      {delta !== undefined && (
        <span className={`text-[9px] font-black leading-none ${deltaPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
          {deltaPositive && !delta.startsWith('+') ? '+' : ''}{delta}
        </span>
      )}
    </div>
  );
}

function EquationOp({ children }: { children: string }) {
  return (
    <div className="flex items-center px-1.5 shrink-0">
      <span className="text-base font-black text-zinc-300">{children}</span>
    </div>
  );
}