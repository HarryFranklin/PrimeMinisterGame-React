import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ElectionCycle, PolicyRule, Respondent } from '../utils/types';
import { WelfareMetrics } from '../utils/WelfareMetrics';
import { IMPACT_COLORS } from '../utils/uiHelpers';

/**
 * "What a +1 is worth here": one bar per LS column, drawn under the
 * population chart, showing how much lifting one person in that column by
 * one point adds to the score. Bars are scaled to the level's most valuable
 * +1, so the shape is the message:
 *   Level 1: all bars equal (every point counts the same).
 *   Level 2: one bar, at the lowest occupied column.
 *   Levels 3/4: tall on the left, shrinking to the right (Level 4 less steep).
 *
 * With "View details" open, bars take the same blue/amber as the population
 * chart's highlight: blue where the policy lifts people, amber where it
 * pushes them down, faded where it does nothing.
 */

/** Must match the 1D histogram in D3Chart (margin.left / margin.right). */
const CHART_MARGIN = { left: 45, right: 15 };
/** Matches the chart wrapper's p-2. */
const CARD_PADDING_PX = 8;
const LEVELS = Array.from({ length: 11 }, (_, i) => i);
/** Scoring floors LS at 2, so a +1 below 2 is shown as a +1 from 2. */
const SCORE_FLOOR = 2;

const CAPTIONS: Record<ElectionCycle, string> = {
  [ElectionCycle.Benthamite]: 'Every +1 counts the same.',
  [ElectionCycle.Rawlsian]: 'Only a +1 for the worst-off counts.',
  [ElectionCycle.SocietalUtility]: 'A +1 counts most at the bottom.',
  [ElectionCycle.PersonalUtility]: 'A +1 counts more at the bottom.',
};

/** Average utility of one person at this LS, across respondents' own curves
 * (the same calculation the score uses). */
function averageUtilityAt(cycle: ElectionCycle, ls: number, population: Respondent[]): number {
  if (population.length === 0) return 0;
  const allLS = new Array(population.length).fill(ls);
  return population.reduce(
    (sum, r) => sum + WelfareMetrics.getCycleUtility({ ...r, currentLS: ls }, cycle, population.length, allLS),
    0,
  ) / population.length;
}

/** Same rule as the population chart's highlight: net impact of the
 * policy's rules covering this column. */
function netImpactAt(ls: number, rules: PolicyRule[]): number | null {
  const affecting = rules.filter((r) => ls >= (r.minLS ?? 0) && ls <= (r.maxLS ?? 10));
  return affecting.length === 0 ? null : affecting.reduce((s, r) => s + r.impact, 0);
}

interface PointsStripProps {
  cycle: ElectionCycle;
  /** The population histogram's bins (name = LS column, count = people). */
  histogramData: { name: number | string; count: number }[];
  /** Needed for Levels 3/4, where each respondent has their own curve. */
  population: Respondent[];
  color: string;
  /** The selected policy's rules while "View details" is open. */
  activePolicyRules?: PolicyRule[] | null;
}

