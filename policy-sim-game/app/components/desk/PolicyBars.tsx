import React from 'react';
import { PolicyRule } from '../../utils/types';
import { IMPACT_COLORS } from '../../utils/uiHelpers';
import { overallByBin, ruleBins } from './deskTheme';

const UP = IMPACT_COLORS['Will improve'];
const DOWN = IMPACT_COLORS['Will worsen'];
const NONE = 'rgba(120,95,50,.12)';

/** Must match the 1D histogram in D3Chart (margin.left / margin.right),
 * so each strip cell sits exactly under its column of faces. */
export const CHART_MARGIN = { left: 45, right: 15 };

/**
 * A policy's overall effect on one 0–10 bar: blue where it lifts people,
 * hatched orange where it pushes them down. Shown on closed files and the bill.
 */
export function OverallBar({ rules, height = 11, className = '' }: { rules: PolicyRule[]; height?: number; className?: string }) {
  return (
    <div className={`flex gap-[2px] ${className}`} aria-hidden="true">
      {overallByBin(rules).map((d, i) => (
        <span
          key={i}
          className={`flex-1 rounded-[2px] ${d < 0 ? 'desk-hatch' : ''}`}
          style={{ height, backgroundColor: d > 0 ? UP : d < 0 ? DOWN : NONE }}
        />
      ))}
    </div>
  );
}

/**
 * One strip per rule of the open bill, lined up under the chart's columns.
 * Labels sit above each strip (never beside it), so nothing throws off the alignment.
 * `padX` is any padding the chart's wrapper adds on each side.
 */
export function PolicyStrips({ rules, padX = 0 }: { rules: PolicyRule[]; padX?: number }) {
  return (
    <div className="flex flex-col gap-2" data-telemetry-id="policy_strips" data-telemetry-type="graph">
      {rules.map((rule, idx) => {
        const up = rule.impact > 0;
        const bins = ruleBins(rule);
        return (
          <div key={idx} className="flex flex-col gap-1">
            <span
              className="text-[12px] leading-tight text-stone-700"
              style={{ paddingLeft: padX + CHART_MARGIN.left - 2, paddingRight: padX + CHART_MARGIN.right }}
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
                      className={`h-3.5 rounded-[3px] ${on && !up ? 'desk-hatch' : ''}`}
                      style={{ backgroundColor: on ? (up ? UP : DOWN) : NONE }}
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
