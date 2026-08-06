import React, { useRef, useEffect, useState, useId } from 'react';
import * as d3 from 'd3';
import { AxisVariable } from '../utils/types';
import { IMPACT_COLORS } from '../utils/uiHelpers';

export interface ChartMarker {
  value: number;
  label: string;
  color?: string;
  dashed?: boolean;
}

interface HistogramEntry {
  name: string | number;
  count: number;
  segments?: { label: string; value: number; color: string }[];
}

interface D3ChartProps {
  plotType: '1D' | '2D';
  chartData: any[];
  histogramData?: HistogramEntry[];
  xAxisType: AxisVariable;
  yAxisType: AxisVariable;
  color?: string;
  markers?: ChartMarker[];
  visualStyle?: 'solid' | 'faces' | 'faces-segmented';
  yAxisMax?: number;
  faceCols?: number;
  activePolicyRules?: any[] | null;
  theme?: 'light' | 'dark';
}

const COLOUR_IMPROVE = IMPACT_COLORS['Will improve'];
const COLOUR_STABLE  = IMPACT_COLORS['Will be stable'];
const COLOUR_WORSEN  = IMPACT_COLORS['Will worsen'];

const getSegmentId = (label: string): 'improve' | 'stable' | 'worsen' => {
  if (label.toLowerCase().includes('improve') || label.toLowerCase().includes('improved')) return 'improve';
  if (label.toLowerCase().includes('worsen') || label.toLowerCase().includes('worsened')) return 'worsen';
  return 'stable';
};

const SEG_TYPES = [
  { id: 'improve', color: COLOUR_IMPROVE, mouth: 'smile' },
  { id: 'stable',  color: COLOUR_STABLE,  mouth: 'flat'  },
  { id: 'worsen',  color: COLOUR_WORSEN,  mouth: 'frown' },
] as const;

const getAxisDomain = (a: AxisVariable): [number, number] => [0, 10];
const getTicks = (a: AxisVariable) => [0, 2.5, 5, 7.5, 10];

const getAxisLabel = (a: AxisVariable): string => {
  switch (a) {
    case AxisVariable.LifeSatisfaction: return 'Life Satisfaction';
    case AxisVariable.PersonalUtility:  return 'Personal Utility';
    case AxisVariable.SocietalFairness: return 'Societal Fairness';
    default: return 'Value';
  }
};

function calcFaceSize(bw: number, cols: number) {
  return bw / Math.max(1, cols);
}