export default function PointsStrip({ cycle, histogramData, population, color, activePolicyRules }: PointsStripProps) {
  const counts = new Map(histogramData.map((b) => [Number(b.name), b.count]));
  const occupied = LEVELS.filter((ls) => (counts.get(ls) ?? 0) > 0);
  const lowestOccupied = occupied.length ? occupied[0] : null;
  const isUtility = cycle === ElectionCycle.SocietalUtility || cycle === ElectionCycle.PersonalUtility;

  // Each respondent's curve is fixed, so the averages only change with the
  // level (population changes every turn, but its size doesn't).
  const utilityByLevel = useMemo(
    () => (isUtility ? LEVELS.map((ls) => averageUtilityAt(cycle, ls, population)) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cycle, population.length],
  );

  /** Score added by lifting one person in this column by one point. */
  const plusOneValue = (ls: number): number => {
    if (ls >= 10) return 0;
    const from = Math.max(ls, SCORE_FLOOR);
    switch (cycle) {
      case ElectionCycle.Benthamite:
        return 1;
      case ElectionCycle.Rawlsian:
        return ls === lowestOccupied ? 1 : 0;
      default:
        return utilityByLevel ? utilityByLevel[Math.min(from + 1, 10)] - utilityByLevel[from] : 0;
    }
  };

  const values = LEVELS.map(plusOneValue);
  const maxValue = Math.max(...values, 1e-9);
  const showingPolicy = !!activePolicyRules && activePolicyRules.length > 0;

  // Hover tooltip, styled like the population chart's: portalled to <body>
  // so the card's overflow can't clip it, and glides between columns.
  const [hovered, setHovered] = useState<{ ls: number; x: number; y: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const showTip = (ls: number, el: HTMLElement) => {
    // Anchor on the top of the bar, like the population chart does.
    const r = el.getBoundingClientRect();
    const barTop = r.bottom - (r.height * Math.max(values[ls] > 0 ? 6 : 0, (values[ls] / maxValue) * 100)) / 100;
    setHovered({ ls, x: r.left + window.scrollX + r.width / 2, y: barTop + window.scrollY });
  };

  const tipText = (ls: number) => {
    if (ls >= 10) return { label: 'LS 10:', body: 'top of the scale, no +1 possible' };
    const people = counts.get(ls) ?? 0;
    return {
      label: `LS ${ls} → ${ls + 1}:`,
      body: `+${values[ls].toFixed(1)} points per person${people ? ` · ~${people} million people` : ''}`,
    };
  };

  const barColor = (ls: number): { fill: string; opacity: number } => {
    if (!showingPolicy) return { fill: color, opacity: (counts.get(ls) ?? 0) > 0 ? 1 : 0.3 };
    const net = netImpactAt(ls, activePolicyRules!);
    if (net === null) return { fill: '#d4d4d8', opacity: 0.35 };
    if (net > 0) return { fill: IMPACT_COLORS['Will improve'], opacity: 1 };
    if (net < 0) return { fill: IMPACT_COLORS['Will worsen'], opacity: 1 };
    return { fill: IMPACT_COLORS['Will be stable'], opacity: 1 };
  };

  return (
    <div
      className="shrink-0 pb-2 flex flex-col gap-1"
      data-telemetry-id="plus_one_value_strip"
      data-telemetry-type="graph"
    >
      <div
        className="flex flex-wrap items-baseline gap-x-2"
        style={{ paddingLeft: CARD_PADDING_PX + 4, paddingRight: CARD_PADDING_PX + CHART_MARGIN.right }}
      >
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">What a +1 is worth here</span>
        <span className="text-[10px] text-zinc-500">{CAPTIONS[cycle]}</span>
      </div>

      <div
        className="flex h-12 items-end"
        style={{
          paddingLeft: CARD_PADDING_PX + CHART_MARGIN.left,
          paddingRight: CARD_PADDING_PX + CHART_MARGIN.right,
        }}
      >
        {LEVELS.map((ls) => {
          const v = values[ls];
          const { fill, opacity } = barColor(ls);
          const pct = Math.round((v / maxValue) * 100);
          const isHovered = hovered?.ls === ls;
          const dimmed = hovered !== null && !isHovered;
          return (
            <div
              key={ls}
              className="flex-1 h-full flex flex-col justify-end items-center px-[2px] cursor-crosshair"
              onMouseEnter={(e) => showTip(ls, e.currentTarget)}
              onMouseLeave={() => setHovered(null)}
            >
              <motion.div
                className="w-full rounded-t-sm origin-bottom"
                initial={false}
                animate={{
                  height: `${Math.max(v > 0 ? 6 : 0, pct)}%`,
                  backgroundColor: fill,
                  opacity: dimmed ? opacity * 0.45 : opacity,
                  scaleX: isHovered ? 1.08 : 1,
                  filter: isHovered ? 'brightness(1.12)' : 'brightness(1)',
                }}
                transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              />
            </div>
          );
        })}
      </div>

      {mounted && createPortal(
        <AnimatePresence>
          {hovered && (
            <motion.div
              key="plus-one-tip"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0, left: hovered.x, top: hovered.y }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15, ease: 'easeOut', left: { duration: 0.1 }, top: { duration: 0.1 } }}
              style={{
                position: 'absolute', left: hovered.x, top: hovered.y, translateX: '-50%', translateY: '-120%',
                pointerEvents: 'none', zIndex: 999999, whiteSpace: 'nowrap',
                background: 'rgba(24, 24, 27, 0.95)', color: 'white', padding: '6px 10px', borderRadius: 6,
                fontSize: 12, fontWeight: 600, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
              }}
            >
              <span style={{ color }}>{tipText(hovered.ls).label}</span> {tipText(hovered.ls).body}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}