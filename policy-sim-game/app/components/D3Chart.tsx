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
  highlightBars?: number[];
  ministers?: any[]; 
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
  plotType, chartData, histogramData, xAxisType, yAxisType, color, highlightBars, ministers
}: D3ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const prevPlotType = useRef<string | null>(null);
  const prevXAxis = useRef<AxisVariable | null>(null);
  const prevYAxis = useRef<AxisVariable | null>(null);

  useEffect(() => {
    if (!containerRef.current || !svgRef.current) return;

    const margin = { top: 40, right: 30, bottom: 60, left: 70 }; 
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
      
      const yScale = d3.scaleLinear().domain([0, yDomainMax]).nice().range([height, 0]);

      chart.select(".axis-x").transition().duration(500).call(d3.axisBottom(xScale) as any).call(styleAxis);
      chart.select(".axis-y").transition().duration(500).call(d3.axisLeft(yScale).ticks(5) as any).call(styleAxis);
      chart.select(".label-x").attr("x", width / 2).attr("y", height + 45).attr("fill", "#3f3f46").style("text-anchor", "middle").style("font-weight", "bold").text(getAxisLabel(xAxisType));

      const bars = dataLayer.selectAll<SVGRectElement, any>("rect.bar").data(histogramData, d => d.name);
      
      bars.join("rect")
        .attr("class", "bar")
        .style("cursor", "crosshair")
        .on("mouseenter", (event, d) => {
          if (d.count === 0) return;
          
          let tooltip: any = d3.select(containerRef.current).select(".chart-tooltip");
          if (tooltip.empty()) {
            tooltip = d3.select(containerRef.current).append("div")
              .attr("class", "chart-tooltip absolute pointer-events-none z-50 bg-white border border-zinc-200 shadow-xl rounded-xl p-4 min-w-[240px] text-zinc-800 animate-in fade-in zoom-in duration-150");
          }

          let stakeholderHtml = "";
          if (ministers && ministers.length > 0) {
            // Find the absolute highest percentage keys for this specific bin
            const dominantWealth = Object.keys(d.breakdown.wealth).reduce((a, b) => d.breakdown.wealth[a] > d.breakdown.wealth[b] ? a : b) as 'Poor' | 'Middle' | 'Wealthy';
            const dominantAge = Object.keys(d.breakdown.age).reduce((a, b) => d.breakdown.age[a] > d.breakdown.age[b] ? a : b) as 'Youth' | 'Adult' | 'Elderly';

            const wealthMinisterMap = { 'Poor': 'Welfare Secretary', 'Middle': 'Home Secretary', 'Wealthy': 'Chancellor' };
            const ageMinisterMap = { 'Youth': 'Education Secretary', 'Adult': 'Business Secretary', 'Elderly': 'Pensions Secretary' };

            const wMin = ministers.find(m => m.name === wealthMinisterMap[dominantWealth]);
            const aMin = ministers.find(m => m.name === ageMinisterMap[dominantAge]);

            const getEmoji = (status: string) => status === 'happy' ? '😊' : status === 'angry' ? '😠' : '😐';
            // Swap out grey for amber when neutral
            const getCircleColor = (status: string) => status === 'happy' ? 'bg-emerald-500' : status === 'angry' ? 'bg-rose-500' : 'bg-amber-400';

            stakeholderHtml = `
              <div class="mt-4 pt-3 border-t border-zinc-100">
                <p class="text-[9px] font-bold uppercase text-zinc-400 mb-2">Dominant Bin Stakeholders</p>
                <div class="flex flex-col gap-2">
                  ${wMin ? `
                    <div class="flex items-center justify-between">
                      <span class="text-xs text-zinc-600"><strong>${wMin.name}</strong> (${dominantWealth})</span>
                      <div class="w-7 h-7 rounded-full flex items-center justify-center ${getCircleColor(wMin.status)} border-2 border-white shadow-sm text-sm shrink-0">
                        ${getEmoji(wMin.status)}
                      </div>
                    </div>
                  ` : ''}
                  ${aMin && aMin.name !== wMin?.name ? `
                    <div class="flex items-center justify-between mt-1">
                      <span class="text-xs text-zinc-600"><strong>${aMin.name}</strong> (${dominantAge})</span>
                      <div class="w-7 h-7 rounded-full flex items-center justify-center ${getCircleColor(aMin.status)} border-2 border-white shadow-sm text-sm shrink-0">
                        ${getEmoji(aMin.status)}
                      </div>
                    </div>
                  ` : ''}
                </div>
              </div>
            `;
          }

          tooltip.style("opacity", 1).html(`
            <div class="space-y-4">
              <div class="border-b border-zinc-100 pb-2">
                <p class="text-[10px] font-black uppercase tracking-widest text-zinc-400">LS Score ${d.name}</p>
                <p class="text-sm font-bold text-zinc-600">${d.count} Residents</p>
              </div>
              
              <div class="space-y-3">
                <div>
                  <p class="text-[9px] font-bold uppercase text-zinc-400 mb-1">Wealth Breakdown</p>
                  <div class="flex h-1.5 w-full rounded-full overflow-hidden bg-zinc-100">
                    <div style="width: ${d.breakdown.wealth.Poor}%" class="bg-rose-500"></div>
                    <div style="width: ${d.breakdown.wealth.Middle}%" class="bg-blue-500"></div>
                    <div style="width: ${d.breakdown.wealth.Wealthy}%" class="bg-emerald-500"></div>
                  </div>
                  <div class="flex justify-between text-[10px] mt-1.5 font-bold">
                    <span class="text-rose-600">Poor: ${Math.round(d.breakdown.wealth.Poor)}%</span>
                    <span class="text-blue-500">Middle: ${Math.round(d.breakdown.wealth.Middle)}%</span>
                    <span class="text-emerald-600">Wealthy: ${Math.round(d.breakdown.wealth.Wealthy)}%</span>
                  </div>
                </div>

                <div>
                  <p class="text-[9px] font-bold uppercase text-zinc-400 mb-1">Age Breakdown</p>
                  <div class="flex h-1.5 w-full rounded-full overflow-hidden bg-zinc-100">
                    <div style="width: ${d.breakdown.age.Youth}%" class="bg-amber-400"></div>
                    <div style="width: ${d.breakdown.age.Adult}%" class="bg-indigo-500"></div>
                    <div style="width: ${d.breakdown.age.Elderly}%" class="bg-teal-500"></div>
                  </div>
                  <div class="flex justify-between text-[10px] mt-1.5 font-bold">
                    <span class="text-amber-600">Youth: ${Math.round(d.breakdown.age.Youth)}%</span>
                    <span class="text-indigo-500">Adult: ${Math.round(d.breakdown.age.Adult)}%</span>
                    <span class="text-teal-600">Elderly: ${Math.round(d.breakdown.age.Elderly)}%</span>
                  </div>
                </div>
              </div>
              ${stakeholderHtml}
            </div>
          `);
        })
        .on("mousemove", (event) => {
          const [x, y] = d3.pointer(event, containerRef.current);
          const chartWidth = containerRef.current?.clientWidth || 0;
          const xPos = x + 200 > chartWidth ? x - 200 : x + 20;
          d3.select(containerRef.current).select(".chart-tooltip").style("left", `${xPos}px`).style("top", `${y - 20}px`);
        })
        .on("mouseleave", () => {
          d3.select(containerRef.current).select(".chart-tooltip").style("opacity", 0);
        })
        .transition().duration(500)
        .attr("x", d => xScale(d.name.toString()) || 0)
        .attr("y", d => yScale(d.count))
        .attr("width", xScale.bandwidth())
        .attr("height", d => height - yScale(d.count))
        .attr("fill", chartColor)
        .attr("rx", 4);

      annotationLayer.selectAll("*").remove();

    } else if (plotType === '2D') {
      annotationLayer.selectAll("*").remove(); 
      
      const xScale = d3.scaleLinear().domain(getAxisDomain(xAxisType)).range([0, width]);
      const yScale = d3.scaleLinear().domain(getAxisDomain(yAxisType)).range([height, 0]);

      chart.select(".axis-x").transition().duration(500).call(d3.axisBottom(xScale).tickValues(getTicks(xAxisType)) as any).call(styleAxis);
      chart.select(".axis-y").transition().duration(500).call(d3.axisLeft(yScale).tickValues(getTicks(yAxisType)) as any).call(styleAxis);

      dataLayer.selectAll("circle.dot").data(chartData, (d: any) => d.id)
        .join("circle").attr("class", "dot")
        .transition().duration(500)
        .attr("cx", d => xScale(d.x)).attr("cy", d => yScale(d.y)).attr("r", 5).style("fill", chartColor).style("opacity", 0.7);
    }
  }, [plotType, chartData, histogramData, xAxisType, yAxisType, color, ministers, highlightBars]);

  return <div ref={containerRef} className="w-full h-full relative"><svg ref={svgRef}></svg></div>;
}