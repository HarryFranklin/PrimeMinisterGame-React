'use client';

import React from 'react';
import { WelfareMetrics } from '../utils/WelfareMetrics';

/**
 * Shared utility curve, drawn as plain SVG so it can be highlighted, hovered
 * and given a moving marker. Ported from the control group's
 * UtilityCurveChart so the game's Utility Intervention shows the SAME chart.
 *
 * The x-axis starts at Life Satisfaction 2 (scores of 2 or below have 0
 * utility), matching WelfareMetrics.getUtility.
 */

// Which curve the intervention teaches with. The control group's wiki uses
// the Personal Utility curve for this lesson; change to 'societal' to switch.
export const INTERVENTION_CURVE: 'personal' | 'societal' = 'personal';

// WelfareMetrics.getUtility returns 0-10; the control group's chart is 0-1.
// Dividing by 10 keeps the numbers identical to the wiki.
export const utilityAt = (ls: number): number =>
  WelfareMetrics.getUtility(ls, INTERVENTION_CURVE) / 10;

export interface CurveStep {
  from: number;
  to: number;
  color: string;
  /** Label under/over the horizontal run, e.g. "2 points". */
  runLabel?: string;
  /** Label beside the vertical rise, e.g. "+0.55". */
  riseLabel?: string;
}

export interface CurveZone {
  id: string;
  from: number;
  to: number;
  color: string;
}

interface UtilityCurveChartProps {
  steps?: CurveStep[];
  marker?: number | null;
  markerColor?: string;
  zones?: CurveZone[];
  activeZoneIds?: string[];
  onZoneEnter?: (id: string) => void;
  onZoneLeave?: () => void;
  onZoneClick?: (id: string) => void;
  ariaLabel?: string;
}

const WIDTH = 640;
const HEIGHT = 340;
const PAD = { top: 24, right: 72, bottom: 48, left: 56 };

const X_DOMAIN: [number, number] = [2, 10];
const X_TICKS = [2, 4, 6, 8, 10];
const Y_TICKS = [0, 0.25, 0.5, 0.75, 1];
const CURVE_KNOTS = [2, 3, 4, 5, 6, 7, 8, 9, 10];

const innerW = WIDTH - PAD.left - PAD.right;
const innerH = HEIGHT - PAD.top - PAD.bottom;
const axisY = PAD.top + innerH;

const scaleX = (x: number) => PAD.left + ((x - X_DOMAIN[0]) / (X_DOMAIN[1] - X_DOMAIN[0])) * innerW;
const scaleY = (y: number) => PAD.top + innerH - y * innerH;

/** Whole-number knots between two scores, so highlighted segments follow the curve exactly. */
const knots = (from: number, to: number): number[] => {
  const pts = [from];
  for (let k = Math.floor(from) + 1; k < to; k++) pts.push(k);
  pts.push(to);
  return pts;
};

