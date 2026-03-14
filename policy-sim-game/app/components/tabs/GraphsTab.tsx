import React from "react";
import D3Chart from "../D3Chart";
import { AxisVariable } from "../../utils/types";

// Extracted Panel Component for Reusability
const GraphPanel = ({ 
  title, graphNum, preset, plotType, xAxis, yAxis, chartData, histogramData, handleGraphChange, GRAPH_PRESETS 
}: any) => (
  <div className="flex-1 bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col min-w-0">
    <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center shrink-0">
      <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-800">{title}</h3>
      <select 
        value={preset} 
        onChange={(e) => handleGraphChange(graphNum, 'preset', e.target.value)} 
        className={`bg-white border rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-pink-500 cursor-pointer shadow-sm ${preset === 'Custom' ? 'border-amber-400 text-amber-700' : 'border-zinc-200 text-zinc-700'}`}
      >
        {GRAPH_PRESETS.map((p: any) => (
          <option key={p.label} value={p.label}>{p.label}</option>
        ))}
      </select>
    </div>

    <div className="flex-1 p-4 min-h-0 relative">
      <D3Chart plotType={plotType} chartData={chartData} histogramData={histogramData} xAxisType={xAxis} yAxisType={yAxis} />
    </div>

    <div className="p-3 border-t border-zinc-100 bg-zinc-50 flex gap-3 items-center shrink-0 flex-wrap justify-center">
      <select 
        value={plotType} 
        onChange={(e) => handleGraphChange(graphNum, 'plot', e.target.value)} 
        className="bg-white border border-zinc-200 rounded px-2 py-1 text-xs font-bold text-zinc-600 focus:outline-none focus:border-pink-500 cursor-pointer"
      >
        <option value="1D">1D Histogram</option>
        <option value="2D">2D Scatter</option>
      </select>
      <div className="w-px h-4 bg-zinc-300" />
      <span className="text-[10px] font-bold uppercase text-zinc-400">X-Axis:</span>
      <select 
        value={xAxis} 
        onChange={(e) => handleGraphChange(graphNum, 'x', Number(e.target.value))} 
        className="bg-white border border-zinc-200 rounded px-2 py-1 text-xs font-medium text-zinc-600 focus:outline-none focus:border-pink-500 cursor-pointer"
      >
        <option value={AxisVariable.LifeSatisfaction}>Life Satisfaction</option>
        <option value={AxisVariable.PersonalUtility}>Personal Utility</option>
        <option value={AxisVariable.SocietalFairness}>Societal Fairness</option>
      </select>
      {plotType === '2D' && (
        <>
          <div className="w-px h-4 bg-zinc-300" />
          <span className="text-[10px] font-bold uppercase text-zinc-400">Y-Axis:</span>
          <select 
            value={yAxis} 
            onChange={(e) => handleGraphChange(graphNum, 'y', Number(e.target.value))} 
            className="bg-white border border-zinc-200 rounded px-2 py-1 text-xs font-medium text-zinc-600 focus:outline-none focus:border-pink-500 cursor-pointer"
          >
            <option value={AxisVariable.LifeSatisfaction}>Life Satisfaction</option>
            <option value={AxisVariable.PersonalUtility}>Personal Utility</option>
            <option value={AxisVariable.SocietalFairness}>Societal Fairness</option>
          </select>
        </>
      )}
    </div>
  </div>
);

interface GraphsTabProps {
  g1Preset: string; g1PlotType: any; g1XAxis: any; g1YAxis: any; g1ChartData: any; g1HistogramData: any;
  g2Preset: string; g2PlotType: any; g2XAxis: any; g2YAxis: any; g2ChartData: any; g2HistogramData: any;
  handleGraphChange: (num: 1 | 2, type: "preset" | "plot" | "x" | "y", val: any) => void;
  GRAPH_PRESETS: any[];
}

export default function GraphsTab(props: GraphsTabProps) {
  return (
    <div className="flex gap-6 h-full w-full animate-in fade-in duration-300 overflow-hidden">
      <GraphPanel 
        title="Primary Visualisation" graphNum={1} preset={props.g1Preset} plotType={props.g1PlotType} 
        xAxis={props.g1XAxis} yAxis={props.g1YAxis} chartData={props.g1ChartData} histogramData={props.g1HistogramData} 
        handleGraphChange={props.handleGraphChange} GRAPH_PRESETS={props.GRAPH_PRESETS} 
      />
      <GraphPanel 
        title="Secondary Visualisation" graphNum={2} preset={props.g2Preset} plotType={props.g2PlotType} 
        xAxis={props.g2XAxis} yAxis={props.g2YAxis} chartData={props.g2ChartData} histogramData={props.g2HistogramData} 
        handleGraphChange={props.handleGraphChange} GRAPH_PRESETS={props.GRAPH_PRESETS} 
      />
    </div>
  );
}