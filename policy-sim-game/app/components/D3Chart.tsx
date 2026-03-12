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

export default function D3Chart({ plotType, chartData, histogramData, xAxisType, yAxisType }: D3ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const prevPlotType = useRef<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !svgRef.current) return;

    const margin = { top: 20, right: 30, bottom: 60, left: 70 };
    const width = containerRef.current.clientWidth - margin.left - margin.right;
    const height = containerRef.current.clientHeight - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);

    // Only wipe the entire SVG if we are switching between 1D and 2D views
    if (prevPlotType.current !== plotType) {
      svg.selectAll("*").remove();
      
      const chart = svg
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("class", "main-group")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      // Create permanent containers for axes and data so they can be updated smoothly
      chart.append("g").attr("class", "grid-x");
      chart.append("g").attr("class", "grid-y");
      chart.append("g").attr("class", "axis-x").attr("transform", `translate(0,${height})`);
      chart.append("g").attr("class", "axis-y");
      chart.append("text").attr("class", "label-x");
      chart.append("text").attr("class", "label-y").attr("transform", "rotate(-90)");
      chart.append("g").attr("class", "data-layer");
      
      prevPlotType.current = plotType;
    }

    const chart = svg.select(".main-group");
    const dataLayer = chart.select(".data-layer");

    const styleFriendlyAxis = (selection: any) => {
      selection.select(".domain").attr("stroke", "#d4d4d8").attr("stroke-width", 3).attr("stroke-linecap", "round");
      selection.selectAll(".tick line").attr("stroke", "#d4d4d8").attr("stroke-width", 2);
      selection.selectAll("text").attr("fill", "#52525b").style("font-size", "13px").style("font-weight", "600").style("font-family", "inherit");
    };

    const styleFriendlyGrid = (selection: any) => {
      selection.selectAll(".tick line").attr("stroke", "#e4e4e7").attr("stroke-width", 2).attr("stroke-dasharray", "4 4");
      selection.select(".domain").remove();
    };

    // --- 1D HISTOGRAM RENDER (Animated) ---
    if (plotType === '1D') {
      if (!histogramData || histogramData.length === 0) return;

      const xDomain = histogramData.map(d => d.name.toString());
      const xScale = d3.scaleBand().domain(xDomain).range([0, width]).padding(0.1);
      const maxCount = d3.max(histogramData, d => d.count) || 10;
      const yScale = d3.scaleLinear().domain([0, maxCount]).nice().range([height, 0]);

      chart.select(".axis-x").transition().duration(500).call(d3.axisBottom(xScale).tickSizeOuter(0).tickPadding(10) as any).call(styleFriendlyAxis);
      chart.select(".axis-y").transition().duration(500).call(d3.axisLeft(yScale).ticks(5).tickSizeOuter(0).tickPadding(10) as any).call(styleFriendlyAxis);

      chart.select(".label-x").attr("x", width / 2).attr("y", height + 50).attr("fill", "#3f3f46").style("text-anchor", "middle").style("font-weight", "bold").style("font-size", "14px").text(getAxisLabel(xAxisType));
      chart.select(".label-y").attr("y", -50).attr("x", -(height / 2)).attr("fill", "#3f3f46").style("text-anchor", "middle").style("font-weight", "bold").style("font-size", "14px").text("Number of People");

      // Bind data and animate bars
      const bars = dataLayer.selectAll<SVGRectElement, any>("rect.bar").data(histogramData, d => d.name);
      
      const barsEnter = bars.enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => xScale(d.name.toString()) || 0)
        .attr("y", height) // Start from the bottom
        .attr("width", xScale.bandwidth())
        .attr("height", 0) // Start with 0 height
        .attr("fill", "#ec4899")
        .attr("rx", 4).attr("ry", 4);

      barsEnter.append("title");

      bars.merge(barsEnter)
        .transition().duration(500) // 500ms smooth animation
        .attr("x", d => xScale(d.name.toString()) || 0)
        .attr("y", d => yScale(d.count))
        .attr("width", xScale.bandwidth())
        .attr("height", d => height - yScale(d.count));

      // Update tooltips
      dataLayer.selectAll("rect.bar title").data(histogramData, (d: any) => d.name).text((d: any) => `Value: ${d.name}\nPeople: ${d.count}`);
      
      bars.exit().remove();
    } 
    
    // --- 2D SCATTER RENDER (Animated) ---
    else {
      if (!chartData || chartData.length === 0) return;

      const [xMin, xMax] = getAxisDomain(xAxisType);
      const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, width]);
      const [yMin, yMax] = getAxisDomain(yAxisType);
      const yScale = d3.scaleLinear().domain([yMin, yMax]).range([height, 0]);

      chart.select(".grid-x").transition().duration(500).call(d3.axisBottom(xScale).tickValues(getTicks(xAxisType)).tickSize(-height).tickFormat(() => "") as any).call(styleFriendlyGrid);
      chart.select(".grid-y").transition().duration(500).call(d3.axisLeft(yScale).tickValues(getTicks(yAxisType)).tickSize(-width).tickFormat(() => "") as any).call(styleFriendlyGrid);

      chart.select(".axis-x").transition().duration(500).call(d3.axisBottom(xScale).tickValues(getTicks(xAxisType)).tickPadding(10) as any).call(styleFriendlyAxis);
      chart.select(".axis-y").transition().duration(500).call(d3.axisLeft(yScale).tickValues(getTicks(yAxisType)).tickPadding(10) as any).call(styleFriendlyAxis);

      chart.select(".label-x").attr("x", width / 2).attr("y", height + 50).attr("fill", "#3f3f46").style("text-anchor", "middle").style("font-weight", "bold").style("font-size", "14px").text(getAxisLabel(xAxisType));
      chart.select(".label-y").attr("y", -50).attr("x", -(height / 2)).attr("fill", "#3f3f46").style("text-anchor", "middle").style("font-weight", "bold").style("font-size", "14px").text(getAxisLabel(yAxisType));

      // Bind data and animate dots
      const circles = dataLayer.selectAll<SVGCircleElement, any>("circle.dot").data(chartData, (d: any) => d.id);

      const circlesEnter = circles.enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.y))
        .attr("r", 5)
        .style("fill", "#ec4899")
        .style("opacity", 0.7);

      circlesEnter.append("title");

      circles.merge(circlesEnter)
        .transition().duration(500) // Smooth floating animation for dots
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.y));

      dataLayer.selectAll("circle.dot title").data(chartData, (d: any) => d.id).text((d: any) => `Respondent ID: ${d.id}\nX: ${d.x.toFixed(2)}\nY: ${d.y.toFixed(2)}`);

      circles.exit().remove();
    }
  }, [plotType, chartData, histogramData, xAxisType, yAxisType]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg ref={svgRef}></svg>
    </div>
  );
}