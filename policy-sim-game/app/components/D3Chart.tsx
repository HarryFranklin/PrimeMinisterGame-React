import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { AxisVariable } from '../utils/types';

interface HistogramEntry {
  name: string | number;
  count: number;
  segments?: { label: string; value: number; color: string }[];
  breakdown: {
    wealth: Record<string, number>;
    age: Record<string, number>;
  };
}

interface D3ChartProps {
  plotType: '1D' | '2D';
  chartData: any[];
  histogramData?: HistogramEntry[]; 
  xAxisType: AxisVariable;
  yAxisType: AxisVariable;
  color?: string; 
  highlightBars?: number[];
  ministers?: any[]; 
  markerValue?: number;
  markerLabel?: string;
  onHoverMinisters?: (ministerNames: string[]) => void;
  isStacked?: boolean;
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
  plotType, chartData, histogramData, xAxisType, yAxisType, color, highlightBars, ministers, markerValue, markerLabel, onHoverMinisters, isStacked
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

      chart.select(".axis-x").transition().duration(500).call(d3.axisBottom(xScale) as any).call(styleAxis);
      chart.select(".axis-y").transition().duration(500).call(d3.axisLeft(yScale).ticks(5) as any).call(styleAxis);
      chart.select(".label-x").attr("x", width / 2).attr("y", height + 45).attr("fill", "#3f3f46").style("text-anchor", "middle").style("font-weight", "bold").text(getAxisLabel(xAxisType));

      dataLayer.selectAll("g.bar-group").remove();
      dataLayer.selectAll("rect.bar").remove();

      if (isStacked) {
        const groups = dataLayer.selectAll("g.bar-group").data(histogramData, (d: any) => d.name);
        const groupsEnter = groups.enter().append("g")
          .attr("class", "bar-group")
          .attr("transform", d => `translate(${xScale(d.name.toString()) || 0}, 0)`);

        groupsEnter.each(function(d) {
          let cumulativeValue = 0;
          d3.select(this).selectAll("rect")
            .data(d.segments || [])
            .enter().append("rect")
            .attr("width", xScale.bandwidth())
            .attr("x", 0)
            .attr("y", (seg: any) => {
              const yPos = yScale(cumulativeValue + seg.value);
              cumulativeValue += seg.value;
              return yPos;
            })
            .attr("height", (seg: any) => height - yScale(seg.value))
            .attr("fill", (seg: any) => seg.color)
            .attr("stroke", (seg: any) => seg.color)
            .attr("stroke-width", 0.5);
        });
      } else {
        dataLayer.selectAll("rect.bar").data(histogramData, (d: any) => d.name)
          .join("rect")
          .attr("class", "bar")
          .attr("x", d => xScale(d.name.toString()) || 0)
          .attr("y", d => yScale(d.count))
          .attr("width", xScale.bandwidth())
          .attr("height", d => height - yScale(d.count))
          .attr("fill", chartColor)
          .attr("rx", 4);
      }

