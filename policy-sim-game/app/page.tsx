"use client";

import { useState, useEffect, useMemo } from "react";
import { Respondent, AxisVariable, Policy } from "./utils/types";
import { loadPopulation } from "./utils/dataLoader";
import { WelfareMetrics } from "./utils/WelfareMetrics";
import { availablePolicies } from "./data/policies";
import { PolicyEngine } from "./utils/PolicyEngine";
import D3Chart from "./components/D3Chart";

const totalTurns = 20;

export default function Home() {
  // --- STATE ---
  const [population, setPopulation] = useState<Respondent[]>([]);
  const [xAxisType, setXAxisType] = useState<AxisVariable>(AxisVariable.LifeSatisfaction);
  const [yAxisType, setYAxisType] = useState<AxisVariable>(AxisVariable.SocietalFairness);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);

  const [currentTurn, setCurrentTurn] = useState(1);
  const [politicalCapital, setPoliticalCapital] = useState(40);
  const [plotType, setPlotType] = useState<'1D' | '2D'>('1D');

  // --- INITIALISATION ---
  useEffect(() => {
    const initialData = loadPopulation();
    setPopulation(initialData);
  }, []);

  // --- DATA PROCESSING ---
  const previewPopulation = useMemo(() => {
    if (!selectedPolicy) return population;
    return PolicyEngine.applyPolicy(population, selectedPolicy);
  }, [population, selectedPolicy]);

  const chartData = useMemo(() => {
    if (previewPopulation.length === 0) return [];
    const allLS = previewPopulation.map(p => p.currentLS);
    
    return previewPopulation.map((r) => {
      const getValue = (axis: AxisVariable) => {
        if (axis === AxisVariable.LifeSatisfaction) return r.currentLS;
        if (axis === AxisVariable.PersonalUtility) 
          return WelfareMetrics.getUtilityForPerson(r.currentLS, r.personalUtilities);
        if (axis === AxisVariable.SocietalFairness) 
          return WelfareMetrics.evaluateDistribution(allLS, r.societalUtilities);
        return 0;
      };
      
      return { id: r.id, x: getValue(xAxisType), y: getValue(yAxisType) };
    });
  }, [previewPopulation, xAxisType, yAxisType]);

  // NEW: Binning logic rounded to the nearest whole number
  const histogramData = useMemo(() => {
    if (previewPopulation.length === 0) return [];

    const allLS = previewPopulation.map(p => p.currentLS);
    const isLS = xAxisType === AxisVariable.LifeSatisfaction;

    // Create 11 bins (0 through 10)
    const numBins = 11;
    const bins = Array(numBins).fill(0).map((_, i) => ({
      name: isLS ? i : (i / 10).toFixed(1), // i.e., '7' for LS, '0.7' for Utility
      count: 0
    }));

    previewPopulation.forEach((r) => {
      let val = 0;
      if (xAxisType === AxisVariable.LifeSatisfaction) val = r.currentLS;
      else if (xAxisType === AxisVariable.PersonalUtility) val = WelfareMetrics.getUtilityForPerson(r.currentLS, r.personalUtilities);
      else if (xAxisType === AxisVariable.SocietalFairness) val = WelfareMetrics.evaluateDistribution(allLS, r.societalUtilities);

      // Round to the nearest whole bin
      let binIndex = 0;
      if (isLS) {
        binIndex = Math.round(val);
      } else {
        binIndex = Math.round(val * 10);
      }

      // Clamp to ensure we don't exceed array bounds on extreme edge cases
      binIndex = Math.max(0, Math.min(binIndex, 10));
      bins[binIndex].count++;
    });

    return bins;
  }, [previewPopulation, xAxisType]);

  const handleApplyPolicy = () => {
    if (!selectedPolicy) return;
    
    if (politicalCapital < selectedPolicy.politicalCost) {
      alert("Not enough Political Capital!");
      return;
    }

    setPopulation(previewPopulation);
    setPoliticalCapital((prev) => prev - selectedPolicy.politicalCost);
    setSelectedPolicy(null);

    if (currentTurn < totalTurns) {
      setCurrentTurn((prev) => prev + 1);
    } else {
      alert("Cycle 1 Complete! Time for the Election Vote."); 
    }
  };

  return (
    <div className="flex min-h-screen bg-zinc-50 font-sans text-zinc-900">
      {/* LEFT COLUMN: Main Visualisation */}
      <main className="flex-1 flex flex-col p-8 border-r border-zinc-200">
        <header className="mb-6">
          <div className="flex justify-between items-baseline">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-800">Policy Simulator</h1>
            <div className="text-right">
              <p className="text-lg font-mono font-bold text-zinc-700">Turn {currentTurn} / {totalTurns}</p>
              <p className={`text-sm font-bold ${politicalCapital < 10 ? 'text-red-600' : 'text-pink-600'}`}>
                Capital: {politicalCapital}
              </p>
            </div>
          </div>
          <p className="text-zinc-500 text-sm mt-1">Cycle 1: Utilitarian Framework</p>
        </header>

        {/* Graph Controls */}
        <div className="flex gap-6 mb-4 bg-white p-4 rounded-lg border border-zinc-200 shadow-sm items-center">
          <div className="flex bg-zinc-100 p-1 rounded-md border border-zinc-200">
            <button 
              onClick={() => setPlotType('1D')}
              className={`px-4 py-1.5 text-xs font-bold uppercase rounded transition-colors ${plotType === '1D' ? 'bg-white shadow-sm text-pink-600' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              1D Histogram
            </button>
            <button 
              onClick={() => setPlotType('2D')}
              className={`px-4 py-1.5 text-xs font-bold uppercase rounded transition-colors ${plotType === '2D' ? 'bg-white shadow-sm text-pink-600' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              2D Scatter
            </button>
          </div>

          <div className="w-px h-8 bg-zinc-200 mx-2" />

          <div className="flex gap-6 flex-1">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                {plotType === '1D' ? 'Distribution Variable' : 'X-Axis'}
              </label>
              <select 
                className="bg-transparent font-medium focus:outline-none cursor-pointer text-sm"
                value={xAxisType} 
                onChange={(e) => setXAxisType(Number(e.target.value))}
              >
                <option value={AxisVariable.LifeSatisfaction}>Life Satisfaction</option>
                <option value={AxisVariable.PersonalUtility}>Personal Utility</option>
                <option value={AxisVariable.SocietalFairness}>Societal Fairness</option>
              </select>
            </div>
            
            {plotType === '2D' && (
              <>
                <div className="w-px h-8 bg-zinc-200 mx-2" />
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Y-Axis</label>
                  <select 
                    className="bg-transparent font-medium focus:outline-none cursor-pointer text-sm"
                    value={yAxisType} 
                    onChange={(e) => setYAxisType(Number(e.target.value))}
                  >
                    <option value={AxisVariable.LifeSatisfaction}>Life Satisfaction</option>
                    <option value={AxisVariable.PersonalUtility}>Personal Utility</option>
                    <option value={AxisVariable.SocietalFairness}>Societal Fairness</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* The Graph Rendering */}
        <div className="flex-1 bg-white rounded-xl border border-zinc-200 p-6 shadow-inner relative flex items-center justify-center">
           <D3Chart 
             plotType={plotType} 
             chartData={chartData} 
             histogramData={histogramData} // Added this prop back in
             xAxisType={xAxisType} 
             yAxisType={yAxisType} 
           />
        </div>
      </main>

      {/* RIGHT COLUMN: Sidebar */}
      <aside className="w-96 p-8 flex flex-col gap-6 bg-white border-l border-zinc-200">
        
        {/* Available Policies List */}
        <section className="flex-1 overflow-y-auto">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">Available Policies</h2>
          <div className="space-y-3 px-1 pb-4">
            {availablePolicies.map((policy) => {
              const isSelected = selectedPolicy?.id === policy.id;
              const isAffordable = politicalCapital >= policy.politicalCost;
              const isAusterity = policy.politicalCost < 0;

              return (
                <button
                  key={policy.id}
                  onClick={() => setSelectedPolicy(policy)}
                  className={`relative w-full text-left p-4 rounded-xl border transition-all duration-200 group overflow-hidden ${
                    isSelected 
                      ? 'border-pink-500 bg-pink-50 ring-2 ring-pink-500/20 shadow-md transform scale-[1.02]' 
                      : 'border-zinc-200 hover:border-zinc-300 hover:shadow-sm bg-white'
                  } ${!isAffordable && !isSelected ? 'opacity-60 grayscale-[0.5]' : ''}`}
                >
                  {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-pink-500" />}
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <p className={`font-bold text-sm leading-tight ${isSelected ? 'text-pink-900' : 'text-zinc-800'}`}>
                      {policy.policyName}
                    </p>
                    <span className={`text-xs font-bold px-2 py-1 rounded-md shrink-0 border ${
                      isAusterity 
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : isAffordable || isSelected
                          ? 'bg-zinc-100 text-zinc-600 border-zinc-200 group-hover:bg-zinc-200'
                          : 'bg-red-50 text-red-600 border-red-100'
                    }`}>
                      {isAusterity ? '+' : '-'}{Math.abs(policy.politicalCost)}
                    </span>
                  </div>
                  <p className={`text-xs line-clamp-2 ${isSelected ? 'text-pink-700/80' : 'text-zinc-500'}`}>
                    {policy.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Apply Section */}
        <section className="mt-auto pt-6 border-t border-zinc-100">
          {selectedPolicy && (
            <div className="mb-4 p-3 bg-zinc-50 rounded-lg border border-zinc-200 flex justify-between items-center">
              <span className="text-xs font-bold uppercase text-zinc-500">Capital Cost</span>
              <span className={`text-lg font-bold ${selectedPolicy.politicalCost < 0 ? 'text-green-600' : 'text-pink-600'}`}>
                {selectedPolicy.politicalCost < 0 ? '+' : '-'}{Math.abs(selectedPolicy.politicalCost)}
              </span>
            </div>
          )}
          <button 
            onClick={handleApplyPolicy}
            disabled={!selectedPolicy || (selectedPolicy && politicalCapital < selectedPolicy.politicalCost)}
            className="w-full py-4 bg-zinc-900 text-white font-bold rounded-xl hover:bg-black disabled:bg-zinc-300 disabled:cursor-not-allowed transition-all shadow-lg"
          >
            {selectedPolicy && politicalCapital < selectedPolicy.politicalCost 
              ? "Cannot Afford" 
              : "Confirm Policy"}
          </button>
        </section>

      </aside>
    </div>
  );
}