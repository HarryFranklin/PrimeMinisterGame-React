import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { AxisVariable } from '../utils/types';

interface D3ChartProps {
  plotType: '1D' | '2D';
  chartData: any[];
  histogramData?: any[]; 
  xAxisType: AxisVariable;
  yAxisType: AxisVariable;
}

// --- HELPER FUNCTIONS ---
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

// Translates the enum into a readable, friendly label
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

export default function D3Chart({ plotType, chartData, histogramData, xAxisType, yAxisType }: D3ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!containerRef.current || !svgRef.current) return;

    // 1. Setup Dimensions (Increased bottom & left margins for permanent labels)
    const margin = { top: 20, right: 30, bottom: 60, left: 70 };
    const width = containerRef.current.clientWidth - margin.left - margin.right;
    const height = containerRef.current.clientHeight - margin.top - margin.bottom;

    // 2. Clear previous renders
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const chart = svg
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // --- REUSABLE STYLING FUNCTIONS ---
    // Makes the axis lines thicker, softer in colour, and rounds the edges
    const styleFriendlyAxis = (selection: d3.Selection<SVGGElement, any, null, undefined>) => {
      selection.select(".domain")
        .attr("stroke", "#d4d4d8") // zinc-300
        .attr("stroke-width", 3)
        .attr("stroke-linecap", "round");

      selection.selectAll(".tick line")
        .attr("stroke", "#d4d4d8")
        .attr("stroke-width", 2);

      selection.selectAll("text")
        .attr("fill", "#52525b") // zinc-600
        .style("font-size", "13px")
        .style("font-weight", "600")
        .style("font-family", "inherit");
    };

    // Softens the background grid so it doesn't distract from the data
    const styleFriendlyGrid = (selection: d3.Selection<SVGGElement, any, null, undefined>) => {
      selection.selectAll(".tick line")
        .attr("stroke", "#e4e4e7") // zinc-200
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "4 4");
      selection.select(".domain").remove(); // Hide the solid line
    };

    // --- 1D HISTOGRAM RENDER ---
    if (plotType === '1D') {
      if (!histogramData || histogramData.length === 0) return;

      const xDomain = histogramData.map(d => d.name.toString());
      const xScale = d3.scaleBand().domain(xDomain).range([0, width]).padding(0.1);
      
      const maxCount = d3.max(histogramData, d => d.count) || 10;
      const yScale = d3.scaleLinear().domain([0, maxCount]).nice().range([height, 0]);

      // Add X Axis
      const xAxis = chart.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickSizeOuter(0).tickPadding(10));
      styleFriendlyAxis(xAxis);

      // Add Y Axis
      const yAxis = chart.append("g")
        .call(d3.axisLeft(yScale).ticks(5).tickSizeOuter(0).tickPadding(10));
      styleFriendlyAxis(yAxis);

      // X Axis Label
      chart.append("text")
        .attr("x", width / 2)
        .attr("y", height + 50)
        .attr("fill", "#3f3f46") // zinc-700
        .style("text-anchor", "middle")
        .style("font-weight", "bold")
        .style("font-size", "14px")
        .text(getAxisLabel(xAxisType));

      // Y Axis Label
      chart.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -50)
        .attr("x", -(height / 2))
        .attr("fill", "#3f3f46") // zinc-700
        .style("text-anchor", "middle")
        .style("font-weight", "bold")
        .style("font-size", "14px")
        .text("Number of People");

      // Draw Bars
      chart.selectAll("rect")
        .data(histogramData)
        .enter()
        .append("rect")
        .attr("x", d => xScale(d.name.toString()) || 0)
        .attr("y", d => yScale(d.count))
        .attr("width", xScale.bandwidth())
        .attr("height", d => height - yScale(d.count))
        .attr("fill", "#ec4899")
        .attr("rx", 4) // Friendlier rounded tops
        .attr("ry", 4)
        .append("title")
        .text(d => `Value: ${d.name}\nPeople: ${d.count}`);
    } 
    
    // --- 2D SCATTER RENDER ---
    else {
      if (!chartData || chartData.length === 0) return;

      const [xMin, xMax] = getAxisDomain(xAxisType);
      const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, width]);

      const [yMin, yMax] = getAxisDomain(yAxisType);
      const yScale = d3.scaleLinear().domain([yMin, yMax]).range([height, 0]);

      // Add Gridlines FIRST so they sit behind the dots
      chart.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickValues(getTicks(xAxisType)).tickSize(-height).tickFormat(() => ""))
        .call(styleFriendlyGrid);

      chart.append("g")
        .call(d3.axisLeft(yScale).tickValues(getTicks(yAxisType)).tickSize(-width).tickFormat(() => ""))
        .call(styleFriendlyGrid);

      // Add X Axis
      const xAxis = chart.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickValues(getTicks(xAxisType)).tickPadding(10));
      styleFriendlyAxis(xAxis);

      // Add Y Axis
      const yAxis = chart.append("g")
        .call(d3.axisLeft(yScale).tickValues(getTicks(yAxisType)).tickPadding(10));
      styleFriendlyAxis(yAxis);

      // X Axis Label
      chart.append("text")
        .attr("x", width / 2)
        .attr("y", height + 50)
        .attr("fill", "#3f3f46")
        .style("text-anchor", "middle")
        .style("font-weight", "bold")
        .style("font-size", "14px")
        .text(getAxisLabel(xAxisType));

      // Y Axis Label
      chart.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -50)
        .attr("x", -(height / 2))
        .attr("fill", "#3f3f46")
        .style("text-anchor", "middle")
        .style("font-weight", "bold")
        .style("font-size", "14px")
        .text(getAxisLabel(yAxisType));

      // Draw Scatter Points
      chart.selectAll("circle")
        .data(chartData)
        .enter()
        .append("circle")
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.y))
        .attr("r", 5) // Slightly larger, friendlier dots
        .style("fill", "#ec4899")
        .style("opacity", 0.7)
        .append("title")
        .text(d => `Respondent ID: ${d.id}\nX: ${d.x.toFixed(2)}\nY: ${d.y.toFixed(2)}`);
    }
  }, [plotType, chartData, histogramData, xAxisType, yAxisType]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg ref={svgRef}></svg>
    </div>
  );
}