      dataLayer.selectAll("rect.hit-area").remove();
      dataLayer.selectAll("rect.hit-area").data(histogramData, (d: any) => d.name)
        .join("rect")
        .attr("class", "hit-area")
        .attr("x", d => xScale(d.name.toString()) || 0)
        .attr("y", 0)
        .attr("width", xScale.bandwidth())
        .attr("height", height)
        .style("fill", "transparent")
        .style("cursor", "crosshair")
        .on("mouseenter", (event, d: HistogramEntry) => {
          if (d.count === 0) return;
          
          let tooltip = d3.select("body").select<HTMLDivElement>(".chart-tooltip-global");
          if (tooltip.empty()) {
            tooltip = d3.select("body").append("div")
              .attr("class", "chart-tooltip-global fixed pointer-events-none z-[9999] bg-white border border-zinc-200 shadow-xl rounded-xl p-4 min-w-[260px] text-zinc-800 transition-opacity duration-150");
          }

          let stakeholderHtml = "";
          if (onHoverMinisters) onHoverMinisters([]); 

          if (ministers && ministers.length > 0) {
            const nationalShares = { Poor: 0.21, Middle: 0.69, Wealthy: 0.10, Youth: 0.186, Adult: 0.581, Elderly: 0.233 };
            const wealthTraits = { Poor: (d.breakdown.wealth.Poor || 0) / 100, Middle: (d.breakdown.wealth.Middle || 0) / 100, Wealthy: (d.breakdown.wealth.Wealthy || 0) / 100 };
            const ageTraits = { Youth: (d.breakdown.age.Youth || 0) / 100, Adult: (d.breakdown.age.Adult || 0) / 100, Elderly: (d.breakdown.age.Elderly || 0) / 100 };

            const getTopTrait = (traits: Record<string, number>) => {
              let maxTrait = null; let maxScore = 0;
              Object.entries(traits).forEach(([t, share]) => {
                const lq = share / (nationalShares as any)[t];
                if (share * lq > maxScore) { maxScore = share * lq; maxTrait = t; }
              });
              return maxTrait;
            };

            const topWealth = getTopTrait(wealthTraits);
            const topAge = getTopTrait(ageTraits);
            const ministerMap: any = { Poor: 'Welfare Secretary', Middle: 'Home Secretary', Wealthy: 'Chancellor', Youth: 'Education Secretary', Adult: 'Business Secretary', Elderly: 'Pensions Secretary' };
            
            const hoveredMins: string[] = [];
            const blocks = [topWealth, topAge].map(trait => {
              const min = ministers.find(m => m.name === ministerMap[trait || '']);
              if (!min) return "";
              hoveredMins.push(min.name);
              return `
                <div class="bg-pink-50 border border-pink-100 p-2.5 rounded-lg mb-2 flex justify-between items-center">
                  <div class="flex flex-col">
                    <span class="text-xs font-black text-zinc-800 uppercase">${trait}</span>
                    <span class="text-[11px] text-zinc-500 mt-0.5">${min.name}</span>
                  </div>
                  <div class="w-7 h-7 rounded-full flex items-center justify-center ${min.status === 'happy' ? 'bg-emerald-500' : min.status === 'angry' ? 'bg-rose-500' : 'bg-amber-400'} border-2 border-white shadow-sm text-xs">
                    ${min.status === 'happy' ? '😊' : min.status === 'angry' ? '😠' : '😐'}
                  </div>
                </div>`;
            }).join('');

            if (onHoverMinisters) onHoverMinisters(hoveredMins);
            stakeholderHtml = `<div class="mt-4 pt-3 border-t border-zinc-100"><p class="text-[9px] font-bold uppercase text-pink-500 mb-2">Key Stakeholders</p>${blocks}</div>`;
          }

          tooltip.style("opacity", 1).html(`
            <div class="space-y-4">
              <div class="border-b border-zinc-100 pb-2">
                <p class="text-[10px] font-black uppercase tracking-widest text-zinc-400">LS Score ${d.name}</p>
                <p class="text-sm font-bold text-zinc-600">${d.count} Residents</p>
              </div>
              <div class="space-y-3">
                ${['wealth', 'age'].map(type => {
                  const breakdown = d.breakdown[type as 'wealth' | 'age'];
                  const entries = Object.entries(breakdown);
                  return `
                  <div>
                    <div class="flex justify-between items-end mb-1">
                      <p class="text-[9px] font-bold uppercase text-zinc-400">${type} Breakdown</p>
                      <div class="flex gap-2">
                        ${entries.filter(([_, v]) => (v as number) > 0).map(([k, v]) => {
                          const color = type === 'wealth' ? (k === 'Poor' ? 'bg-rose-500' : k === 'Middle' ? 'bg-blue-500' : 'bg-emerald-500') : (k === 'Youth' ? 'bg-amber-400' : k === 'Adult' ? 'bg-indigo-500' : 'bg-teal-500');
                          // Explicitly set text-[9px] and font-bold on the span so it strictly matches the breakdown label
                          return `<span class="flex items-center gap-1 text-[9px] font-bold text-zinc-500"><span class="w-1.5 h-1.5 rounded-full ${color}"></span>${Math.round(v as number)}%</span>`;
                        }).join('')}
                      </div>
                    </div>
                    <div class="flex h-1.5 w-full rounded-full overflow-hidden bg-zinc-100">
                      ${entries.map(([k, v]) => `<div style="width: ${v}%" class="${type === 'wealth' ? (k === 'Poor' ? 'bg-rose-500' : k === 'Middle' ? 'bg-blue-500' : 'bg-emerald-500') : (k === 'Youth' ? 'bg-amber-400' : k === 'Adult' ? 'bg-indigo-500' : 'bg-teal-500')}"></div>`).join('')}
                    </div>
                  </div>`
                }).join('')}
              </div>
              ${stakeholderHtml}
            </div>`);
        })
        .on("mousemove", (event) => {
          const tooltip = d3.select(".chart-tooltip-global");
          const node = tooltip.node() as HTMLElement;
          if (!node) return;

          const tooltipWidth = node.offsetWidth;
          const tooltipHeight = node.offsetHeight;
          const padding = 20;

          let x = event.clientX + padding;
          let y = event.clientY - padding;

          if (x + tooltipWidth > window.innerWidth) x = event.clientX - tooltipWidth - padding;
          if (y + tooltipHeight > window.innerHeight) y = window.innerHeight - tooltipHeight - 10;
          if (y < 10) y = 10;

          tooltip.style("left", `${x}px`).style("top", `${y}px`);
        })
        .on("mouseleave", () => {
          d3.select(".chart-tooltip-global").style("opacity", 0);
          if (onHoverMinisters) onHoverMinisters([]);
        });

