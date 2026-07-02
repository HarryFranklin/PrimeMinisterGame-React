import React, { useRef, useEffect, useState, useId } from 'react';
import * as d3 from 'd3';
import { AxisVariable } from '../utils/types';

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
  // When set, each histogram band is tinted blue (positive) or amber (negative)
  // to match the colour of improved/worsened faces in the bottom chart.
  activePolicyRules?: any[] | null;
}

// ── Colours shared with IMPACT_COLORS in uiHelpers.ts ────────────────────────
// Keep these in sync with that file so bands, faces, legend, and View Details
// all use the same visual language.
const COLOUR_IMPROVE = '#3b82f6';  // blue-500
const COLOUR_STABLE  = '#d4d4d8';  // zinc-300
const COLOUR_WORSEN  = '#f59e0b';  // amber-500

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
  activePolicyRules = null,
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

  const markersJson = JSON.stringify(markers);
  const rulesJson   = JSON.stringify(activePolicyRules);

  useEffect(() => {
    if (!containerRef.current || !svgRef.current) return;

    const margin = { top: 20, right: 20, bottom: 65, left: 50 };
    const W = Math.max(0, containerRef.current.clientWidth  - margin.left - margin.right);
    const H = Math.max(0, containerRef.current.clientHeight - margin.top  - margin.bottom);
    const baseColor = color || '#ec4899';

    const svg = d3.select(svgRef.current)
      .attr('width',  W + margin.left + margin.right)
      .attr('height', H + margin.top  + margin.bottom);

    // Full clear only when the plot structure changes
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

    const styleAxis = (sel: any) => {
      sel.select('.domain').attr('stroke', '#d4d4d8').attr('stroke-width', 3);
      sel.selectAll('.tick line').attr('stroke', '#d4d4d8').attr('stroke-width', 2);
      sel.selectAll('text').attr('fill', '#52525b').style('font-size', '12px').style('font-weight', '600');
    };

    // ── 1-D HISTOGRAM ────────────────────────────────────────────────────────
    if (plotType === '1D' && histogramData) {
      const xScale = d3.scaleLinear().domain([0, 11]).range([0, W]);
      const rawBw  = W / 11;
      // 65% width per bar creates visible gaps between columns
      const bw     = rawBw * 0.65;
      const getX   = (name: string | number) => xScale(Number(name)) + (rawBw - bw) / 2;

      const yScale = d3.scaleLinear().domain([0, yAxisMax]).range([H, 0]);
      const defs   = svg.selectAll<SVGDefsElement, unknown>('defs').data([0]).join('defs');

      // ── Band highlights (colour matches face segment colours) ─────────────
      chart.select('.background-layer')
        .selectAll<SVGRectElement, number>('rect.band')
        .data(d3.range(11))
        .join('rect')
        .attr('class', 'band')
        .attr('x', d => xScale(d))
        .attr('y', 0)
        .attr('width', rawBw)
        .attr('height', H)
        .transition().duration(300)
        .attr('fill', (d: number) => {
          if (activePolicyRules && activePolicyRules.length > 0) {
            const affecting = activePolicyRules.filter((r: any) => {
              const min = r.minLS !== undefined ? r.minLS : 0;
              const max = r.maxLS !== undefined ? r.maxLS : 10;
              return d >= min && d <= max;
            });
            if (affecting.length === 0) return 'rgba(244,244,245,0.1)';
            const net = affecting.reduce((s: number, r: any) => s + r.impact, 0);
            // Use the same blue/amber as the face segments so the
            // top highlight and bottom faces are visually connected
            if (net > 0) return 'rgba(59,130,246,0.22)';   // COLOUR_IMPROVE tint
            if (net < 0) return 'rgba(245,158,11,0.22)';   // COLOUR_WORSEN tint
            return 'rgba(212,212,216,0.3)';
          }
          return d % 2 === 0 ? '#f4f4f5' : 'transparent';
        });

      // ── Col groups ───────────────────────────────────────────────────────
      dataLayer.selectAll('rect.bar').remove();
      const cols = dataLayer
        .selectAll<SVGGElement, HistogramEntry>('g.col')
        .data(histogramData, (d: any) => d.name)
        .join('g')
        .attr('class', 'col');

      // ── FACES (plain, one colour per LS value) ───────────────────────────
      if (visualStyle === 'faces') {
        const faceSize = calcFaceSize(bw, faceCols);
        const rectW    = faceCols * faceSize;
        const xOff     = (bw - rectW) / 2;

        // Remove segmented rects left over from previous renders
        cols.selectAll('rect.segment').remove();

        // Per-bar face patterns (colour = interpolated by LS value)
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
            e => e.append('rect').attr('class','face-bar').attr('y',H).attr('height',0),
            u => u,
            x => x.transition().duration(400).attr('y',H).attr('height',0).remove()
          )
          .attr('fill', (d: any) => `url(#face-${d.name}-${chartId})`)
          .transition().duration(1000).ease(d3.easeCubicOut)
          .attr('x',      (d: any) => getX(d.name) + xOff)
          .attr('width',  Math.max(0, rectW - 0.5))
          .attr('y', (d: any) => {
            const raw = H - yScale(d.count);
            let n = Math.floor(raw / faceSize);
            if (d.count > 0 && n === 0) n = 1;
            return H - n * faceSize;
          })
          .attr('height', (d: any) => {
            const raw = H - yScale(d.count);
            let n = Math.floor(raw / faceSize);
            if (d.count > 0 && n === 0) n = 1;
            return n * faceSize;
          });

      // ── FACES-SEGMENTED (three face types: improve / stable / worsen) ─────
      } else if (visualStyle === 'faces-segmented') {
        const faceSize = calcFaceSize(bw, faceCols);
        const rectW    = faceCols * faceSize;
        const xOff     = (bw - rectW) / 2;

        // Remove plain face-bars left over from previous renders
        cols.selectAll('rect.face-bar').remove();

        // One shared pattern per segment type
        defs.selectAll('pattern.face-pattern').remove();
        defs.selectAll<SVGPatternElement, typeof SEG_TYPES[number]>('pattern.seg-pattern')
          .data(SEG_TYPES, d => d.id)
          .join('pattern')
          .attr('class', 'seg-pattern')
          .attr('id',    d => `face-seg-${d.id}-${chartId}`)
          .attr('patternUnits', 'userSpaceOnUse')
          .attr('width',  faceSize)
          .attr('height', faceSize)
          .attr('x', 0).attr('y', H)
          .attr('viewBox', '0 0 100 100')
          .each(function(d) {
            const p = d3.select(this);
            p.selectAll('*').remove();
            const dark = (d3.color(d.color)?.darker(0.5) as any)?.formatHex() ?? '#000';
            p.append('circle').attr('cx',50).attr('cy',50).attr('r',48).attr('fill',d.color).attr('stroke',dark).attr('stroke-width',4);
            p.append('circle').attr('cx',34).attr('cy',40).attr('r',8).attr('fill','#1f2937');
            p.append('circle').attr('cx',66).attr('cy',40).attr('r',8).attr('fill','#1f2937');
            const mouthD = d.mouth === 'smile' ? 'M 28 65 Q 50 85 72 65'
                         : d.mouth === 'frown' ? 'M 28 75 Q 50 55 72 75'
                         :                        'M 28 65 Q 50 65 72 65';
            p.append('path').attr('d', mouthD).attr('stroke','#1f2937').attr('stroke-width',6).attr('fill','none').attr('stroke-linecap','round');
          });

        cols.selectAll<SVGRectElement, any>('rect.segment')
          .data((d: any) => {
            if (!d.segments || d.segments.length === 0) return [];
            let currentY = H;
            return d.segments.map((seg: any) => {
              const raw = H - yScale(seg.value);
              let n = Math.floor(raw / faceSize);
              if (seg.value > 0 && n === 0) n = 1;
              const segH = n * faceSize;
              currentY -= segH;
              return { ...seg, name: d.name, key: `${d.name}-${seg.label}`, yPos: currentY, h: segH };
            });
          }, (d: any) => d.key)
          .join(
            e => e.append('rect').attr('class','segment').attr('y',H).attr('height',0),
            u => u,
            x => x.transition().duration(400).attr('y',H).attr('height',0).remove()
          )
          .transition().duration(1000).ease(d3.easeCubicOut)
          .attr('x',      (d: any) => getX(d.name) + xOff)
          .attr('width',  Math.max(0, rectW - 0.5))
          .attr('y',      (d: any) => d.yPos)
          .attr('height', (d: any) => d.h)
          .attr('fill',   (d: any) => `url(#face-seg-${getSegmentId(d.label)}-${chartId})`);

      // ── SOLID bars ────────────────────────────────────────────────────────
      } else {
        cols.selectAll('rect.face-bar').remove();
        cols.selectAll<SVGRectElement, any>('rect.segment')
          .data((d: any) => {
            if (d.segments) {
              let cY = H;
              return d.segments.map((seg: any) => {
                const segH = H - yScale(seg.value);
                cY -= segH;
                return { ...seg, name: d.name, key: seg.label, yPos: cY, h: segH };
              });
            }
            return [{ key: 'single', name: d.name, color: baseColor, yPos: yScale(d.count), h: H - yScale(d.count) }];
          }, (d: any) => d.key)
          .join(
            e => e.append('rect').attr('class','segment').attr('y',H).attr('height',0).attr('fill',(d: any) => d.color),
            u => u,
            x => x.transition().duration(400).attr('y',H).attr('height',0).remove()
          )
          .transition().duration(1200).ease(d3.easeCubicOut)
          .attr('x',      (d: any) => getX(d.name))
          .attr('width',  bw)
          .attr('y',      (d: any) => d.yPos)
          .attr('height', (d: any) => d.h)
          .attr('fill',   (d: any) => d.color);
      }

      // ── Axes ─────────────────────────────────────────────────────────────
      chart.select('.axis-x')
        .transition().duration(dims.width ? 0 : 500)
        .call(d3.axisBottom(xScale).tickValues([0,1,2,3,4,5,6,7,8,9,10]) as any)
        .call(styleAxis);
      chart.select('.axis-x').selectAll('.tick text')
        .attr('transform', `translate(${rawBw / 2},0)`);

      chart.select('.axis-y').selectAll('.custom-y-label').remove();
      chart.select('.axis-y')
        .transition().duration(dims.width ? 0 : 500)
        .call(d3.axisLeft(yScale).ticks(5).tickFormat(() => '') as any)
        .call(styleAxis);
      chart.select('.axis-y').append('text')
        .attr('class','custom-y-label')
        .attr('text-anchor','middle')
        .attr('transform','rotate(-90)')
        .attr('y', -15).attr('x', -H / 2)
        .attr('fill','#3f3f46')
        .style('font-weight','bold').style('font-size','14px')
        .text('Number of People');

      chart.select('.label-x')
        .attr('x', W / 2).attr('y', H + 50)
        .attr('fill','#3f3f46')
        .style('text-anchor','middle').style('font-weight','bold')
        .text(getAxisLabel(xAxisType));

      // ── Marker lines ─────────────────────────────────────────────────────
      annoLayer.selectAll('*').remove();
      (markers ?? []).forEach((m, i) => {
        const mx    = xScale(Math.max(0, Math.min(10.9, m.value))) + rawBw / 2;
        const mc    = m.color ?? '#3f3f46';
        const yPos  = 12 + i * 16;
        annoLayer.append('line')
          .attr('x1',mx).attr('x2',mx).attr('y1',0).attr('y2',H)
          .attr('stroke',mc).attr('stroke-width',2)
          .attr('stroke-dasharray', m.dashed ? '6,4' : 'none')
          .style('opacity',0).transition().duration(300).style('opacity',1);
        annoLayer.append('text')
          .attr('y',yPos).attr('x',mx - 8)
          .attr('fill',mc).attr('font-size','12px').attr('font-weight','900')
          .attr('stroke','white').attr('stroke-width',4).style('paint-order','stroke')
          .attr('text-anchor','end').text(m.label)
          .style('opacity',0).transition().duration(300).style('opacity',1);
      });

    // ── 2-D SCATTER ──────────────────────────────────────────────────────────
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

  }, [plotType, chartData, histogramData, xAxisType, yAxisType, color,
      markersJson, rulesJson, visualStyle, dims, faceCols]);

  return <div ref={containerRef} className="w-full h-full relative"><svg ref={svgRef} /></div>;
}