import React, { useRef, useEffect, useState, useId } from 'react';
import * as d3 from 'd3';
import { AxisVariable } from '../utils/types';

export interface ChartMarker {
  value: number;
  label: string;
  color?: string;
  dashed?: boolean;
  hideLabelText?: boolean;
}

interface HistogramEntry {
  name: string | number;
  count: number;
}

interface D3ChartProps {
  plotType: '1D' | '2D';
  chartData: any[];
  histogramData?: HistogramEntry[]; 
  xAxisType: AxisVariable;
  yAxisType: AxisVariable;
  color?: string; 
  markers?: ChartMarker[];
  visualStyle?: 'solid' | 'faces';
}

const getAxisDomain = (axisType: AxisVariable): [number, number] => {
  switch (axisType) {
    case AxisVariable.LifeSatisfaction: return [0, 10];
    case AxisVariable.PersonalUtility:
    case AxisVariable.SocietalFairness: return [0, 10];
    case AxisVariable.DeltaPersonalUtility:
    case AxisVariable.DeltaSocietalFairness: return [-10, 10];
    default: return [0, 10];
  }
};

const getTicks = (axisType: AxisVariable) => {
  switch (axisType) {
    case AxisVariable.LifeSatisfaction: return [0, 2.5, 5, 7.5, 10];
    case AxisVariable.PersonalUtility:
    case AxisVariable.SocietalFairness: return [0, 2.5, 5, 7.5, 10];
    case AxisVariable.DeltaPersonalUtility:
    case AxisVariable.DeltaSocietalFairness: return [-10, -5, 0, 5, 10];
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
  plotType, chartData, histogramData, xAxisType, yAxisType, color, markers, visualStyle = 'faces' 
}: D3ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  const prevPlotType = useRef<string | null>(null);
  const prevXAxis = useRef<AxisVariable | null>(null);
  const prevYAxis = useRef<AxisVariable | null>(null);
  const chartId = useId().replace(/:/g, '');

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        setDimensions({
          width: entries[0].contentRect.width,
          height: entries[0].contentRect.height
        });
      }
    });
    
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const markersJson = JSON.stringify(markers); 

  useEffect(() => {
    if (!containerRef.current || !svgRef.current) return;

    const margin = { top: 20, right: 20, bottom: 38, left: 50 };
    const width = Math.max(0, containerRef.current.clientWidth - margin.left - margin.right);
    const height = Math.max(0, containerRef.current.clientHeight - margin.top - margin.bottom);
    const chartColor = color || "#ec4899"; 

    const svg = d3.select(svgRef.current);
    svg.attr("width", width + margin.left + margin.right).attr("height", height + margin.top + margin.bottom);

    if (prevPlotType.current !== plotType || prevXAxis.current !== xAxisType || prevYAxis.current !== yAxisType) {
      svg.selectAll("*").remove();
      const chart = svg.append("g").attr("class", "main-group").attr("transform", `translate(${margin.left},${margin.top})`);
      
      chart.append("g").attr("class", "axis-x");
      chart.append("g").attr("class", "axis-y");
      chart.append("text").attr("class", "label-x");
      chart.append("g").attr("class", "data-layer");
      chart.append("g").attr("class", "annotation-layer");
      
      prevPlotType.current = plotType;
      prevXAxis.current = xAxisType;
      prevYAxis.current = yAxisType;
    }

    const chart = svg.select(".main-group");
    const dataLayer = chart.select(".data-layer");
    const annotationLayer = chart.select(".annotation-layer");

    chart.select(".axis-x").attr("transform", `translate(0,${height})`);

    const styleAxis = (sel: any) => {
      sel.select(".domain").attr("stroke", "#d4d4d8").attr("stroke-width", 3);
      sel.selectAll(".tick line").attr("stroke", "#d4d4d8").attr("stroke-width", 2);
      sel.selectAll("text").attr("fill", "#52525b").style("font-size", "12px").style("font-weight", "600");
    };

    if (plotType === '1D' && histogramData) {
      const xDomain = histogramData.map(d => d.name.toString());
      const xScale = d3.scaleBand().domain(xDomain).range([0, width]).padding(0.1);
      
      const totalPop = d3.sum(histogramData, d => d.count);
      const currentHighestBar = d3.max(histogramData, d => d.count) || 0;
      const baselineMax = Math.ceil(totalPop * 0.30);
      const yDomainMax = Math.max(baselineMax, currentHighestBar);
      
      const yScale = d3.scaleLinear().domain([0, yDomainMax]).range([height, 0]);

      const defs = svg.selectAll("defs").data([0]).join("defs");
      
      if (visualStyle === 'faces') {
        const bw = xScale.bandwidth();
        const idealFaceSize = 18; 
        const cols = Math.max(2, Math.min(3, Math.floor(bw / idealFaceSize)));
        const faceSize = bw / cols;
          
        defs.selectAll("*").remove(); 
        const patterns = defs.selectAll("pattern.face-pattern")
          .data(histogramData, (d: any) => d.name)
          .join("pattern")
          .attr("class", "face-pattern")
          .attr("id", d => `face-${d.name}-${chartId}`)
          .attr("patternUnits", "userSpaceOnUse")
          .attr("width", faceSize)   
          .attr("height", faceSize)  
          .attr("x", d => xScale(d.name.toString()) || 0)
          .attr("y", height);

        const faceGroup = patterns.append("g");
        const cx = faceSize / 2;
        const cy = faceSize / 2;

        faceGroup.append("circle")
          .attr("cx", cx)
          .attr("cy", cy)
          .attr("r", faceSize / 2 - 1)
          .attr("fill", d => d3.interpolateRdYlGn(Number(d.name) / 10))
          .attr("stroke", d => d3.color(d3.interpolateRdYlGn(Number(d.name) / 10))?.darker(0.6)?.toString() || "#1f2937")
          .attr("stroke-width", 1);

        faceGroup.append("circle").attr("cx", cx - faceSize * 0.16).attr("cy", cy - faceSize * 0.1).attr("r", faceSize * 0.08).attr("fill", "#1f2937");
        faceGroup.append("circle").attr("cx", cx + faceSize * 0.16).attr("cy", cy - faceSize * 0.1).attr("r", faceSize * 0.08).attr("fill", "#1f2937");
        
        faceGroup.append("path")
          .attr("d", d => {
            const score = Number(d.name); 
            const startX = cx - faceSize * 0.22;
            const endX = cx + faceSize * 0.22;
            const baseY = cy + faceSize * 0.15; 
            const controlY = cy - faceSize * 0.05 + (score / 10) * (faceSize * 0.4); 
            return `M ${startX} ${baseY} Q ${cx} ${controlY} ${endX} ${baseY}`;
          })
          .attr("stroke", "#1f2937")
          .attr("stroke-width", 1) 
          .attr("fill", "none")
          .attr("stroke-linecap", "round");
      }

      chart.select(".axis-x").transition().duration(dimensions.width ? 0 : 500).call(d3.axisBottom(xScale) as any).call(styleAxis);
      chart.select(".axis-y").transition().duration(dimensions.width ? 0 : 500).call(d3.axisLeft(yScale).ticks(5) as any).call(styleAxis);
      
      chart.select(".label-x").attr("x", width / 2).attr("y", height + 32).attr("fill", "#3f3f46").style("text-anchor", "middle").style("font-weight", "bold").text(getAxisLabel(xAxisType));

      const bw = xScale.bandwidth();
      const idealFaceSize = 18;
      const cols = Math.max(2, Math.min(3, Math.floor(bw / idealFaceSize)));
      const faceSize = bw / cols;

      dataLayer.selectAll("rect.bar").data(histogramData, (d: any) => d.name)
        .join(
          enter => enter.append("rect")
            .attr("class", "bar")
            .attr("x", d => xScale(d.name.toString()) || 0)
            .attr("width", bw)
            .attr("y", height)
            .attr("height", 0),
          update => update,
          exit => exit.remove()
        )
        .transition().duration(600).ease(d3.easeCubicOut)
        .attr("x", d => xScale(d.name.toString()) || 0)
        .attr("width", bw)
        .attr("y", d => {
          if (visualStyle === 'faces') {
            const rawHeight = height - yScale(d.count);
            let faceCount = Math.floor(rawHeight / faceSize);
            if (d.count > 0 && faceCount === 0) faceCount = 1;
            return height - (faceCount * faceSize);
          }
          return yScale(d.count);
        })
        .attr("height", d => {
          if (visualStyle === 'faces') {
            const rawHeight = height - yScale(d.count);
            let faceCount = Math.floor(rawHeight / faceSize);
            if (d.count > 0 && faceCount === 0) faceCount = 1;
            return faceCount * faceSize;
          }
          return height - yScale(d.count);
        })
        .attr("fill", d => visualStyle === 'faces' ? `url(#face-${d.name}-${chartId})` : chartColor)
        .attr("rx", visualStyle === 'faces' ? 0 : 4);

      annotationLayer.selectAll("*").remove();

      if (markers && markers.length > 0) {
        const continuousXScale = d3.scaleLinear().domain([0, 10]).range([(xScale("0") || 0) + xScale.bandwidth() / 2, (xScale("10") || 0) + xScale.bandwidth() / 2]);

        markers.forEach((marker, index) => {
          const markerX = continuousXScale(Math.max(0, Math.min(10, marker.value)));
          const markerColor = marker.color || "#3f3f46";
          const yPos = 12 + (index * 16); 

          annotationLayer.append("line")
            .attr("x1", markerX).attr("x2", markerX)
            .attr("y1", 0).attr("y2", height)
            .attr("stroke", markerColor)
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", marker.dashed ? "6,4" : "none");

          annotationLayer.append("text")
            .attr("y", yPos)
            .attr("x", markerX - 8) 
            .attr("fill", markerColor)
            .attr("font-size", "12px")
            .attr("font-weight", "900")
            .attr("stroke", "white")
            .attr("stroke-width", 4)
            .style("paint-order", "stroke")
            .attr("text-anchor", "end") 
            .text(marker.hideLabelText ? marker.value.toFixed(2) : `${marker.label}: ${marker.value.toFixed(2)}`);
        });
      }

    } else if (plotType === '2D') {
      annotationLayer.selectAll("*").remove(); 
      const xScale = d3.scaleLinear().domain(getAxisDomain(xAxisType)).range([0, width]);
      const yScale = d3.scaleLinear().domain(getAxisDomain(yAxisType)).range([height, 0]);

      chart.select(".axis-x").transition().duration(dimensions.width ? 0 : 500).call(d3.axisBottom(xScale).tickValues(getTicks(xAxisType)) as any).call(styleAxis);
      chart.select(".axis-y").transition().duration(dimensions.width ? 0 : 500).call(d3.axisLeft(yScale).tickValues(getTicks(yAxisType)) as any).call(styleAxis);

      dataLayer.selectAll("circle.dot").data(chartData, (d: any) => d.id).join("circle").attr("class", "dot").transition().duration(500).attr("cx", d => xScale(d.x)).attr("cy", d => yScale(d.y)).attr("r", 5).style("fill", chartColor).style("opacity", 0.7);
    }
  }, [plotType, chartData, histogramData, xAxisType, yAxisType, color, markersJson, visualStyle, dimensions]);

  return <div ref={containerRef} className="w-full h-full relative"><svg ref={svgRef}></svg></div>;
}