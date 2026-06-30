import { useMemo } from "react";
import { Respondent, ElectionCycle } from "../utils/types";
import { WelfareMetrics } from "../utils/WelfareMetrics";

interface UtilityTableProps {
  population: Respondent[];
  previewPopulation: Respondent[] | null;
  cycle: ElectionCycle;
}

const COLUMNS = Array.from({ length: 11 }, (_, i) => i); // LS 0 - 10

// Pre-computes the shared inputs WelfareMetrics.getCycleUtility needs once per
// population snapshot, rather than recomputing them inside every cell.
function buildCycleContext(population: Respondent[], cycle: ElectionCycle) {
  const allLS = population.map(r => r.currentLS);
  const multipliers =
    cycle === ElectionCycle.SocietalUtility
      ? WelfareMetrics.getPopulationCurveMultipliers(allLS)
      : null;
  return { allLS, multipliers };
}

export default function UtilityTable({ population, previewPopulation, cycle }: UtilityTableProps) {
  const currentCtx = useMemo(() => buildCycleContext(population, cycle), [population, cycle]);

  // Avg Utility is a property of the curve, not the live population, so it is
  // always derived from the base (non-preview) population — this keeps the row
  // stable while # People shifts under a forecasted policy.
  const baseStats = useMemo(
    () => COLUMNS.map(col => WelfareMetrics.getColumnStats(col, population, cycle, currentCtx.allLS, currentCtx.multipliers)),
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
  const displayedYield = previewStats ? previewStats.map(s => s.totalYield) : baseStats.map(s => s.totalYield);

  const totalYield = displayedYield.reduce((a, b) => a + b, 0);
  const totalPeople = displayedCounts.reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-center border-collapse text-xs lg:text-[13px]">
        <thead>
          <tr>
            <th className="sticky left-0 bg-zinc-900 text-white text-left p-2 lg:p-2.5 font-bold uppercase tracking-wider text-[10px] lg:text-[11px] rounded-tl-lg">
              LS Score
            </th>
            {COLUMNS.map(col => (
              <th key={col} className="bg-zinc-900 text-white p-2 lg:p-2.5 font-black">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-zinc-200">
            <td className="sticky left-0 bg-zinc-100 text-left p-2 lg:p-2.5 font-bold text-zinc-700">
              # People
            </td>
            {COLUMNS.map(col => {
              const before = baseStats[col].count;
              const after = displayedCounts[col];
              const delta = after - before;
              return (
                <td key={col} className="bg-zinc-50 p-2 lg:p-2.5 font-bold text-zinc-900">
                  {after}
                  {previewStats && delta !== 0 && (
                    <span className={`block text-[9px] font-black ${delta > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {delta > 0 ? "+" : ""}{delta}
                    </span>
                  )}
                </td>
              );
            })}
          </tr>
          <tr className="border-b border-zinc-200">
            <td className="sticky left-0 bg-white text-left p-2 lg:p-2.5 font-bold text-zinc-500">
              Avg Utility
            </td>
            {COLUMNS.map(col => (
              <td key={col} className="bg-white p-2 lg:p-2.5 text-zinc-600">
                {baseStats[col].avgUtility.toFixed(2)}
              </td>
            ))}
          </tr>
          <tr>
            <td className="sticky left-0 bg-zinc-100 text-left p-2 lg:p-2.5 font-bold text-zinc-700 rounded-bl-lg">
              Total Yield
            </td>
            {COLUMNS.map(col => (
              <td key={col} className="bg-zinc-50 p-2 lg:p-2.5 font-bold text-zinc-900">
                {displayedYield[col].toFixed(1)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      <div className="mt-3 flex justify-between items-center px-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
          {totalPeople} citizens
        </span>
        <span className="text-sm font-black text-zinc-900">
          Score Yield: <span className="text-pink-600">{totalYield.toFixed(1)}</span>
        </span>
      </div>
    </div>
  );
}