const segmentPath = (from: number, to: number) =>
  knots(from, to)
    .map((x, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(x)} ${scaleY(utilityAt(x))}`)
    .join(' ');

export default function UtilityCurveChart({
  steps = [],
  marker = null,
  markerColor = '#ffffff',
  zones = [],
  activeZoneIds = [],
  onZoneEnter,
  onZoneLeave,
  onZoneClick,
  ariaLabel = 'Utility curve',
}: UtilityCurveChartProps) {
  const curvePoints = CURVE_KNOTS.map((ls) => ({ ls, u: utilityAt(ls) }));
  const curvePath = curvePoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.ls)} ${scaleY(p.u)}`)
    .join(' ');
  const activeSet = new Set(activeZoneIds);

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto select-none" role="img" aria-label={ariaLabel}>
      {/* Gridlines */}
      {Y_TICKS.map((t) => (
        <line key={`gy-${t}`} x1={PAD.left} x2={WIDTH - PAD.right} y1={scaleY(t)} y2={scaleY(t)} stroke="#3f3f46" strokeWidth={1} />
      ))}

      {/* Faint band behind any active zone */}
      {zones.filter((z) => activeSet.has(z.id)).map((z) => (
        <rect key={`band-${z.id}`} x={scaleX(z.from)} y={PAD.top} width={scaleX(z.to) - scaleX(z.from)} height={innerH} fill={z.color} opacity={0.12} />
      ))}

      {/* Axes and ticks (every 2 points) */}
      <line x1={PAD.left} x2={WIDTH - PAD.right} y1={axisY} y2={axisY} stroke="#71717a" strokeWidth={2} />
      <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={axisY} stroke="#71717a" strokeWidth={2} />
      {X_TICKS.map((t) => (
        <text key={`xt-${t}`} x={scaleX(t)} y={axisY + 18} textAnchor="middle" fontSize={11} fontWeight={600} fill="#d4d4d8">{t}</text>
      ))}
      {Y_TICKS.map((t) => (
        <text key={`yt-${t}`} x={PAD.left - 8} y={scaleY(t) + 4} textAnchor="end" fontSize={11} fontWeight={600} fill="#d4d4d8">{t.toFixed(2)}</text>
      ))}
      <text x={(PAD.left + WIDTH - PAD.right) / 2} y={HEIGHT - 6} textAnchor="middle" fontSize={12} fontWeight={700} fill="#e4e4e7">
        Life Satisfaction
      </text>
      <text
        x={14} y={(axisY + PAD.top) / 2}
        textAnchor="middle" fontSize={12} fontWeight={700} fill="#e4e4e7"
        transform={`rotate(-90 14 ${(axisY + PAD.top) / 2})`}
      >
        Utility
      </text>

      {/* The curve itself */}
      <path d={curvePath} fill="none" stroke="#a78bfa" strokeWidth={2.5} />
      {curvePoints.map((p) => (
        <circle key={`pt-${p.ls}`} cx={scaleX(p.ls)} cy={scaleY(p.u)} r={4.5} fill="#a78bfa" stroke="#18181b" strokeWidth={1} />
      ))}

      {/* Highlighted steps: coloured segment, end points, and a "run and rise" triangle */}
      {steps.map((s, i) => {
        const x1 = scaleX(s.from);
        const x2 = scaleX(s.to);
        const y1 = scaleY(utilityAt(s.from));
        const y2 = scaleY(utilityAt(s.to));
        const runOnAxis = y1 > axisY - 26;
        const labelStyle = { paintOrder: 'stroke' } as React.CSSProperties;
        return (
          <g key={`step-${i}`}>
            <path d={`M ${x1} ${y1} L ${x2} ${y1} L ${x2} ${y2}`} fill="none" stroke={s.color} strokeWidth={2} strokeDasharray="6 4" />
            <path d={segmentPath(s.from, s.to)} fill="none" stroke={s.color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={x1} cy={y1} r={6.5} fill={s.color} stroke="#18181b" strokeWidth={2} />
            <circle cx={x2} cy={y2} r={6.5} fill={s.color} stroke="#18181b" strokeWidth={2} />
            {s.runLabel && (
              <text x={(x1 + x2) / 2} y={runOnAxis ? y1 - 8 : y1 + 16} textAnchor="middle" fontSize={12} fontWeight={800} fill={s.color} stroke="#18181b" strokeWidth={3} style={labelStyle}>
                {s.runLabel}
              </text>
            )}
            {s.riseLabel && (
              <text x={x2 + 8} y={(y1 + y2) / 2 + 4} textAnchor="start" fontSize={12} fontWeight={800} fill={s.color} stroke="#18181b" strokeWidth={3} style={labelStyle}>
                {s.riseLabel}
              </text>
            )}
          </g>
        );
      })}

      {/* Moving marker (used by the slider) */}
      {marker !== null && (
        <g>
          <line x1={scaleX(marker)} x2={scaleX(marker)} y1={scaleY(utilityAt(marker))} y2={axisY} stroke="#a1a1aa" strokeWidth={1.5} strokeDasharray="3 3" />
          <circle cx={scaleX(marker)} cy={scaleY(utilityAt(marker))} r={9} fill="#18181b" stroke={markerColor} strokeWidth={4} />
        </g>
      )}

      {/* Invisible hit areas so hovering or tapping the chart itself selects a zone */}
      {zones.map((z) => (
        <rect
          key={`hit-${z.id}`}
          x={scaleX(z.from)} y={PAD.top} width={scaleX(z.to) - scaleX(z.from)} height={innerH}
          fill="transparent" style={{ cursor: 'pointer' }}
          onMouseEnter={() => onZoneEnter?.(z.id)}
          onMouseLeave={() => onZoneLeave?.()}
          onClick={() => onZoneClick?.(z.id)}
        />
      ))}
    </svg>
  );
}