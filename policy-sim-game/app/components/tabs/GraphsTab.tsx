import React from "react";
import D3Chart from "../D3Chart";
import { AxisVariable, ElectionCycle } from "../../utils/types";

interface GraphsTabProps {
  currentCycle: ElectionCycle;
  chartData: any[];
  histogramData: any[];
}

export default function GraphsTab({ currentCycle, chartData, histogramData }: GraphsTabProps) {
  
  let title = "";
  let description = "";
  let plotType: '1D' | '2D' = '1D';
  let yAxis = AxisVariable.PersonalUtility;
  let graphColor = "#ec4899";

  if (currentCycle === ElectionCycle.Benthamite) {
    title = "Average Life Satisfaction";
    description = "The Benthamite framework focuses on the national mean.";
  } else if (currentCycle === ElectionCycle.Rawlsian) {
    title = "Least Well-Off Satisfaction";
    description = "The Rawlsian framework evaluates success based purely on the Life Satisfaction of the poorest demographics.";
    graphColor = "#ef4444"; 
  } else if (currentCycle === ElectionCycle.SocietalUtility) {
    title = "Societal Fairness vs Life Satisfaction";
    description = "This scatter plot maps actual Life Satisfaction against perceived Societal Fairness. It visualises how each citizen evaluates the current distribution of wellbeing across the nation.";
    plotType = '2D';
    yAxis = AxisVariable.SocietalFairness;
    graphColor = "#8b5cf6";
  } else if (currentCycle === ElectionCycle.PersonalUtility) {
    title = "Personal Utility vs Life Satisfaction";
    description = "This scatter plot maps Life Satisfaction against Personal Utility, demonstrating how individuals translate their general wellbeing into their own personal, subjective satisfaction.";
    plotType = '2D';
    yAxis = AxisVariable.PersonalUtility;
    graphColor = "#3b82f6";
  }

  return (
    <div className="flex flex-col gap-6 h-full w-full animate-in fade-in duration-300 overflow-hidden">
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6 shrink-0">
        <h2 className="text-xl font-bold text-zinc-800 mb-2">{title}</h2>
        <p className="text-sm text-zinc-500 leading-relaxed max-w-4xl">{description}</p>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col min-h-0 relative">
        <div className="flex-1 p-6 min-h-0">
          <D3Chart 
            plotType={plotType} 
            chartData={chartData} 
            histogramData={histogramData} 
            xAxisType={AxisVariable.LifeSatisfaction} 
            yAxisType={yAxis} 
            color={graphColor}
          />
        </div>
      </div>
    </div>
  );
}