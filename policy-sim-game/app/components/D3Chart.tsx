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
  markerValue?: number;
  markerLabel?: string;
  onHoverMinisters?: (ministerNames: string[]) => void;
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
  plotType, chartData, histogramData, xAxisType, yAxisType, color, highlightBars, ministers, markerValue, markerLabel, onHoverMinisters
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

      // Use the exact ONS probabilities defined in dataLoader.ts for the baseline
      const nationalShares = { 
        Poor: 0.21, 
        Middle: 0.69, 
        Wealthy: 0.10, 
        Youth: 0.186, 
        Adult: 0.581, 
        Elderly: 0.233 
      };

      const bars = dataLayer.selectAll<SVGRectElement, any>("rect.bar").data(histogramData, d => d.name);
      
      bars.join("rect")
        .attr("class", "bar")
        .style("cursor", "crosshair")
        .on("mouseenter", (event, d) => {
          if (d.count === 0) return;
          
          let tooltip = d3.select("body").select<HTMLDivElement>(".chart-tooltip-global");
          if (tooltip.empty()) {
            tooltip = d3.select("body").append("div")
              .attr("class", "chart-tooltip-global fixed pointer-events-none z-[9999] bg-white border border-zinc-200 shadow-xl rounded-xl p-4 min-w-[240px] text-zinc-800 transition-opacity duration-150");
          }

          let stakeholderHtml = "";
          
          // Clear any previous highlights on enter
          if (onHoverMinisters) onHoverMinisters([]); 

          if (ministers && ministers.length > 0) {
            // Assume breakdown is a percentage (0-100). Convert to 0.0 - 1.0 for LQ maths
            const wealthTraits = {
              Poor: { share: (d.breakdown.wealth.Poor || 0) / 100 },
              Middle: { share: (d.breakdown.wealth.Middle || 0) / 100 },
              Wealthy: { share: (d.breakdown.wealth.Wealthy || 0) / 100 }
            };
            const ageTraits = {
              Youth: { share: (d.breakdown.age.Youth || 0) / 100 },
              Adult: { share: (d.breakdown.age.Adult || 0) / 100 },
              Elderly: { share: (d.breakdown.age.Elderly || 0) / 100 }
            };

            let maxWealthTrait: string | null = null; 
            let maxWealthLQ = 0;
            Object.entries(wealthTraits).forEach(([trait, data]) => {
              const natShare = nationalShares[trait as keyof typeof nationalShares];
              if (natShare > 0) {
                const lq = data.share / natShare;
                if (lq > maxWealthLQ) { maxWealthLQ = lq; maxWealthTrait = trait; }
              }
            });

            let maxAgeTrait: string | null = null; 
            let maxAgeLQ = 0;
            Object.entries(ageTraits).forEach(([trait, data]) => {
              const natShare = nationalShares[trait as keyof typeof nationalShares];
              if (natShare > 0) {
                const lq = data.share / natShare;
                if (lq > maxAgeLQ) { maxAgeLQ = lq; maxAgeTrait = trait; }
              }
            });

            const getEmoji = (status: string) => status === 'happy' ? '😊' : status === 'angry' ? '😠' : '😐';
            const getCircleColor = (status: string) => status === 'happy' ? 'bg-emerald-500' : status === 'angry' ? 'bg-rose-500' : 'bg-amber-400';

            const wealthMinisterMap: Record<string, string> = { 'Poor': 'Welfare Secretary', 'Middle': 'Home Secretary', 'Wealthy': 'Chancellor' };
            const ageMinisterMap: Record<string, string> = { 'Youth': 'Education Secretary', 'Adult': 'Business Secretary', 'Elderly': 'Pensions Secretary' };

            const hoveredMins: string[] = [];
            let htmlBlocks: string[] = [];

            // Threshold requires the demographic to be x% more concentrated here than average
            const OVER_REP_THRESHOLD = 1.15;

            const createBlock = (trait: string, lq: number, minName: string) => {
               const targetMin = ministers.find(m => m.name === minName);
               if (targetMin) {
                   hoveredMins.push(minName);
                   return `
                     <div class="bg-pink-50 border border-pink-100 p-2.5 rounded-lg shadow-inner mb-2 last:mb-0 flex justify-between items-center">
                        <div class="flex flex-col">
                          <span class="text-xs font-black text-zinc-800 uppercase">${trait}</span>
                          <span class="text-[11px] text-zinc-500 font-medium mt-0.5">${targetMin.name}</span>
                        </div>
                        <div class="w-7 h-7 rounded-full flex items-center justify-center ${getCircleColor(targetMin.status)} border-2 border-white shadow-sm text-xs shrink-0">
                          ${getEmoji(targetMin.status)}
                        </div>
                      </div>
                   `;
               }
               return "";
            };

            if (maxWealthTrait && maxWealthLQ >= OVER_REP_THRESHOLD) {
                htmlBlocks.push(createBlock(maxWealthTrait, maxWealthLQ, wealthMinisterMap[maxWealthTrait]));
            }
            if (maxAgeTrait && maxAgeLQ >= OVER_REP_THRESHOLD) {
                htmlBlocks.push(createBlock(maxAgeTrait, maxAgeLQ, ageMinisterMap[maxAgeTrait]));
            }

            // Propagate the names to DashboardTab to highlight the cabinet
            if (onHoverMinisters && hoveredMins.length > 0) {
                onHoverMinisters(hoveredMins);
            }

            if (htmlBlocks.length > 0) {
                stakeholderHtml = `
                  <div class="mt-4 pt-3 border-t border-zinc-100">
                    <p class="text-[9px] font-bold uppercase text-pink-500 tracking-widest mb-2">Key Stakeholders Identified</p>
                    ${htmlBlocks.join('')}
                  </div>
                `;
            } else {
                stakeholderHtml = `
                  <div class="mt-4 pt-3 border-t border-zinc-100">
                    <p class="text-[9px] font-bold uppercase text-zinc-400 mb-1">Key Stakeholders</p>
                    <p class="text-xs text-zinc-500 italic">No significant demographic concentrations in this bracket.</p>
                  </div>
                `;
            }
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
          const tooltipNode = d3.select("body").select(".chart-tooltip-global").node() as HTMLElement;
          const tooltipWidth = tooltipNode?.offsetWidth || 240;
          const tooltipHeight = tooltipNode?.offsetHeight || 280;
          
          let xPos = event.clientX + 20;
          let yPos = event.clientY - 20;

          if (xPos + tooltipWidth > window.innerWidth) {
            xPos = event.clientX - tooltipWidth - 20;
          }
          
          if (yPos + tooltipHeight > window.innerHeight) {
            yPos = window.innerHeight - tooltipHeight - 10;
          }
          
          if (yPos < 0) {
            yPos = 10;
          }

          d3.select("body").select(".chart-tooltip-global")
            .style("left", `${xPos}px`)
            .style("top", `${yPos}px`);
        })
        .on("mouseleave", () => {
          d3.select("body").select(".chart-tooltip-global").style("opacity", 0);
          if (onHoverMinisters) onHoverMinisters([]); // Ensure highlights are cleared when mouse leaves
        })
        .transition().duration(500)
        .attr("x", d => xScale(d.name.toString()) || 0)
        .attr("y", d => yScale(d.count))
        .attr("width", xScale.bandwidth())
        .attr("height", d => height - yScale(d.count))
        .attr("fill", chartColor)
        .attr("rx", 4);

      annotationLayer.selectAll("*").remove();

      // Improved Marker rendering logic
      if (markerValue !== undefined && markerLabel) {
        const safeVal = Math.max(0, Math.min(10, markerValue));
        
        // Create a continuous scale mapping 0-10 exactly to the centres of the 0 and 10 bars
        const firstBarCenter = (xScale("0") || 0) + xScale.bandwidth() / 2;
        const lastBarCenter = (xScale("10") || 0) + xScale.bandwidth() / 2;
        
        const continuousXScale = d3.scaleLinear()
          .domain([0, 10])
          .range([firstBarCenter, lastBarCenter]);

        const markerX = continuousXScale(safeVal);

        annotationLayer.append("line")
          .attr("x1", markerX)
          .attr("x2", markerX)
          .attr("y1", 0)
          .attr("y2", height)
          .attr("stroke", "#3f3f46") // zinc-700
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", "6,4")
          .attr("opacity", 0)
          .transition().duration(500)
          .attr("opacity", 1);

        const textNode = annotationLayer.append("text")
          .attr("y", 20)
          .attr("fill", "#18181b") // zinc-900
          .attr("font-size", "12px")
          .attr("font-weight", "900")
          .attr("stroke", "white")
          .attr("stroke-width", 4)
          .style("paint-order", "stroke") // Gives excellent readable outline
          .text(`${markerLabel}: ${markerValue.toFixed(2)}`)
          .attr("opacity", 0);

        // Prevent text clipping if value is too far to the right
        if (markerValue > 8) {
          textNode.attr("x", markerX - 8).attr("text-anchor", "end");
        } else {
          textNode.attr("x", markerX + 8).attr("text-anchor", "start");
        }
        
        textNode.transition().duration(500).attr("opacity", 1);
      }

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

    return () => {
      d3.selectAll(".chart-tooltip-global").remove();
    };
  }, [plotType, chartData, histogramData, xAxisType, yAxisType, color, ministers, highlightBars, markerValue, markerLabel]);

  return <div ref={containerRef} className="w-full h-full relative"><svg ref={svgRef}></svg></div>;
}