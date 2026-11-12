import React, { useRef, useEffect, useState, useId } from 'react';
import * as d3 from 'd3';
import { AxisVariable } from '../utils/types';
import { IMPACT_COLORS } from '../utils/uiHelpers';
import { track } from '../client/telemetry';

/** Bin hovers shorter than this are ignored (mouse passing through). */
const BIN_HOVER_MIN_MS = 250;

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
  /** Ghost only: people leaving this column for a higher / lower one. */
  movedUp?: number;
  movedDown?: number;
}

interface D3ChartProps {
  plotType: '1D' | '2D';
  chartData: any[];
  histogramData?: HistogramEntry[];
  xAxisType: AxisVariable;
  yAxisType: AxisVariable;
  color?: string;
  markers?: ChartMarker[];
  /** 'blocks': square face blocks stacked two to a row like building blocks, each a fixed
  * number of citizens (see perBlock), with an odd block sitting centred on top. */
  visualStyle?: 'solid' | 'faces' | 'faces-segmented' | 'blocks';
  /** Blocks only: citizens per block. Left out, the smallest of 1, 2, 5, 10, 20 that fits. */
  perBlock?: number;
  /** Blocks only: ring the lowest citizen's block (the Rawlsian floor). */
  highlightFloor?: boolean;
  yAxisMax?: number;
  faceCols?: number;
  activePolicyRules?: any[] | null;
  theme?: 'light' | 'dark';
  /** If set, hovering a histogram bin (≥250 ms) is tracked as chart_bin_hovered with this chart id. */
  hoverTrackId?: string;
  /** Preview: the counts if a policy were signed. Drawn over the faces – people who would
   * move away fade out (dotted), people who would arrive appear as dashed faces – with the
   * change above each column. Faces style only. */
  ghostHistogramData?: HistogramEntry[] | null;
  /** Alternate shaded column bands behind the faces (off on the desk's graph paper). */
  bands?: boolean;
  /** Where marker names go: 'top' (default: above the plot) or 'axis' (tags under the
   * x-axis, so they never clash with the columns or the preview counts). */
  markerLabels?: 'top' | 'axis';
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

const BLOCK_UNITS = [1, 2, 5, 10, 20];
const BLOCK_GAP = 2;

/** Blocks needed for a column: at least one if anyone is there, so a lone citizen never vanishes. */
const blocksFor = (count: number, unit: number) => (count > 0 ? Math.max(1, Math.round(count / unit)) : 0);

/** Where block k of a tower of n sits: two to a row from the bottom; an odd top block is centred. */
function blockPos(k: number, n: number, s: number) {
  const row = Math.floor(k / 2);
  const alone = k === n - 1 && n % 2 === 1;
  return { row, x: alone ? (s + BLOCK_GAP) / 2 : (k % 2) * (s + BLOCK_GAP) };
}

/** A square face: colour from red (LS 0) to green (LS 10); frown, flat or smile. */
function drawBlockFace(g: d3.Selection<SVGGElement, any, any, any>, ls: number, s: number) {
  const fill = d3.interpolateRdYlGn(ls / 10);
  const ink = ls <= 1 || ls >= 9 ? '#ffffff' : '#1c1917';
  g.append('rect').attr('class', 'blk-body').attr('width', s).attr('height', s).attr('rx', Math.max(2, s * 0.16))
    .attr('fill', fill).attr('stroke', 'rgba(0,0,0,.22)').attr('stroke-width', 1);
  const r = Math.max(1, s * 0.075);
  g.append('circle').attr('cx', s * 0.31).attr('cy', s * 0.36).attr('r', r).attr('fill', ink);
  g.append('circle').attr('cx', s * 0.69).attr('cy', s * 0.36).attr('r', r).attr('fill', ink);
  const y = s * 0.64, x1 = s * 0.3, x2 = s * 0.7, bend = s * 0.12;
  const d = ls <= 3 ? `M ${x1} ${y + bend * 0.6} Q ${s / 2} ${y - bend} ${x2} ${y + bend * 0.6}`
    : ls <= 6 ? `M ${x1} ${y} L ${x2} ${y}`
    : `M ${x1} ${y - bend * 0.4} Q ${s / 2} ${y + bend * 1.2} ${x2} ${y - bend * 0.4}`;
  g.append('path').attr('d', d).attr('fill', 'none').attr('stroke', ink)
    .attr('stroke-width', Math.max(1, s * 0.09)).attr('stroke-linecap', 'round');
}

function calcFaceSize(bw: number, cols: number) {
  return bw / Math.max(1, cols);
}

export default function D3Chart({
  plotType, chartData, histogramData, xAxisType, yAxisType, color,
  markers, yAxisMax = 80, visualStyle = 'faces', faceCols = 2,
  activePolicyRules = null, theme = 'light', hoverTrackId, ghostHistogramData = null, bands = true, markerLabels = 'top', perBlock, highlightFloor = false,
}: D3ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const binHover = useRef<{ bin: string | number; count: number; at: number } | null>(null);
  const svgRef       = useRef<SVGSVGElement>(null);
  const prevPlot     = useRef<string | null>(null);
  const prevX        = useRef<AxisVariable | null>(null);
  const prevY        = useRef<AxisVariable | null>(null);
  
  const prevHistData = useRef<string>('');
  const prevChartData = useRef<string>('');
  const prevMarkerData = useRef<string>('');
  
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
  const ghostJson   = JSON.stringify(ghostHistogramData);

  useEffect(() => {
    if (!containerRef.current || !svgRef.current) return;
    
    // 'axis' marker tags need a row under the tick labels.
    const margin = { top: 25, right: 15, bottom: markerLabels === 'axis' ? 74 : 52, left: 45 };
    const W = Math.max(0, containerRef.current.clientWidth  - margin.left - margin.right);
    const H = Math.max(0, containerRef.current.clientHeight - margin.top  - margin.bottom);

    // Guard line for inspect/changing window size
    if (W <= 0 || H <= 0) return;

    const baseColor = color || '#ec4899';

    const svg = d3.select(svgRef.current)
      .attr('width',  W + margin.left + margin.right)
      .attr('height', H + margin.top  + margin.bottom);

    // --- Detect Data vs Resize Updates ---
    const histDataStr = JSON.stringify(histogramData || []);
    const isHistUpdate = prevHistData.current !== histDataStr;
    prevHistData.current = histDataStr;

    const chartDataStr = JSON.stringify(chartData || []);
    const isChartUpdate = prevChartData.current !== chartDataStr;
    prevChartData.current = chartDataStr;

    const markerDataStr = JSON.stringify(markers || []);
    const isMarkerUpdate = prevMarkerData.current !== markerDataStr;
    prevMarkerData.current = markerDataStr;

    const faceAnimSpeed = isHistUpdate ? 1000 : 0;
    const solidAnimSpeed = isHistUpdate ? 1200 : 0;
    const dotAnimSpeed = isChartUpdate ? 500 : 0;
    const markerAnimSpeed = isMarkerUpdate ? 300 : 0;
    // -------------------------------------

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
          if (!bands) return 'transparent';
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
            if (hoverTrackId) binHover.current = { bin: d.name, count: d.count, at: Date.now() };
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
            const h = binHover.current;
            binHover.current = null;
            if (hoverTrackId && h && Date.now() - h.at >= BIN_HOVER_MIN_MS) {
              track('chart_bin_hovered', { chart: hoverTrackId, bin: Number(h.bin), count: h.count, dwell_ms: Date.now() - h.at });
            }
        });

            // Blocks are drawn straight into the data layer; clear them for the other styles.
      if (visualStyle !== 'blocks') {
        dataLayer.selectAll('g.blk').remove();
        dataLayer.selectAll('.blk-anno').remove();
        cols.selectAll('rect.hit').remove();
      }

      if (visualStyle === 'blocks') {
        cols.selectAll('rect.face-bar').remove();
        cols.selectAll('rect.segment').remove();

        // Block size: two to a row, filling most of the column
        const colW = rawBw * 0.9;
        let s = Math.max(4, (colW - BLOCK_GAP) / 2);
        // Citizens per block: the smallest nice number whose tallest tower fits
        const fits = (u: number, size: number) => Math.ceil(blocksFor(yAxisMax, u) / 2) * (size + BLOCK_GAP) <= H;
        const unit = perBlock ?? BLOCK_UNITS.find((u) => fits(u, s)) ?? BLOCK_UNITS[BLOCK_UNITS.length - 1];
        while (!fits(unit, s) && s > 4) s -= 1;
        const pitch = s + BLOCK_GAP;
        const towerW = 2 * s + BLOCK_GAP;
        const towerX = (name: string | number) => xScale(Number(name)) - towerW / 2;

        // Every block in every column: solid, or (with a bill open) arriving / leaving
        type Blk = { key: string; col: number; ls: number; x: number; y: number; state: 'solid' | 'arrive' | 'leave'; goingUp: boolean };
        const blocks: Blk[] = [];
        const tops: { col: number; top: number; delta: number; goingUp: boolean; leaving: boolean }[] = [];
        let floorCol = -1;
        histogramData.forEach((d) => {
          const col = Number(d.name);
          const g = ghostHistogramData?.find((x) => Number(x.name) === col);
          const nC = blocksFor(Math.min(d.count, yAxisMax), unit);
          const nG = g ? blocksFor(Math.min(g.count, yAxisMax), unit) : nC;
          const goingUp = (g?.movedUp ?? 0) >= (g?.movedDown ?? 0);
          const n = Math.max(nC, nG);
          if (floorCol < 0 && d.count > 0) floorCol = col;
          for (let k = 0; k < n; k++) {
            const p = blockPos(k, n, s);
            blocks.push({
              key: `${col}-${k}`, col, ls: col, goingUp,
              x: towerX(col) + p.x, y: H - (p.row + 1) * pitch + BLOCK_GAP,
              state: k < Math.min(nC, nG) ? 'solid' : nG > nC ? 'arrive' : 'leave',
            });
          }
          if (g && g.count !== d.count) {
            tops.push({ col, top: H - Math.ceil(n / 2) * pitch, delta: g.count - d.count, goingUp, leaving: g.count < d.count });
          }
        });

        const speed = isHistUpdate ? 700 : 0;
        dataLayer.selectAll<SVGGElement, Blk>('g.blk')
          .data(blocks, (b) => b.key)
          .join(
            (enter) => enter.append('g').attr('class', 'blk').style('pointer-events', 'none')
              .attr('transform', (b) => `translate(${b.x},${b.y - 24})`).attr('opacity', 0)
              .each(function (b) { drawBlockFace(d3.select(this), b.ls, s); }),
            (update) => update.each(function (b) {
              // Size changed (resize): redraw the face
              const g = d3.select(this);
              if (Number(g.select('rect.blk-body').attr('width')) !== s) { g.selectAll('*').remove(); drawBlockFace(g, b.ls, s); }
            }),
            (exit) => exit.transition().duration(300).attr('opacity', 0).remove(),
          )
          .each(function (b) {
            d3.select(this).select('rect.blk-body')
              .attr('stroke', b.state === 'arrive' ? '#1c1917' : b.state === 'leave' ? (b.goingUp ? '#1d4ed8' : '#b45309') : 'rgba(0,0,0,.22)')
              .attr('stroke-width', b.state === 'solid' ? 1 : 1.75)
              .attr('stroke-dasharray', b.state === 'arrive' ? '4,2' : b.state === 'leave' ? '2,2' : 'none');
          })
          .transition().duration((b) => (b.state === 'solid' ? speed : 250)).ease(d3.easeCubicOut)
          .attr('transform', (b) => `translate(${b.x},${b.y})`)
          .attr('opacity', (b) => (b.state === 'leave' ? 0.3 : b.state === 'arrive' ? 0.6 : 1));

        // Hover target for each column (blocks themselves ignore the pointer)
        cols.selectAll<SVGRectElement, HistogramEntry>('rect.hit')
          .data((d: any) => [d])
          .join('rect').attr('class', 'hit')
          .attr('x', (d: any) => xScale(Number(d.name)) - rawBw / 2).attr('width', rawBw)
          .attr('y', 0).attr('height', H).attr('fill', 'transparent');

        // Change counts above the towers, the floor ring, and the key
        dataLayer.selectAll('.blk-anno').remove();
        const anno = dataLayer.append('g').attr('class', 'blk-anno').style('pointer-events', 'none');
        tops.forEach((t) => {
          const n = Math.abs(t.delta);
          anno.append('text')
            .attr('x', xScale(t.col)).attr('y', t.top - 5)
            .attr('text-anchor', 'middle').attr('font-size', '12px').attr('font-weight', '900')
            .attr('stroke', 'white').attr('stroke-width', 3).style('paint-order', 'stroke')
            .attr('fill', !t.leaving ? '#1c1917' : t.goingUp ? '#1d4ed8' : '#b45309')
            .text(!t.leaving ? `+${n}` : t.goingUp ? `${n}→` : `←${n}`);
        });
        if (highlightFloor && floorCol >= 0) {
          const nAtFloor = blocks.filter((b) => b.col === floorCol).length;
          const p = blockPos(0, nAtFloor, s);
          anno.append('rect')
            .attr('x', towerX(floorCol) + p.x - 2.5).attr('y', H - pitch + BLOCK_GAP - 2.5)
            .attr('width', s + 5).attr('height', s + 5).attr('rx', Math.max(3, s * 0.2))
            .attr('fill', 'none').attr('stroke', '#2563eb').attr('stroke-width', 2.5);
        }
        const key = anno.append('g').attr('transform', `translate(${W},${-margin.top + 4})`);
        const ks = 13;
        const keyText = key.append('text').attr('x', 0).attr('y', ks - 2).attr('text-anchor', 'end')
          .attr('font-size', '11px').attr('font-weight', '700').attr('fill', labelFg)
          .text(`= ${unit} million people`);
        const kw = (keyText.node() as SVGTextElement | null)?.getComputedTextLength() ?? 70;
        drawBlockFace(key.append('g').attr('transform', `translate(${-kw - ks - 4},0)`), 7, ks);

            } else if (visualStyle === 'faces') {
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
          .transition().duration(faceAnimSpeed).ease(d3.easeCubicOut)
          .attr('y', (d: any) => {
            const clampedCount = Math.min(d.count, yAxisMax);
            const raw = H - yScale(clampedCount);
            let n = Math.round((raw / faceSize) * 2) / 2;
            if (clampedCount > 0 && n === 0) n = 0.5;
            return H - n * faceSize;
          })
          .attr('height', (d: any) => {
            const clampedCount = Math.min(d.count, yAxisMax);
            const raw = H - yScale(clampedCount);
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
          .transition().duration(faceAnimSpeed).ease(d3.easeCubicOut)
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
          .transition().duration(solidAnimSpeed).ease(d3.easeCubicOut)
          .attr('y', (d: any) => d.yPos)
          .attr('height', (d: any) => d.h);
      }

      // --- Ghost preview (see ghostHistogramData) ---
      let ghostLayer = chart.select<SVGGElement>('.ghost-layer');
      if (ghostLayer.empty()) ghostLayer = chart.insert<SVGGElement>('g', '.annotation-layer').attr('class', 'ghost-layer');
      ghostLayer.selectAll('*').remove();
      ghostLayer.style('pointer-events', 'none');
      if (visualStyle === 'faces' && ghostHistogramData && ghostHistogramData.length > 0) {
        const fs    = calcFaceSize(bw, faceCols);
        const rectW = faceCols * fs;
        const xOff  = (bw - rectW) / 2;
        // Same rounding to half-faces as the bars above.
        const units = (count: number) => {
          const c = Math.min(count, yAxisMax);
          let n = Math.round(((H - yScale(c)) / fs) * 2) / 2;
          if (c > 0 && n === 0) n = 0.5;
          return n;
        };
        histogramData.forEach((d) => {
          const g = ghostHistogramData.find((x) => Number(x.name) === Number(d.name));
          if (!g) return;
          const nC = units(d.count);
          const nG = units(g.count);
          const delta = g.count - d.count;
          const x = getX(d.name) + xOff;
          // Which way this column's leavers go: right (up the scale) or left (down).
          const up = g.movedUp ?? 0;
          const down = g.movedDown ?? 0;
          const goingUp = up >= down;
          const leaveColour = goingUp ? '#1d4ed8' : '#b45309';
          if (nG > nC) {
            // Would arrive: faded faces with a dashed outline, stacked on top.
            ghostLayer.append('rect')
              .attr('x', x).attr('width', Math.max(0, rectW - 0.5))
              .attr('y', H - nG * fs).attr('height', (nG - nC) * fs)
              .attr('fill', `url(#face-${d.name}-${chartId})`).attr('opacity', 0.5);
            ghostLayer.append('rect')
              .attr('x', x).attr('width', Math.max(0, rectW - 0.5))
              .attr('y', H - nG * fs).attr('height', (nG - nC) * fs)
              .attr('fill', 'none').attr('stroke', '#1c1917').attr('stroke-width', 1.5).attr('stroke-dasharray', '5,3');
          } else if (nG < nC) {
            // Would move away: the top faces fade out behind a dotted outline,
            // coloured by where they go (blue: up the scale, orange: down).
            ghostLayer.append('rect')
              .attr('x', x).attr('width', Math.max(0, rectW - 0.5))
              .attr('y', H - nC * fs).attr('height', (nC - nG) * fs)
              .attr('fill', 'rgba(255,255,255,0.72)').attr('stroke', leaveColour).attr('stroke-width', 2).attr('stroke-dasharray', '2,3');
          }
          if (delta !== 0) {
            // Arrivals: "+5". Leavers: "5→" (moving up the scale) or "←5" (moving down),
            // so a smaller column never reads as people getting worse off.
            const n = Math.abs(delta);
            ghostLayer.append('text')
              .attr('x', x + rectW / 2).attr('y', H - Math.max(nC, nG) * fs - 6)
              .attr('text-anchor', 'middle').attr('font-size', '12px').attr('font-weight', '900')
              .attr('stroke', 'white').attr('stroke-width', 3).style('paint-order', 'stroke')
              .attr('fill', delta > 0 ? '#1c1917' : leaveColour)
              .text(delta > 0 ? `+${n}` : goingUp ? `${n}→` : `←${n}`);
          }
        });
        ghostLayer.attr('opacity', 0).transition().duration(250).attr('opacity', 1);
      }

      // Add Overflow Plus Indicators
      cols.selectAll('text.overflow-plus').remove();
      cols.append('text')
        .attr('class', 'overflow-plus')
        .attr('x', (d: any) => {
          const rectW = visualStyle.includes('faces') ? faceCols * calcFaceSize(bw, faceCols) : bw;
          if (visualStyle === 'blocks') return xScale(Number(d.name));
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

      // Blocks carry their own key ("= 5 citizens"), so no y-axis
      chart.select('.axis-y').style('display', visualStyle === 'blocks' ? 'none' : '');

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
        .attr('x', W / 2).attr('y', markerLabels === 'axis' ? H + 66 : H + 42)
        .attr('fill', labelFg)
        .style('text-anchor','middle').style('font-weight','bold')
        .text(getAxisLabel(xAxisType));

      annoLayer.selectAll('*').remove();
      // Only fade markers in when they actually change, so they don't flicker
      // (or look blurry) every time the chart redraws for a preview.
      const fadeIn = (sel: d3.Selection<any, unknown, null, undefined>) =>
        markerAnimSpeed > 0 ? sel.style('opacity', 0).transition().duration(markerAnimSpeed).style('opacity', 1) : sel.style('opacity', 1);

      if (markerLabels === 'axis') {
        // Thin lines through the plot; names as tags under the axis. Pairs sit on
        // opposite sides of their lines (the lower value's tag to the left), so
        // they never overlap each other.
        const list = markers ?? [];
        const lowest = list.length ? Math.min(...list.map((m) => m.value)) : 0;
        list.forEach((m) => {
          const mx = xScale(Math.max(-0.5, Math.min(10.5, m.value)));
          const mc = m.color ?? '#3f3f46';
          const left = list.length > 1 && m.value === lowest;
          const g = annoLayer.append('g');
          g.append('line')
            .attr('x1', mx).attr('x2', mx).attr('y1', 0).attr('y2', H + 6)
            .attr('stroke', mc).attr('stroke-width', 2)
            .attr('stroke-dasharray', m.dashed ? '6,4' : 'none');
          g.append('path')
            .attr('d', `M ${mx - 5} ${H + 30} L ${mx + 5} ${H + 30} L ${mx} ${H + 24} Z`)
            .attr('fill', mc);
          const text = g.append('text')
            .attr('y', H + 43).attr('font-size', '11px').attr('font-weight', '900')
            .attr('fill', m.dashed ? mc : '#ffffff')
            .attr('text-anchor', left ? 'end' : 'start')
            .text(m.label);
          const tw = (text.node() as SVGTextElement | null)?.getComputedTextLength() ?? 60;
          // Keep the tag inside the chart.
          let tx = left ? mx + 4 : mx - 4;
          if (left) tx = Math.max(tw + 6, tx); else tx = Math.min(W - tw - 6, tx);
          text.attr('x', left ? tx - 3 : tx + 3);
          g.insert('rect', 'text')
            .attr('x', left ? tx - tw - 9 : tx).attr('y', H + 31)
            .attr('width', tw + 12).attr('height', 17).attr('rx', 4)
            .attr('fill', m.dashed ? '#ffffff' : mc)
            .attr('stroke', mc).attr('stroke-width', 1.5)
            .attr('stroke-dasharray', m.dashed ? '4,2' : 'none');
          fadeIn(g);
        });
      }

      if (markerLabels === 'top') (markers ?? []).forEach((m, i) => {
        // Markers now evaluate mathematically directly onto the grid
        const mx    = xScale(Math.max(-0.5, Math.min(10.5, m.value)));
        const mc    = m.color ?? '#3f3f46';
        const yPos  = -8 + i * 16;
        
        annoLayer.append('line')
          .attr('x1',mx).attr('x2',mx).attr('y1',0).attr('y2',H)
          .attr('stroke',mc).attr('stroke-width',2)
          .attr('stroke-dasharray', m.dashed ? '6,4' : 'none')
          .call(fadeIn);

        annoLayer.append('text')
          .attr('y',yPos).attr('x',mx - 6)
          .attr('fill',mc).attr('font-size','12px').attr('font-weight','900')
          .attr('stroke','white').attr('stroke-width',4).style('paint-order','stroke')
          .attr('text-anchor','end').text(m.label)
          .call(fadeIn);
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
        .transition().duration(dotAnimSpeed)
        .attr('cx', (d: any) => xScale(d.x))
        .attr('cy', (d: any) => yScale(d.y))
        .attr('r', 5).style('fill', baseColor).style('opacity', 0.7);
    }
  }, [plotType, chartData, histogramData, xAxisType, yAxisType, color, markersJson, rulesJson, ghostJson, bands, markerLabels, visualStyle, dims, faceCols, theme, perBlock, highlightFloor]);

  return <div ref={containerRef} className="w-full h-full relative"><svg ref={svgRef} /></div>;
}