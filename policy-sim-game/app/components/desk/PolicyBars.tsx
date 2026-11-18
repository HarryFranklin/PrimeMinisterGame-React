import React from 'react';
import { PolicyRule } from '../../utils/types';
import { IMPACT_COLORS } from '../../utils/uiHelpers';
import { Direction, ruleBins } from './deskTheme';

const UP = IMPACT_COLORS['Will improve'];
const DOWN = IMPACT_COLORS['Will worsen'];
const NONE = 'rgba(120,95,50,.12)';

/** Must match the 1D histogram in D3Chart (margin.left / margin.right),
 * so each strip cell sits exactly under its column of faces. */
export const CHART_MARGIN = { left: 20, right: 15 }; // = D3Chart's margin in blocks mode

/**
 * A policy's overall effect on one 0–10 bar: blue where it lifts people,
 * hatched orange where it pushes them down, on average, for the people in each
 * column (see overallByBin). Shown on closed files and the bill.
 */
export function OverallBar({ directions, height = 11, className = '' }: { directions: Direction[]; height?: number; className?: string }) {
  return (
    <div className={`flex gap-[2px] ${className}`} aria-hidden="true">
      {directions.map((d, i) => (
        <span
          key={i}
          className={`flex-1 rounded-[2px] ${d < 0 ? 'desk-hatch' : ''}`}
          style={{ height, backgroundColor: d > 0 ? UP : d < 0 ? DOWN : NONE }}
        />
      ))}
    </div>
  );
}

/** Spacing, label size and bar height, loosest first. DailyReturn steps down
 * through these until a bill's strips fit, so the desk never scrolls. */
const DENSITY = [
  { rowGap: 8, labelGap: 4, font: 12, bar: 14 },
  { rowGap: 5, labelGap: 2, font: 11.5, bar: 10 },
  { rowGap: 3, labelGap: 1, font: 11, bar: 8 },
  { rowGap: 2, labelGap: 0, font: 10.5, bar: 6 },
];
export const MAX_STRIP_DENSITY = DENSITY.length - 1;

/**
 * One strip per rule of the open bill, lined up under the chart's columns.
 * Labels sit above each strip (never beside it), so nothing throws off the alignment.
 * `padX` is any padding the chart's wrapper adds on each side.
 * `density` (0 to MAX_STRIP_DENSITY) tightens the layout for bills with many rules.
 */
export function PolicyStrips({ rules, padX = 0, density = 0 }: { rules: PolicyRule[]; padX?: number; density?: number }) {
  const d = DENSITY[Math.max(0, Math.min(MAX_STRIP_DENSITY, density))];
  return (
    <div className="flex flex-col" style={{ gap: d.rowGap }} data-telemetry-id="policy_strips" data-telemetry-type="graph">
      {rules.map((rule, idx) => {
        const up = rule.impact > 0;
        const bins = ruleBins(rule);
        return (
          <div key={idx} className="flex flex-col" style={{ gap: d.labelGap }}>
            <span
              className="leading-tight text-stone-700"
              style={{ fontSize: d.font, paddingLeft: padX + CHART_MARGIN.left - 2, paddingRight: padX + CHART_MARGIN.right }}
            >
              <strong style={{ color: up ? '#1d4ed8' : '#b45309' }}>
                {up ? '▲' : '▼'} {rule.note}
              </strong>
              <span className="text-stone-500"> · {up ? '+' : ''}{rule.impact} LS</span>
            </span>
            <div className="flex" style={{ paddingLeft: padX + CHART_MARGIN.left, paddingRight: padX + CHART_MARGIN.right }}>
              {Array.from({ length: 11 }, (_, i) => {
                const on = bins.includes(i);
                return (
                  <div key={i} className="flex-1 px-[2px]">
                    <div
                      className={`rounded-[3px] ${on && !up ? 'desk-hatch' : ''}`}
                      style={{ height: d.bar, backgroundColor: on ? (up ? UP : DOWN) : NONE }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}