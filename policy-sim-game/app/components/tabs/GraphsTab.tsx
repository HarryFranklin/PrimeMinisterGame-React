import React from "react";
import D3Chart from "../D3Chart";
import { AxisVariable, ElectionCycle, Policy } from "../../utils/types";
import { FRAMEWORK_RULES } from "../../utils/frameworkRules";

interface GraphsTabProps {
  setActiveTab: (tab: any) => void;
  currentCycle: ElectionCycle;
  currentChartData: any[];
  previewChartData: any[];
  currentHistogramData: any[];
  previewHistogramData: any[];
  selectedPolicy: Policy | null;
  ministers: any[];
  currentMetricScore: number;
  turnMetricScore: number;
  initialMetricScore: number;
  isTutorialActive?: boolean;
  tutorialStep?: number;
  setSelectedPolicy?: any;        
  onNavigateToPolicy?: () => void;
  approvalRating: number;
}

export default function GraphsTab(props: GraphsTabProps) {
  const { 
    currentCycle, 
    currentChartData, previewChartData, 
    currentHistogramData, previewHistogramData, 
    turnMetricScore,
    selectedPolicy,
    ministers,
    isTutorialActive,
    tutorialStep,
    setSelectedPolicy, onNavigateToPolicy,
    approvalRating
  } = props;

  const getTutorialClass = (columnIndex: number) => {
    if (!isTutorialActive) return "relative z-10";
    return tutorialStep === columnIndex 
      ? "relative z-[70] ring-4 ring-pink-500/50 rounded-2xl bg-white transition-all duration-500 shadow-2xl" 
      : "relative z-10 pointer-events-none opacity-40 grayscale transition-all duration-500";
  };

  const rule = FRAMEWORK_RULES[currentCycle];

  let markerLabel = undefined;
  if (currentCycle === ElectionCycle.Benthamite) markerLabel = "Mean";
  else if (currentCycle === ElectionCycle.Rawlsian) markerLabel = "Floor";

  return (
    <div className={`h-full flex flex-col gap-6 animate-in fade-in duration-300 min-h-0`}>
      
      {/* UNIFIED HEADER BANNER */}
      <div className={`bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 shrink-0 ${getTutorialClass(0)}`}>
        
        {/* Left Side: Standardised Status Indicators */}
        <div className="flex items-stretch gap-3 h-[52px] shrink-0">
           <div className="bg-zinc-900 text-white px-4 rounded-lg flex flex-col justify-center items-center shrink-0 min-w-[100px] shadow-sm">
             <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-400 mb-0.5">Approval</span>
             <span className={`text-lg font-black leading-none ${approvalRating >= 51 ? 'text-emerald-400' : 'text-rose-400'}`}>{approvalRating.toFixed(1)}%</span>
           </div>
           
           {selectedPolicy && onNavigateToPolicy && setSelectedPolicy ? (
              <div 
                onClick={onNavigateToPolicy}
                className="flex items-center justify-between bg-pink-50 border border-pink-200 rounded-lg px-3 cursor-pointer hover:bg-pink-100 hover:border-pink-300 transition-all shadow-sm group shrink-0 min-w-[200px]"
              >
                <div className="flex flex-col justify-center pr-3 border-r border-pink-200/60 mr-3 h-full">
                  <span className="text-[9px] font-black uppercase tracking-widest text-pink-500 mb-0.5 leading-none">Draft Selected</span>
                  <span className="text-sm font-bold text-pink-900 leading-none truncate max-w-[150px]">{selectedPolicy.policyName}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setSelectedPolicy(null); }}
                  className="w-6 h-6 flex items-center justify-center rounded-full bg-pink-200/50 text-pink-500 hover:bg-pink-500 hover:text-white transition-colors shrink-0"
                >
                  <span className="text-xs font-bold leading-none">✕</span>
                </button>
              </div>
           ) : (
              <div className="flex items-center justify-center border border-dashed border-zinc-200 bg-zinc-50 rounded-lg px-4 shrink-0 min-w-[200px] h-full">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">No Policy Selected</span>
              </div>
           )}
        </div>

        {/* Right Side: Tab Specific Controls */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between flex-1 w-full gap-4">
          <div>
            <h2 className="text-xl font-bold text-zinc-800">Distribution Analysis</h2>
            <p className="text-sm text-zinc-500 hidden md:block">Detailed side-by-side comparison of policy impacts.</p>
          </div>
          
          <div className="text-right shrink-0">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Current Framework</p>
            <p className="text-lg font-black leading-none mt-1" style={{ color: rule.graphColor }}>{rule.frameworkTitle}</p>
          </div>
        </div>
      </div>

      {/* Side-by-Side Graphs */}
      <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
        
        {/* Left Column: Current State */}
        <div className={`bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col flex-1 min-h-0 ${getTutorialClass(0)}`}>
          <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50 rounded-t-xl shrink-0 flex justify-between items-center">
             <div>
               <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Current State</h3>
               <p className="text-xs text-zinc-400 font-medium mt-1">Before policy enactment</p>
             </div>
          </div>
          <div className="flex-1 p-6 min-h-0">
            <D3Chart 
              plotType={rule.plotType} 
              chartData={currentChartData} 
              histogramData={currentHistogramData} 
              xAxisType={AxisVariable.LifeSatisfaction} 
              yAxisType={rule.yAxisType} 
              color="#d4d4d8"
              ministers={ministers}
              markerValue={markerLabel ? turnMetricScore : undefined}
              markerLabel={markerLabel}
              visualStyle={'faces'}
            />
          </div>
        </div>

        {/* Right Column: Projected State */}
        <div className={`bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col flex-1 min-h-0 ${getTutorialClass(1)}`}>
          <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50 rounded-t-xl shrink-0 flex justify-between items-center">
             <div>
               <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: rule.graphColor }}>Projected State</h3>
               <p className="text-xs text-zinc-500 font-medium mt-1">Estimated impact of selected policy</p>
             </div>
          </div>
          <div className="flex-1 p-6 min-h-0 relative">
            <D3Chart 
              plotType={rule.plotType} 
              chartData={previewChartData} 
              histogramData={previewHistogramData} 
              xAxisType={AxisVariable.LifeSatisfaction} 
              yAxisType={rule.yAxisType} 
              color={rule.graphColor}
              ministers={ministers}
            />

            {/* Frosted Glass Overlay */}
            {!selectedPolicy && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-[3px] rounded-b-xl z-10 animate-in fade-in duration-300">
                <div className="bg-white px-6 py-5 rounded-2xl shadow-xl border border-zinc-200 text-center max-w-sm">
                  <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-zinc-400 text-xl">📊</span>
                  </div>
                  <h4 className="text-sm font-bold text-zinc-800 uppercase tracking-widest mb-2">Awaiting Policy</h4>
                  <p className="text-sm text-zinc-500 font-medium">
                    Return to the dashboard and select a policy from the Legislative Agenda to forecast its impact on the distribution.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}