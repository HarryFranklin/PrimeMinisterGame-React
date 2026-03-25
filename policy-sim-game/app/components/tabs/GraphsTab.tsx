import React from "react";
import D3Chart from "../D3Chart";
import { AxisVariable, ElectionCycle } from "../../utils/types";
import { FRAMEWORK_RULES } from "../../utils/frameworkRules";

interface GraphsTabProps {
  currentCycle: ElectionCycle;
  chartData: any[];
  histogramData: any[];
}

export default function GraphsTab({ currentCycle, chartData, histogramData }: GraphsTabProps) {
  
  const rule = FRAMEWORK_RULES[currentCycle];

  return (
    <div className="flex flex-col gap-6 h-full w-full animate-in fade-in duration-300 overflow-hidden">
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6 shrink-0">
        <h2 className="text-xl font-bold text-zinc-800 mb-2">{rule.graphTitle}</h2>
        <p className="text-sm text-zinc-500 leading-relaxed max-w-4xl">{rule.description}</p>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col min-h-0 relative">
        <div className="flex-1 p-6 min-h-0">
          <D3Chart 
            plotType={rule.plotType} 
            chartData={chartData} 
            histogramData={histogramData} 
            xAxisType={AxisVariable.LifeSatisfaction} 
            yAxisType={rule.yAxisType} 
            color={rule.graphColor}
          />
        </div>
      </div>
    </div>
  );
}