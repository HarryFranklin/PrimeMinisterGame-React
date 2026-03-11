"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { Respondent, AxisVariable } from "./utils/types";
import { loadPopulation } from "./utils/dataLoader";
import { WelfareMetrics } from "./utils/WelfareMetrics";

/**
 * Helper to return exact mathematical bounds for the axes.
 * This prevents the "jitter" and weird auto-scaling seen in dynamic charts.
 */
const getAxisDomain = (axisType: AxisVariable): [number, number] => {
  switch (axisType) {
    case AxisVariable.LifeSatisfaction:
      return [0, 10];
    case AxisVariable.PersonalUtility:
    case AxisVariable.SocietalFairness:
      return [0, 1];
    case AxisVariable.DeltaPersonalUtility:
    case AxisVariable.DeltaSocietalFairness:
      return [-1, 1];
    default:
      return [0, 1];
  }
};

/**
 * Generates regular 25% intervals to ensure the grid is easy to read.
 */
const getTicks = (axisType: AxisVariable) => {
  switch (axisType) {
    case AxisVariable.LifeSatisfaction:
      return [0, 2.5, 5, 7.5, 10];
    case AxisVariable.PersonalUtility:
    case AxisVariable.SocietalFairness:
      return [0, 0.25, 0.5, 0.75, 1];
    case AxisVariable.DeltaPersonalUtility:
    case AxisVariable.DeltaSocietalFairness:
      return [-1, -0.5, 0, 0.5, 1];
    default:
      return undefined;
  }
};

export default function Home() {
  // --- STATE ---
  const [population, setPopulation] = useState<Respondent[]>([]);
  const [xAxisType, setXAxisType] = useState<AxisVariable>(AxisVariable.LifeSatisfaction);
  const [yAxisType, setYAxisType] = useState<AxisVariable>(AxisVariable.SocietalFairness);

  // --- INITIALISATION ---
  useEffect(() => {
    // Loads ONS-based distributions and utility curves [cite: 48, 98]
    const initialData = loadPopulation();
    setPopulation(initialData);
  }, []);

  // --- DATA PROCESSING ---
  const chartData = useMemo(() => {
    if (population.length === 0) return [];

    const allLS = population.map(p => p.currentLS);

    return population.map((r) => {
      const getValue = (axis: AxisVariable) => {
        if (axis === AxisVariable.LifeSatisfaction) return r.currentLS;
        if (axis === AxisVariable.PersonalUtility) 
          return WelfareMetrics.getUtilityForPerson(r.currentLS, r.personalUtilities);
        if (axis === AxisVariable.SocietalFairness) 
          return WelfareMetrics.evaluateDistribution(allLS, r.societalUtilities);
        return 0;
      };

      return {
        id: r.id,
        x: getValue(xAxisType),
        y: getValue(yAxisType),
      };
    });
  }, [population, xAxisType, yAxisType]);

  return (
    <div className="flex min-h-screen bg-zinc-50 font-sans text-zinc-900">
      
      {/* LEFT COLUMN: Main Visualisation */}
      <main className="flex-1 flex flex-col p-8 border-r border-zinc-200">
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-800">Policy Simulator</h1>
          <p className="text-zinc-500 text-sm mt-1">Cycle 1: Utilitarian Framework</p>
        </header>

        {/* Dropdown Selection */}
        <div className="flex gap-6 mb-8 bg-white p-4 rounded-lg border border-zinc-200 shadow-sm">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">X-Axis Variable</label>
            <select 
              className="bg-transparent font-medium focus:outline-none cursor-pointer"
              value={xAxisType} 
              onChange={(e) => setXAxisType(Number(e.target.value))}
            >
              <option value={AxisVariable.LifeSatisfaction}>Life Satisfaction</option>
              <option value={AxisVariable.PersonalUtility}>Personal Utility</option>
              <option value={AxisVariable.SocietalFairness}>Societal Fairness</option>
            </select>
          </div>
          <div className="w-px bg-zinc-200 mx-2" />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Y-Axis Variable</label>
            <select 
              className="bg-transparent font-medium focus:outline-none cursor-pointer"
              value={yAxisType} 
              onChange={(e) => setYAxisType(Number(e.target.value))}
            >
              <option value={AxisVariable.LifeSatisfaction}>Life Satisfaction</option>
              <option value={AxisVariable.PersonalUtility}>Personal Utility</option>
              <option value={AxisVariable.SocietalFairness}>Societal Fairness</option>
            </select>
          </div>
        </div>
        
        {/* The Graph */}
        <div className="flex-1 bg-white rounded-xl border border-zinc-200 p-6 shadow-inner relative">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#f0f0f0" />
              
              <XAxis 
                type="number" 
                dataKey="x" 
                domain={getAxisDomain(xAxisType)} 
                ticks={getTicks(xAxisType)}
                interval={0}
                stroke="#a1a1aa"
                tick={{ fontSize: 11, fill: '#71717a' }}
              />
              
              <YAxis 
                type="number" 
                dataKey="y" 
                domain={getAxisDomain(yAxisType)} 
                ticks={getTicks(yAxisType)}
                interval={0}
                stroke="#a1a1aa"
                tick={{ fontSize: 11, fill: '#71717a' }}
              />
              
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }} 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              
              <Scatter 
                name="Population" 
                data={chartData} 
                fill="#ec4899" // Pinkish-red for visibility
                fillOpacity={0.6}
                isAnimationActive={false}
                clipDot={false} // Prevents clipping at the 1.0 or 10.0 edges
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </main>

      {/* RIGHT COLUMN: Sidebar */}
      <aside className="w-80 p-8 flex flex-col gap-8 bg-white border-l border-zinc-100">
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">Demographics</h2>
          <div className="space-y-3">
            <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-100">
              <p className="text-xs text-zinc-500">Population Size</p>
              <p className="text-xl font-bold">{population.length}</p>
            </div>
          </div>
        </section>

        <section className="mt-auto">
          <button className="w-full py-4 bg-zinc-900 text-white font-bold rounded-xl hover:bg-black transition-all active:scale-95 shadow-lg shadow-zinc-200">
            Apply Policy
          </button>
        </section>
      </aside>
    </div>
  );
}