export default function D3Chart({
  plotType, chartData, histogramData, xAxisType, yAxisType, color,
  markers, yAxisMax = 80, visualStyle = 'faces', faceCols = 2,
  activePolicyRules = null, theme = 'light',
}: D3ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef       = useRef<SVGSVGElement>(null);
  const prevPlot     = useRef<string | null>(null);
  const prevX        = useRef<AxisVariable | null>(null);
  const prevY        = useRef<AxisVariable | null>(null);
  const chartId      = useId().replace(/:/g, '');
  const [dims, setDims] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([e]) =>
      setDims({ width: e.contentRect.width, height: e.contentRect.height })
    );
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Guarantee tooltips don't leak into the DOM when charts unmount
  useEffect(() => {
    return () => {
      d3.select('body').select(`#d3-tooltip-${chartId}`).remove();
    };
  }, [chartId]);

  const markersJson = JSON.stringify(markers);
  const rulesJson   = JSON.stringify(activePolicyRules);

  useEffect(() => {
    if (!containerRef.current || !svgRef.current) return;

    const margin = { top: 25, right: 15, bottom: 40, left: 45 };
    const W = Math.max(0, containerRef.current.clientWidth  - margin.left - margin.right);
    const H = Math.max(0, containerRef.current.clientHeight - margin.top  - margin.bottom);
    const baseColor = color || '#ec4899';

    const svg = d3.select(svgRef.current)
      .attr('width',  W + margin.left + margin.right)
      .attr('height', H + margin.top  + margin.bottom);

    if (prevPlot.current !== plotType || prevX.current !== xAxisType || prevY.current !== yAxisType) {
      svg.selectAll('*').remove();
      const g = svg.append('g').attr('class', 'main-group')
        .attr('transform', `translate(${margin.left},${margin.top})`);
      g.append('g').attr('class', 'background-layer');
      g.append('g').attr('class', 'axis-x');
      g.append('g').attr('class', 'axis-y');
      g.append('text').attr('class', 'label-x');
      g.append('g').attr('class', 'data-layer');
      g.append('g').attr('class', 'annotation-layer');
      prevPlot.current = plotType;
      prevX.current = xAxisType;
      prevY.current = yAxisType;
    }

    const chart       = svg.select<SVGGElement>('.main-group');
    const dataLayer   = chart.select<SVGGElement>('.data-layer');
    const annoLayer   = chart.select<SVGGElement>('.annotation-layer');

    chart.select('.axis-x').attr('transform', `translate(0,${H})`);

    const axisFg  = theme === 'dark' ? '#d4d4d8' : '#d4d4d8';
    const tickFg  = theme === 'dark' ? '#f4f4f5' : '#52525b';
    const labelFg = theme === 'dark' ? '#e4e4e7' : '#3f3f46';
    const styleAxis = (sel: any) => {
      sel.select('.domain').attr('stroke', axisFg).attr('stroke-width', 3);
      sel.selectAll('.tick line').attr('stroke', axisFg).attr('stroke-width', 2);
      sel.selectAll('text').attr('fill', tickFg).style('font-size', '12px').style('font-weight', '600');
    };

    if (plotType === '1D' && histogramData) {
      // Shifted domain aligns absolute integer ticks precisely beneath columns
      const xScale = d3.scaleLinear().domain([-0.5, 10.5]).range([0, W]);
      const rawBw  = W / 11;
      const bw     = rawBw * 0.65;
      const getX   = (name: string | number) => xScale(Number(name)) - bw / 2;

      const yScale = d3.scaleLinear().domain([0, yAxisMax]).range([H, 0]);
      const defs   = svg.selectAll<SVGDefsElement, unknown>('defs').data([0]).join('defs');

      // Setup universal tooltip attached to the BODY to escape overflow clipping
      let tooltip = d3.select('body').select<HTMLDivElement>(`#d3-tooltip-${chartId}`);
      if (tooltip.empty()) {
        tooltip = d3.select('body')
          .append('div')
          .attr('id', `d3-tooltip-${chartId}`)
          .style('position', 'absolute')
          .style('pointer-events', 'none')
          .style('opacity', 0)
          .style('background', 'rgba(24, 24, 27, 0.95)')
          .style('color', 'white')
          .style('padding', '6px 10px')
          .style('border-radius', '6px')
          .style('font-size', '12px')
          .style('font-weight', '600')
          .style('z-index', 999999) // Extremely high to ensure it pops over modals
          .style('box-shadow', '0 4px 6px -1px rgba(0,0,0,0.1)')
          .style('transform', 'translate(-50%, -120%)')
          .style('white-space', 'nowrap')
          .style('transition', 'opacity 0.15s ease-out, left 0.1s, top 0.1s');
      }

      chart.select('.background-layer')
        .selectAll<SVGRectElement, number>('rect.band')
        .data(d3.range(11))
        .join('rect')
        .attr('class', 'band')
        .attr('x', d => xScale(d) - rawBw / 2)
        .attr('y', 0)
        .attr('width', rawBw)
        .attr('height', H)
        .style("transition", "fill 0.3s ease-in-out")
        .attr('fill', (d: number) => {
          if (activePolicyRules && activePolicyRules.length > 0) {
            const affecting = activePolicyRules.filter((r: any) => {
              const min = r.minLS !== undefined ? r.minLS : 0;
              const max = r.maxLS !== undefined ? r.maxLS : 10;
              return d >= min && d <= max;
            });
            if (affecting.length === 0) return 'rgba(244,244,245,0.1)';
            const net = affecting.reduce((s: number, r: any) => s + r.impact, 0);
            if (net > 0) return 'rgba(59, 130, 246, 0.22)';
            if (net < 0) return 'rgba(245, 158, 11, 0.22)';
            return 'rgba(212,212,216,0.3)';
          }
          return d % 2 === 0 ? (theme === 'dark' ? 'rgba(255,255,255,0.04)' : '#f4f4f5') : 'transparent';
        });

      dataLayer.selectAll('rect.bar').remove();
      const cols = dataLayer
        .selectAll<SVGGElement, HistogramEntry>('g.col')
        .data(histogramData, (d: any) => d.name)
        .join('g')
        .attr('class', 'col');

      // Bind Tooltip interactions to columns
      cols.style('cursor', 'crosshair')
        .on('mouseenter', (event, d: any) => {
            const clampedCount = Math.min(d.count, yAxisMax);
            const rect = svgRef.current?.getBoundingClientRect();
            if (!rect) return;

            // Map internal SVG coordinate space to absolute body coordinates
            const xPos = rect.left + window.scrollX + margin.left + xScale(Number(d.name));
            const yPos = rect.top + window.scrollY + margin.top + yScale(clampedCount);

            tooltip.style('opacity', 1)
                   .style('left', `${xPos}px`)
                   .style('top', `${yPos}px`)
                   .html(`<span style="color:${baseColor}">LS ${d.name}:</span> ~${d.count} million people`);
        })
        .on('mouseleave', () => {
            tooltip.style('opacity', 0);
        });

      if (visualStyle === 'faces') {
        const faceSize = calcFaceSize(bw, faceCols);
        const rectW    = faceCols * faceSize;
        const xOff     = (bw - rectW) / 2;

        cols.selectAll('rect.segment').remove();
        defs.selectAll('pattern.seg-pattern').remove();
        
        defs.selectAll<SVGPatternElement, HistogramEntry>('pattern.face-pattern')
          .data(histogramData, (d: any) => d.name)
          .join('pattern')
          .attr('class', 'face-pattern')
          .attr('id',    (d: any) => `face-${d.name}-${chartId}`)
          .attr('patternUnits', 'userSpaceOnUse')
          .attr('width',  faceSize)
          .attr('height', faceSize)
          .attr('x',      (d: any) => getX(d.name) + xOff)
          .attr('y',      H)
          .attr('viewBox', '0 0 100 100')
          .each(function(d: any) {
            const p = d3.select(this);
            p.selectAll('*').remove();
            const score = Number(d.name);
            const fill  = d3.interpolateRdYlGn(score / 10);
            const dark  = (d3.color(fill)?.darker(0.5) as any)?.formatHex() ?? '#000';
            const ctrlY = 45 + (score / 10) * 40;
            p.append('circle').attr('cx',50).attr('cy',50).attr('r',48).attr('fill',fill).attr('stroke',dark).attr('stroke-width',4);
            p.append('circle').attr('cx',34).attr('cy',40).attr('r',8).attr('fill','#1f2937');
            p.append('circle').attr('cx',66).attr('cy',40).attr('r',8).attr('fill','#1f2937');
            p.append('path').attr('d',`M 28 65 Q 50 ${ctrlY} 72 65`).attr('stroke','#1f2937').attr('stroke-width',6).attr('fill','none').attr('stroke-linecap','round');
          });

        cols.selectAll<SVGRectElement, HistogramEntry>('rect.face-bar')
          .data((d: any) => [d])
          .join(
            (enter: any) => enter.append('rect').attr('class','face-bar').attr('y', H).attr('height', 0),
            (update: any) => update,
            (exit: any) => exit.transition().duration(400).attr('y', H).attr('height', 0).remove()
          )
          .attr('x', (d: any) => getX(d.name) + xOff)
          .attr('width', Math.max(0, rectW - 0.5))
          .attr('fill', (d: any) => `url(#face-${d.name}-${chartId})`)
          .transition().duration(1000).ease(d3.easeCubicOut)
          .attr('y', (d: any) => {
            const clampedCount = Math.min(d.count, yAxisMax);
            const raw = H - yScale(clampedCount);
            // Snap to the nearest 0.5 of a face
            let n = Math.round((raw / faceSize) * 2) / 2;
            if (clampedCount > 0 && n === 0) n = 0.5;
            return H - n * faceSize;
          })
          .attr('height', (d: any) => {
            const clampedCount = Math.min(d.count, yAxisMax);
            const raw = H - yScale(clampedCount);
            // Snap to the nearest 0.5 of a face
            let n = Math.round((raw / faceSize) * 2) / 2;
            if (clampedCount > 0 && n === 0) n = 0.5;
            return n * faceSize;
          });

      } else if (visualStyle === 'faces-segmented') {
        const faceSize = calcFaceSize(bw, faceCols);
        const rectW    = faceCols * faceSize;
        const xOff     = (bw - rectW) / 2;

        cols.selectAll('rect.face-bar').remove();

        const segPatternData: any[] = [];
        histogramData.forEach((d: any) => {
          SEG_TYPES.forEach(st => {
            segPatternData.push({ colName: d.name, ...st });
          });
        });

        defs.selectAll('pattern.face-pattern').remove();
        defs.selectAll<SVGPatternElement, any>('pattern.seg-pattern')
          .data(segPatternData, (d: any) => `${d.colName}-${d.id}`)
          .join('pattern')
          .attr('class', 'seg-pattern')
          .attr('id',    (d: any) => `face-seg-${d.colName}-${d.id}-${chartId}`)
          .attr('patternUnits', 'userSpaceOnUse')
          .attr('width',  faceSize)
          .attr('height', faceSize)
          .attr('x', (d: any) => getX(d.colName) + xOff) 
          .attr('y', H)
          .attr('viewBox', '0 0 100 100')
          .each(function(d: any) {
            const p = d3.select(this);
            p.selectAll('*').remove();
            const dark = (d3.color(d.color)?.darker(0.5) as any)?.formatHex() ?? '#000';
            p.append('circle').attr('cx',50).attr('cy',50).attr('r',48).attr('fill',d.color).attr('stroke',dark).attr('stroke-width',4);
            p.append('circle').attr('cx',34).attr('cy',40).attr('r',8).attr('fill','#1f2937');
            p.append('circle').attr('cx',66).attr('cy',40).attr('r',8).attr('fill','#1f2937');
            const mouthD = d.mouth === 'smile' ? 'M 28 65 Q 50 85 72 65' : d.mouth === 'frown' ? 'M 28 75 Q 50 55 72 75' : 'M 28 65 Q 50 65 72 65';
            p.append('path').attr('d', mouthD).attr('stroke','#1f2937').attr('stroke-width',6).attr('fill','none').attr('stroke-linecap','round');
          });

        cols.selectAll<SVGRectElement, any>('rect.segment')
          .data((d: any) => {
            if (!d.segments || d.segments.length === 0) return [];
            let currentY = H;
            let cumulativeVal = 0;
            let prevCumulativeN = 0;
            const clampRatio = d.count > yAxisMax ? yAxisMax / d.count : 1;
            
            return d.segments.map((seg: any) => {
              cumulativeVal += (seg.value * clampRatio);
              const cumulativeRaw = H - yScale(cumulativeVal);
              let cumulativeN = Math.round((cumulativeRaw / faceSize) * 2) / 2;
              
              if (cumulativeVal > 0 && cumulativeN === 0) cumulativeN = 0.5;
              
              const segN = cumulativeN - prevCumulativeN;
              const segH = segN * faceSize;
              
              currentY -= segH;
              prevCumulativeN = cumulativeN;
              
              return { ...seg, name: d.name, key: `${d.name}-${seg.label}`, yPos: currentY, h: segH };
            });
          }, (d: any) => d.key)
          .join(
            (enter: any) => enter.append('rect').attr('class','segment').attr('y', H).attr('height', 0),
            (update: any) => update,
            (exit: any) => exit.transition().duration(400).attr('y', H).attr('height', 0).remove()
          )
          .attr('x', (d: any) => getX(d.name) + xOff)
          .attr('width', Math.max(0, rectW - 0.5))
          .attr('fill', (d: any) => `url(#face-seg-${d.name}-${getSegmentId(d.key)}-${chartId})`)
          .transition().duration(1000).ease(d3.easeCubicOut)
          .attr('y', (d: any) => d.yPos)
          .attr('height', (d: any) => d.h);

      } else {
        cols.selectAll('rect.face-bar').remove();
        cols.selectAll<SVGRectElement, any>('rect.segment')
          .data((d: any) => {
            if (d.segments) {
              let cY = H;
              const clampRatio = d.count > yAxisMax ? yAxisMax / d.count : 1;
              return d.segments.map((seg: any) => {
                const segVal = seg.value * clampRatio;
                const segH = H - yScale(segVal);
                cY -= segH;
                return { ...seg, name: d.name, key: seg.label, yPos: cY, h: segH };
              });
            }
            const clampedCount = Math.min(d.count, yAxisMax);
            return [{ key: 'single', name: d.name, color: baseColor, yPos: yScale(clampedCount), h: H - yScale(clampedCount) }];
          }, (d: any) => d.key)
          .join(
            (enter: any) => enter.append('rect').attr('class','segment').attr('y', H).attr('height', 0),
            (update: any) => update,
            (exit: any) => exit.transition().duration(400).attr('y', H).attr('height', 0).remove()
          )
          .attr('x', (d: any) => getX(d.name))
          .attr('width', bw)
          .attr('fill',(d: any) => d.color)
          .transition().duration(1200).ease(d3.easeCubicOut)
          .attr('y', (d: any) => d.yPos)
          .attr('height', (d: any) => d.h);
      }

      // Add Overflow Plus Indicators
      cols.selectAll('text.overflow-plus').remove();
      cols.append('text')
        .attr('class', 'overflow-plus')
        .attr('x', (d: any) => {
          const rectW = visualStyle.includes('faces') ? faceCols * calcFaceSize(bw, faceCols) : bw;
          const xOff = visualStyle.includes('faces') ? (bw - rectW) / 2 : 0;
          return getX(d.name) + xOff + rectW / 2;
        })
        .attr('y', yScale(yAxisMax) - 6)
        .attr('text-anchor', 'middle')
        .attr('fill', baseColor)
        .attr('font-weight', '900')
        .attr('font-size', '16px')
        .text((d: any) => d.count > yAxisMax ? '+' : '');

      // Ticks are no longer translated so they land precisely in the center of the columns
      chart.select('.axis-x')
        .transition().duration(dims.width ? 0 : 500)
        .call(d3.axisBottom(xScale).tickValues([0,1,2,3,4,5,6,7,8,9,10]) as any)
        .call(styleAxis);

      chart.select('.axis-y').selectAll('.custom-y-label').remove();
      chart.select('.axis-y')
        .transition().duration(dims.width ? 0 : 500)
        .call(d3.axisLeft(yScale).ticks(5).tickFormat(() => '') as any)
        .call(styleAxis);

      // Re-add the Axis Labels
      chart.select('.axis-y').append('text')
        .attr('class','custom-y-label')
        .attr('text-anchor','middle')
        .attr('transform','rotate(-90)')
        .attr('y', -15).attr('x', -H / 2)
        .attr('fill', labelFg)
        .style('font-weight','bold').style('font-size','14px')
        .text('Number of People');

      chart.select('.label-x')
        .attr('x', W / 2).attr('y', H + 38)
        .attr('fill', labelFg)
        .style('text-anchor','middle').style('font-weight','bold')
        .text(getAxisLabel(xAxisType));

      annoLayer.selectAll('*').remove();
      (markers ?? []).forEach((m, i) => {
        // Markers now evaluate mathematically directly onto the grid
        const mx    = xScale(Math.max(-0.5, Math.min(10.5, m.value)));
        const mc    = m.color ?? '#3f3f46';
        const yPos  = -8 + i * 16;
        
        annoLayer.append('line')
          .attr('x1',mx).attr('x2',mx).attr('y1',0).attr('y2',H)
          .attr('stroke',mc).attr('stroke-width',2)
          .attr('stroke-dasharray', m.dashed ? '6,4' : 'none')
          .style('opacity',0).transition().duration(300).style('opacity',1);
        annoLayer.append('text')
          .attr('y',yPos).attr('x',mx - 6)
          .attr('fill',mc).attr('font-size','12px').attr('font-weight','900')
          .attr('stroke','white').attr('stroke-width',4).style('paint-order','stroke')
          .attr('text-anchor','end').text(m.label)
          .style('opacity',0).transition().duration(300).style('opacity',1);
      });
    } else if (plotType === '2D') {
      annoLayer.selectAll('*').remove();
      const xScale = d3.scaleLinear().domain(getAxisDomain(xAxisType)).range([0, W]);
      const yScale = d3.scaleLinear().domain(getAxisDomain(yAxisType)).range([H, 0]);
      chart.select('.axis-x').transition().duration(dims.width ? 0 : 500)
        .call(d3.axisBottom(xScale).tickValues(getTicks(xAxisType)) as any).call(styleAxis);
      chart.select('.axis-y').transition().duration(dims.width ? 0 : 500)
        .call(d3.axisLeft(yScale).tickValues(getTicks(yAxisType)) as any).call(styleAxis);
      dataLayer.selectAll<SVGCircleElement, any>('circle.dot')
        .data(chartData, (d: any) => d.id)
        .join('circle').attr('class','dot')
        .transition().duration(500)
        .attr('cx', (d: any) => xScale(d.x))
        .attr('cy', (d: any) => yScale(d.y))
        .attr('r', 5).style('fill', baseColor).style('opacity', 0.7);
    }

  }, [plotType, chartData, histogramData, xAxisType, yAxisType, color, markersJson, rulesJson, visualStyle, dims, faceCols, theme]);

  return <div ref={containerRef} className="w-full h-full relative"><svg ref={svgRef} /></div>;
}