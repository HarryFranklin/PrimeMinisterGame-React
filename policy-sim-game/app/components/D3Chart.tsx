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
  segments?: { label: string, value: number, color: string }[];
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
  yAxisMax?: number;
  faceCols?: number;
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

const MIN_FACE_PX = 10;
const MAX_FACE_PX = 22;

function calcFaceSize(bandwidth: number, requestedCols: number): number {
  return bandwidth / Math.max(1, requestedCols);
}

export default function D3Chart({ 
  plotType, chartData, histogramData, xAxisType, yAxisType, color, markers, yAxisMax = 80, visualStyle = 'faces', faceCols = 2 
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

    const margin = { top: 20, right: 20, bottom: 45, left: 50 };
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
      // True linear scale starting exactly at 0, spanning 11 bins (0 through 10)
      const xScale = d3.scaleLinear().domain([0, 11]).range([0, width]);
      
      // Calculate bin width and the offset to centre items inside their bin
      const bw = (width / 11) * 0.9;
      const getXPos = (name: string | number) => xScale(Number(name)) + (width / 11) * 0.05;

      const yDomainMax = yAxisMax;               
      const yScale = d3.scaleLinear().domain([0, yDomainMax]).range([height, 0]);
      
      const defs = svg.selectAll("defs").data([0]).join("defs");
      
      if (visualStyle === 'faces') {
        const faceSize = calcFaceSize(bw, faceCols);
            
        defs.selectAll("*").remove(); 
        const patterns = defs.selectAll("pattern.face-pattern")
          .data(histogramData, (d: any) => d.name)
          .join("pattern")
          .attr("class", "face-pattern")
          .attr("id", d => `face-${d.name}-${chartId}`)
          .attr("patternUnits", "userSpaceOnUse")
          .attr("width", faceSize)       
          .attr("height", faceSize)      
          .attr("x", d => getXPos(d.name))
          .attr("y", height)
          .attr("viewBox", "0 0 100 100")
          .attr("preserveAspectRatio", "xMidYMid meet");

        const faceGroup = patterns.append("g");

        // Face Background
        faceGroup.append("circle")
          .attr("cx", 50)
          .attr("cy", 50)
          .attr("r", 48) 
          .attr("fill", d => d3.interpolateRdYlGn(Number(d.name) / 10))
          .attr("stroke", d => {
              const colorObj = d3.color(d3.interpolateRdYlGn(Number(d.name) / 10));
              return colorObj ? colorObj.darker(0.5).formatHex() : "#000000";
          })
          .attr("stroke-width", 4);

        // Eyes
        faceGroup.append("circle").attr("cx", 34).attr("cy", 40).attr("r", 8).attr("fill", "#1f2937");
        faceGroup.append("circle").attr("cx", 66).attr("cy", 40).attr("r", 8).attr("fill", "#1f2937");
        
        // Mouth
        faceGroup.append("path")
          .attr("d", d => {
            const score = Number(d.name); 
            const controlY = 45 + (score / 10) * 40; 
            return `M 28 65 Q 50 ${controlY} 72 65`;
          })
          .attr("stroke", "#1f2937")
          .attr("stroke-width", 6) 
          .attr("fill", "none")
          .attr("stroke-linecap", "round");
      }

      // Hardcode the ticks to 0 through 10
      chart.select(".axis-x")
        .transition().duration(dimensions.width ? 0 : 500)
        .call(d3.axisBottom(xScale).tickValues([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) as any)
        .call(styleAxis);

      chart.select(".axis-y")
        .transition().duration(dimensions.width ? 0 : 500)
        .call(d3.axisLeft(yScale).ticks(5) as any)
        .call(styleAxis);
      
      chart.select(".label-x").attr("x", width / 2).attr("y", height + 38).attr("fill", "#3f3f46").style("text-anchor", "middle").style("font-weight", "bold").text(getAxisLabel(xAxisType));

      dataLayer.selectAll("rect.bar").remove(); 
      const cols = dataLayer.selectAll("g.col").data(histogramData, (d: any) => d.name)
        .join("g")
        .attr("class", "col");

      if (visualStyle === 'faces') {
        const faceSize = calcFaceSize(bw, faceCols);

        cols.selectAll("rect.segment").remove();
        cols.selectAll("rect.face-bar").data(d => [d])
          .join(
            enter => enter.append("rect")
              .attr("class", "face-bar")
              .attr("x", d => getXPos(d.name))
              .attr("width", bw)
              .attr("fill", d => `url(#face-${d.name}-${chartId})`)
              .attr("y", height)
              .attr("height", 0),
            update => update,
            exit => exit.transition().duration(400).attr("y", height).attr("height", 0).remove()
          )
          .transition().duration(1000).ease(d3.easeCubicOut)
          .attr("x", d => getXPos(d.name))
          .attr("y", d => {
            const rawHeight = height - yScale(d.count);
            let faceCount = Math.floor(rawHeight / faceSize);
            if (d.count > 0 && faceCount === 0) faceCount = 1;
            return height - (faceCount * faceSize);
          })
          .attr("height", d => {
            const rawHeight = height - yScale(d.count);
            let faceCount = Math.floor(rawHeight / faceSize);
            if (d.count > 0 && faceCount === 0) faceCount = 1;
            return faceCount * faceSize;
          });

      } else {
        cols.selectAll("rect.face-bar").remove();
        cols.selectAll("rect.segment")
          .data(d => {
            if (d.segments !== undefined) {
              let currentY = height;
              return d.segments.map((seg: any) => {
                const segH = height - yScale(seg.value);
                currentY -= segH;
                return { ...seg, name: d.name, key: seg.label, yPos: currentY, h: segH };
              });
            }
            return [{ key: 'single', name: d.name, color: chartColor, yPos: yScale(d.count), h: height - yScale(d.count) }];
          }, (d: any) => d.key)
          .join(
            enter => enter.append("rect")
              .attr("class", "segment")
              .attr("x", d => getXPos(d.name))
              .attr("width", bw)
              .attr("y", height)
              .attr("height", 0)
              .attr("fill", d => d.color),
            update => update,
            exit => exit.transition().duration(400).attr("y", height).attr("height", 0).remove()
          )
          .transition().duration(1200).ease(d3.easeCubicOut)
          .attr("x", d => getXPos(d.name))
          .attr("width", bw)
          .attr("y", d => d.yPos)
          .attr("height", d => d.h)
          .attr("fill", d => d.color);
      }

      annotationLayer.selectAll("*").remove();

      if (markers && markers.length > 0) {
        markers.forEach((marker, index) => {
          // xScale handles the exact positioning inherently now
          const markerX = xScale(Math.max(0, Math.min(10.9, marker.value)));
          const markerColor = marker.color || "#3f3f46";
          const yPos = 12 + (index * 16);
          
          annotationLayer.append("line")
            .attr("x1", markerX).attr("x2", markerX)
            .attr("y1", 0).attr("y2", height)
            .attr("stroke", markerColor)
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", marker.dashed ? "6,4" : "none")
            .style("opacity", 0)
            .transition().duration(300).ease(d3.easeCubicOut)
            .style("opacity", 1);

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
          .text(marker.label) 
          .style("opacity", 0)
          .transition().duration(300).delay(0).ease(d3.easeCubicOut)
          .style("opacity", 1);
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

  }, [plotType, chartData, histogramData, xAxisType, yAxisType, color, markersJson, visualStyle, dimensions, faceCols]);

  return <div ref={containerRef} className="w-full h-full relative"><svg ref={svgRef}></svg></div>;
}