      annotationLayer.selectAll("*").remove();
      if (markerValue !== undefined && markerLabel) {
        const continuousXScale = d3.scaleLinear().domain([0, 10]).range([(xScale("0") || 0) + xScale.bandwidth() / 2, (xScale("10") || 0) + xScale.bandwidth() / 2]);
        const markerX = continuousXScale(Math.max(0, Math.min(10, markerValue)));
        annotationLayer.append("line").attr("x1", markerX).attr("x2", markerX).attr("y1", 0).attr("y2", height).attr("stroke", "#3f3f46").attr("stroke-width", 2).attr("stroke-dasharray", "6,4");
        annotationLayer.append("text").attr("y", 20).attr("x", markerValue > 8 ? markerX - 8 : markerX + 8).attr("fill", "#18181b").attr("font-size", "12px").attr("font-weight", "900").attr("stroke", "white").attr("stroke-width", 4).style("paint-order", "stroke").attr("text-anchor", markerValue > 8 ? "end" : "start").text(`${markerLabel}: ${markerValue.toFixed(2)}`);
      }
    } else if (plotType === '2D') {
      annotationLayer.selectAll("*").remove(); 
      const xScale = d3.scaleLinear().domain(getAxisDomain(xAxisType)).range([0, width]);
      const yScale = d3.scaleLinear().domain(getAxisDomain(yAxisType)).range([height, 0]);
      chart.select(".axis-x").transition().duration(500).call(d3.axisBottom(xScale).tickValues(getTicks(xAxisType)) as any).call(styleAxis);
      chart.select(".axis-y").transition().duration(500).call(d3.axisLeft(yScale).tickValues(getTicks(yAxisType)) as any).call(styleAxis);
      dataLayer.selectAll("circle.dot").data(chartData, (d: any) => d.id).join("circle").attr("class", "dot").transition().duration(500).attr("cx", d => xScale(d.x)).attr("cy", d => yScale(d.y)).attr("r", 5).style("fill", chartColor).style("opacity", 0.7);
    }
    return () => { d3.selectAll(".chart-tooltip-global").remove(); };
  }, [plotType, chartData, histogramData, xAxisType, yAxisType, color, ministers, highlightBars, markerValue, markerLabel, isStacked]);

  return <div ref={containerRef} className="w-full h-full relative"><svg ref={svgRef}></svg></div>;
}