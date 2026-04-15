import React from "react";
import D3Chart from "../D3Chart";
import { AxisVariable, ElectionCycle, Policy } from "../../utils/types";
import { FRAMEWORK_RULES } from "../../utils/frameworkRules";

interface DashboardTabProps {
  setActiveTab: (tab: any) => void;
  currentCycle: ElectionCycle;
  dashboardChartData: any[];
  currentHistogramData: any[]; // Updated
  previewHistogramData: any[]; // Added
  ministers: any[];
  setSelectedMinister: (m: any) => void;
  selectedPolicy: Policy | null;
  currentMetricScore: number; 
  initialMetricScore: number;
  turnMetricScore: number;
  currentDeck: Policy[];
  setSelectedPolicy: React.Dispatch<React.SetStateAction<Policy | null>>;
  handleApplyPolicy: () => void;
}

export default function DashboardTab(props: DashboardTabProps) {
  const { 
    setActiveTab, currentCycle, dashboardChartData, 
    currentHistogramData, previewHistogramData, 
    ministers, setSelectedMinister, selectedPolicy, currentMetricScore, initialMetricScore,
    turnMetricScore,
    currentDeck, setSelectedPolicy, handleApplyPolicy 
  } = props;

  const rule = FRAMEWORK_RULES[currentCycle];
  const is1D = rule.plotType === '1D';

  return (
    <div className="grid grid-cols-12 gap-6 h-full min-h-0 animate-in fade-in duration-300">
      
      {/* LEFT COLUMN: Split Graphs */}
      <div className="col-span-4 flex flex-col gap-4 h-full min-h-0">
        
        {/* Top Graph: Current State (Ghost Graph) */}
        <div onClick={() => setActiveTab('graphs')} className="bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col flex-1 min-h-0 cursor-pointer hover:border-zinc-300 hover:shadow-md transition-all group">
          <div className="px-4 py-2 border-b border-zinc-100 bg-zinc-50/50 rounded-t-xl flex justify-between items-center shrink-0 group-hover:bg-zinc-100/50 transition-colors">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Current Distribution
            </h3>
            <span className="text-zinc-300 group-hover:text-pink-500 font-bold text-lg leading-none">↗</span>
          </div>
          <div className="flex-1 p-4 min-h-0">
            <D3Chart 
              plotType={rule.plotType} 
              chartData={dashboardChartData} 
              histogramData={currentHistogramData} 
              xAxisType={AxisVariable.LifeSatisfaction} 
              yAxisType={rule.yAxisType} 
              color="#d4d4d8" // Neutral grey to denote the "Ghost/Before" graph
              targetValue={is1D ? rule.metricTarget : undefined}
              currentValue={is1D ? initialMetricScore : undefined}
              initialValue={is1D ? initialMetricScore : undefined}
            />
          </div>
        </div>

        {/* Bottom Graph: Projected State */}
        <div onClick={() => setActiveTab('graphs')} className="bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col flex-1 min-h-0 cursor-pointer hover:border-zinc-300 hover:shadow-md transition-all group">
          <div className="px-4 py-2 border-b border-zinc-100 bg-zinc-50/50 rounded-t-xl flex justify-between items-center shrink-0 group-hover:bg-zinc-100/50 transition-colors">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-800">
              Projected Distribution
            </h3>
            <span className="text-zinc-300 group-hover:text-pink-500 font-bold text-lg leading-none">↗</span>
          </div>
          <div className="flex-1 p-4 min-h-0">
            <D3Chart 
              plotType={rule.plotType} 
              chartData={dashboardChartData} 
              histogramData={previewHistogramData} 
              xAxisType={AxisVariable.LifeSatisfaction} 
              yAxisType={rule.yAxisType} 
              color={rule.graphColor}
              targetValue={is1D ? rule.metricTarget : undefined}
              currentValue={is1D ? initialMetricScore : undefined}
              initialValue={is1D ? initialMetricScore : undefined}
            />
          </div>
        </div>
      </div>

      {/* MIDDLE COLUMN: Cabinet & Single Target Box */}
      <div className="col-span-4 flex flex-col gap-6 h-full min-h-0">
        
        {/* The Cabinet */}
        <div onClick={() => setActiveTab('ministers')} className="bg-white rounded-xl border border-zinc-200 shadow-sm flex-1 flex flex-col cursor-pointer hover:border-zinc-300 hover:shadow-md transition-all group min-h-0">
          <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 rounded-t-xl flex justify-between items-start shrink-0 group-hover:bg-zinc-100/50 transition-colors">
            <div>
              <h3 className="text-base font-bold uppercase tracking-widest text-zinc-800 group-hover:text-pink-600 transition-colors">The Cabinet</h3>
              <p className="text-sm text-zinc-500 mt-1">Ministerial reaction to selected policy proposal.</p>
            </div>
            <span className="text-zinc-300 group-hover:text-pink-500 font-bold text-xl leading-none mt-1">↗</span>
          </div>
          
          {/* The Cabinet UI */}
          <div className="p-3 lg:p-4 grid grid-cols-3 grid-rows-2 gap-3 lg:gap-4 flex-1 min-h-0">
            {ministers.map((minister, i) => (
              <div 
                key={i} 
                onClick={(e) => { e.stopPropagation(); setSelectedMinister(minister); }}
                className="flex flex-col items-center justify-between p-2 rounded-lg border border-zinc-100 bg-zinc-50 cursor-pointer hover:bg-zinc-200 hover:border-zinc-300 transition-all active:scale-95 relative group/minister h-full"
              >
                <h4 className="text-[12px] lg:text-[12px] font-black text-zinc-800 uppercase tracking-widest leading-none mt-1 mb-1 lg:mb-2 text-center h-6 flex items-center justify-center">
                  {minister.name}
                </h4>
                <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center ${minister.color} border-2 lg:border-4 border-white shadow-md text-xl lg:text-2xl transition-colors shrink-0`}>
                    {minister.status === 'happy' && '😊'}
                    {minister.status === 'neutral' && '😐'}
                    {minister.status === 'angry' && '😠'}
                </div>
                <div className="h-5 lg:h-6 flex items-center justify-center mt-1 lg:mt-2 shrink-0">
                  {selectedPolicy && Math.abs(minister.policyDelta) > 0.0005 ? (
                    <span className={`text-[9px] lg:text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm ${minister.policyDelta > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {minister.policyDelta > 0 ? '↑' : '↓'} {(Math.abs(minister.policyDelta) * 100).toFixed(1)}%
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Clean, Unified Target Box */}
        <div onClick={() => setActiveTab('electorate')} className="bg-zinc-900 rounded-xl shadow-lg p-6 flex flex-col items-center justify-center shrink-0 h-48 relative overflow-hidden cursor-pointer hover:bg-black transition-colors group">
          <div className="absolute top-2 right-3 opacity-0 group-hover:opacity-100 text-zinc-500 text-xl font-bold transition-opacity">↗</div>
          <div className="absolute top-0 left-0 w-full h-1" style={{backgroundColor: rule.graphColor}} />
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Current Metric Score</p>
          
          <div className="flex items-baseline gap-2">
            <p className={`text-6xl font-black tracking-tighter transition-colors duration-500 ${
              rule.targetDirection === 'minimize' 
                ? (turnMetricScore <= rule.metricTarget ? 'text-white' : 'text-red-400')
                : (turnMetricScore >= rule.metricTarget ? 'text-white' : 'text-red-400')
            }`}>
              {turnMetricScore.toFixed(2)}
            </p>
          </div>

          {selectedPolicy ? (
             <p className="text-xs text-pink-400 font-bold uppercase tracking-widest mt-3 animate-pulse">
               Predicted Outcome Hidden
             </p>
          ) : (
            <p className="text-sm text-zinc-500 mt-2 text-center px-4">
              Target: Achieve <strong className={
                rule.targetDirection === 'minimize' 
                  ? (turnMetricScore <= rule.metricTarget ? 'text-emerald-400' : 'text-zinc-300')
                  : (turnMetricScore >= rule.metricTarget ? 'text-emerald-400' : 'text-zinc-300')
              }>
                {rule.targetDirection === 'minimize' ? 'under ' : 'over '}{rule.metricTarget}
              </strong> based on <strong className="text-zinc-300">{rule.targetMetricName}</strong>.
            </p>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Legislative Agenda */}
      <div className="col-span-4 flex flex-col bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden h-full min-h-0">
        <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 shrink-0">
          <h3 className="text-base font-bold uppercase tracking-widest text-zinc-800">Legislative Agenda</h3>
          <p className="text-sm text-zinc-500 mt-1">Select one of this turn's available policies to enact.</p>
        </div>

        <div className="flex-1 flex flex-col p-4 gap-3 min-h-0 overflow-hidden">
          {currentDeck.map((policy) => {
            const isSelected = selectedPolicy?.id === policy.id;
            return (
              <button
                key={policy.id}
                onClick={() => setSelectedPolicy(prev => prev?.id === policy.id ? null : policy)}
                className={`relative flex-1 flex flex-col justify-center w-full text-left p-4 rounded-xl border transition-all duration-200 group ${
                  isSelected ? 'border-pink-500 bg-pink-50 ring-2 ring-pink-500/20 shadow-md' : 'border-zinc-200 hover:border-zinc-300 hover:shadow-sm bg-white'
                }`}
              >
                {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-pink-500 rounded-l-xl" />}
                <p className={`font-bold text-base leading-tight mb-2 ${isSelected ? 'text-pink-900' : 'text-zinc-800'}`}>
                  {policy.policyName}
                </p>
                <p className={`text-sm ${isSelected ? 'text-pink-700/80' : 'text-zinc-500'}`}>
                  {policy.description}
                </p>
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-zinc-100 bg-zinc-50 shrink-0">
          <button 
            onClick={handleApplyPolicy}
            disabled={!selectedPolicy}
            className="w-full py-4 bg-zinc-900 text-white font-bold rounded-xl hover:bg-black disabled:bg-zinc-300 disabled:cursor-not-allowed transition-all shadow-lg"
          >
            Enact Policy
          </button>
        </div>
      </div>
    </div>
  );
}