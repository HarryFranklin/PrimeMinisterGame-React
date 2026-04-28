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
  currentMetricScore: number;
  turnMetricScore: number;
  initialMetricScore: number;
  selectedPolicy: Policy | null;
  ministers: any[];
}

export default function GraphsTab(props: GraphsTabProps) {
  const { 
    currentCycle, 
    currentChartData, previewChartData, 
    currentHistogramData, previewHistogramData, 
    turnMetricScore,
    selectedPolicy,
    ministers
  } = props;

  const rule = FRAMEWORK_RULES[currentCycle];

  let markerLabel = undefined;
  if (currentCycle === ElectionCycle.Benthamite) markerLabel = "Mean";
  else if (currentCycle === ElectionCycle.Rawlsian) markerLabel = "Floor";

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-300 min-h-0">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-xl font-bold text-zinc-800">Distribution Analysis</h2>
          <p className="text-sm text-zinc-500">Detailed side-by-side comparison of policy impacts on the electorate.</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Current Framework</p>
          <p className="text-lg font-black" style={{ color: rule.graphColor }}>{rule.frameworkTitle}</p>
        </div>
      </div>

      {/* Side-by-Side Graphs */}
      <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
        
        {/* Left Column: Current State */}
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col flex-1 min-h-0">
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
            />
          </div>
        </div>

        {/* Right Column: Projected State */}
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col flex-1 min-h-0">
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
              // Removed marker props so players cannot min-max the projection
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