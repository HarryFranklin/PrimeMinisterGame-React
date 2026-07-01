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

const COLUMNS = Array.from({ length: 11 }, (_, i) => i); // LS 0–10

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

  // Avg Utility is pinned to the base population — the curve shape doesn't
  // change when previewing, only which bucket citizens sit in does.
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

      {/* ── Distribution table ────────────────────────────────────────────────
          table-fixed + explicit label column width forces all 11 data columns
          to share the remaining width equally, preventing horizontal overflow.
      ─────────────────────────────────────────────────────────────────────── */}
      <table className="w-full table-fixed border-collapse text-center text-[11px]">
        <colgroup>
          {/* Label column: fixed. Data columns: equal share of remainder. */}
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

          {/* Row 1: # People */}
          <tr className="border-b border-zinc-200">
            <td className="bg-zinc-100 text-left px-2 py-1.5 font-bold text-zinc-600 text-[9px] uppercase tracking-wide">
              People
            </td>
            {COLUMNS.map(col => {
              const before = baseStats[col].count;
              const after  = displayedCounts[col];
              const delta  = after - before;
              return (
                <td key={col} className="bg-zinc-50 px-1 py-1.5 font-bold text-zinc-900 leading-none">
                  {after}
                  {isPreviewing && delta !== 0 && (
                    <span className={`block text-[8px] font-black mt-0.5 ${delta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {delta > 0 ? '+' : ''}{delta}
                    </span>
                  )}
                </td>
              );
            })}
          </tr>

          {/* Row 2: Avg Utility — pinned to curve shape, never changes on preview */}
          <tr className="border-b border-zinc-200">
            <td className="bg-white text-left px-2 py-1.5 font-bold text-zinc-400 text-[9px] uppercase tracking-wide">
              Avg. Utility
            </td>
            {COLUMNS.map(col => (
              <td key={col} className="bg-white px-1 py-1.5 text-zinc-500">
                {baseStats[col].count > 0 ? baseStats[col].avgUtility.toFixed(2) : '—'}
              </td>
            ))}
          </tr>

          {/* Row 3: Total Yield */}
          <tr>
            <td className="bg-zinc-100 text-left px-2 py-1.5 font-bold text-zinc-600 text-[9px] uppercase tracking-wide rounded-bl-lg">
              Yield
            </td>
            {COLUMNS.map(col => (
              <td key={col} className="bg-zinc-50 px-1 py-1.5 font-bold text-zinc-900">
                {displayedYield[col] > 0 ? displayedYield[col].toFixed(1) : '—'}
              </td>
            ))}
          </tr>

        </tbody>
      </table>

      {/* ── Score equation block ─────────────────────────────────────────────
          Mirrors the gating pattern used in cycles 1-2: the table above is
          always visible (like the Current Distribution chart), and this
          section reveals forecast results (like the Wellbeing Forecast chart).
          The locked states render inline here rather than as floating overlays.
      ─────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">

        {/* Header — always visible */}
        <div className="px-3 py-2 border-b border-zinc-100 bg-zinc-50">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
            How your score is calculated
          </p>
          <p className="text-[13px] font-black text-zinc-800 leading-tight mt-0.5">
            {metricName}
          </p>
        </div>

        {/* State A — idle: no policy selected. Show live numbers, no prompt. */}
        {forecastState === 'idle' && (
          <div className="px-3 py-3 flex items-center gap-0">
            <EquationTerm label="Total Yield" value={totalYield.toFixed(1)} />
            <EquationOp>÷</EquationOp>
            <EquationTerm label="Citizens" value={String(totalPeople)} />
            <EquationOp>=</EquationOp>
            <EquationTerm label="Score" value={score.toFixed(3)} highlight />
          </div>
        )}

        {/* State B — policy selected, not yet forecasted.
            Shows current numbers dimmed + a prompt cohesive with cycles 1-2. */}
        {forecastState === 'policy-selected' && (
          <div className="relative min-h-[140px]">
            {/* Dimmed equation beneath — provides height for the absolute overlay */}
            <div className="px-3 py-3 flex items-center gap-0 opacity-20 blur-[2px] pointer-events-none select-none">
              <EquationTerm label="Total Yield" value={totalYield.toFixed(1)} />
              <EquationOp>÷</EquationOp>
              <EquationTerm label="Citizens" value={String(totalPeople)} />
              <EquationOp>=</EquationOp>
              <EquationTerm label="Score" value={score.toFixed(3)} highlight />
            </div>
            {/* Prompt overlay — same card style as cycles 1-2 */}
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-[2px]">
              <div className="flex flex-col items-center gap-2.5 px-4 py-5 text-center">
                <div className="w-8 h-8 bg-pink-50 rounded-full flex items-center justify-center border border-pink-100">
                  <span className="text-sm">📊</span>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-700 mb-0.5">
                    Impact Unknown
                  </p>
                  <p className="text-[10px] text-zinc-400 font-medium">
                    {forecastsRemaining} forecast{forecastsRemaining !== 1 ? 's' : ''} remaining
                  </p>
                </div>
                <button
                  onClick={onRunForecast}
                  disabled={forecastsRemaining === 0}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    forecastsRemaining > 0
                      ? 'bg-pink-600 text-white hover:bg-pink-700 cursor-pointer shadow-sm'
                      : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                  }`}
                >
                  {forecastsRemaining > 0 ? 'Run Forecast' : 'No Forecasts Left'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* State C — previewing: show live forecast numbers with deltas. */}
        {forecastState === 'previewing' && (
          <div className="px-3 py-3 flex items-center gap-0">
            <EquationTerm
              label="Total Yield"
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
              value={score.toFixed(3)}
              delta={`${scoreDelta >= 0 ? '+' : ''}${scoreDelta.toFixed(3)}`}
              deltaPositive={scoreDelta >= 0}
              highlight
              active
            />
          </div>
        )}

      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

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