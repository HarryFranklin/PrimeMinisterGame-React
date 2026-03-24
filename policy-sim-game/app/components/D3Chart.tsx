import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { AxisVariable } from '../utils/types';

interface D3ChartProps {
  plotType: '1D' | '2D';
  chartData: any[];
  histogramData?: any[]; 
  xAxisType: AxisVariable;
  yAxisType: AxisVariable;
  color?: string; 
}

const getAxisDomain = (axisType: AxisVariable): [number, number] => {
  switch (axisType) {
    case AxisVariable.LifeSatisfaction: return [0, 10];
    case AxisVariable.PersonalUtility:
    case AxisVariable.SocietalFairness: return [0, 1];
    case AxisVariable.DeltaPersonalUtility:
    case AxisVariable.DeltaSocietalFairness: return [-1, 1];
    default: return [0, 1];
  }
};

const getTicks = (axisType: AxisVariable) => {
  switch (axisType) {
    case AxisVariable.LifeSatisfaction: return [0, 2.5, 5, 7.5, 10];
    case AxisVariable.PersonalUtility:
    case AxisVariable.SocietalFairness: return [0, 0.25, 0.5, 0.75, 1];
    case AxisVariable.DeltaPersonalUtility:
    case AxisVariable.DeltaSocietalFairness: return [-1, -0.5, 0, 0.5, 1];
    default: return [];
  }
};

const getAxisLabel = (axisType: AxisVariable): string => {
  switch (axisType) {
    case AxisVariable.LifeSatisfaction: return "Life Satisfaction";
    case AxisVariable.PersonalUtility: return "Personal Utility";
    case AxisVariable.SocietalFairness: return "Societal Fairness";
    case AxisVariable.DeltaPersonalUtility: return "Change in Personal Utility";
    case AxisVariable.DeltaSocietalFairness: return "Change in Societal Fairness";
    default: return "Value";
  }
};

export default function D3Chart({ 
  plotType, chartData, histogramData, xAxisType, yAxisType, color
}: D3ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const prevPlotType = useRef<string | null>(null);
  const prevXAxis = useRef<AxisVariable | null>(null);
  const prevYAxis = useRef<AxisVariable | null>(null);

  useEffect(() => {
    if (!containerRef.current || !svgRef.current) return;

    const margin = { top: 30, right: 30, bottom: 60, left: 70 };
    const width = Math.max(0, containerRef.current.clientWidth - margin.left - margin.right);
    const height = Math.max(0, containerRef.current.clientHeight - margin.top - margin.bottom);
    const chartColor = color || "#ec4899"; 

    const svg = d3.select(svgRef.current);
    svg.attr("width", width + margin.left + margin.right).attr("height", height + margin.top + margin.bottom);

    if (prevPlotType.current !== plotType || prevXAxis.current !== xAxisType || prevYAxis.current !== yAxisType) {
      svg.selectAll("*").remove();
      const chart = svg.append("g").attr("class", "main-group").attr("transform", `translate(${margin.left},${margin.top})`);
      chart.append("g").attr("class", "grid-x");
      chart.append("g").attr("class", "grid-y");
      chart.append("g").attr("class", "axis-x"); 
      chart.append("g").attr("class", "axis-y");
      chart.append("text").attr("class", "label-x");
      chart.append("text").attr("class", "label-y").attr("transform", "rotate(-90)");
      chart.append("g").attr("class", "data-layer");
      prevPlotType.current = plotType;
      prevXAxis.current = xAxisType;
      prevYAxis.current = yAxisType;
    }

    const chart = svg.select(".main-group");
    const dataLayer = chart.select(".data-layer");
    chart.select(".axis-x").attr("transform", `translate(0,${height})`);

    const styleAxis = (sel: any) => {
      sel.select(".domain").attr("stroke", "#d4d4d8").attr("stroke-width", 3);
      sel.selectAll(".tick line").attr("stroke", "#d4d4d8").attr("stroke-width", 2);
      sel.selectAll("text").attr("fill", "#52525b").style("font-size", "12px").style("font-weight", "600");
    };

    if (plotType === '1D' && histogramData) {
      const xDomain = histogramData.map(d => d.name.toString());
      const xScale = d3.scaleBand().domain(xDomain).range([0, width]).padding(0.1);
      const yScale = d3.scaleLinear().domain([0, d3.max(histogramData, d => d.count) || 10]).nice().range([height, 0]);

      chart.select(".axis-x").transition().duration(500).call(d3.axisBottom(xScale) as any).call(styleAxis);
      chart.select(".axis-y").transition().duration(500).call(d3.axisLeft(yScale).ticks(5) as any).call(styleAxis);
      chart.select(".label-x").attr("x", width / 2).attr("y", height + 45).attr("fill", "#3f3f46").style("text-anchor", "middle").style("font-weight", "bold").text(getAxisLabel(xAxisType));

      const bars = dataLayer.selectAll<SVGRectElement, any>("rect.bar").data(histogramData, d => d.name);
      bars.join("rect").attr("class", "bar")
        .transition().duration(500)
        .attr("x", d => xScale(d.name.toString()) || 0).attr("y", d => yScale(d.count))
        .attr("width", xScale.bandwidth()).attr("height", d => height - yScale(d.count))
        .attr("fill", chartColor)
        .attr("rx", 4);

    } else if (plotType === '2D') {
      const xScale = d3.scaleLinear().domain(getAxisDomain(xAxisType)).range([0, width]);
      const yScale = d3.scaleLinear().domain(getAxisDomain(yAxisType)).range([height, 0]);

      chart.select(".axis-x").transition().duration(500).call(d3.axisBottom(xScale).tickValues(getTicks(xAxisType)) as any).call(styleAxis);
      chart.select(".axis-y").transition().duration(500).call(d3.axisLeft(yScale).tickValues(getTicks(yAxisType)) as any).call(styleAxis);

      dataLayer.selectAll("circle.dot").data(chartData, (d: any) => d.id)
        .join("circle").attr("class", "dot")
        .transition().duration(500)
        .attr("cx", d => xScale(d.x)).attr("cy", d => yScale(d.y)).attr("r", 5).style("fill", chartColor).style("opacity", 0.7);
    }
  }, [plotType, chartData, histogramData, xAxisType, yAxisType, color]);

  return <div ref={containerRef} className="w-full h-full"><svg ref={svgRef}></svg></div>;
}