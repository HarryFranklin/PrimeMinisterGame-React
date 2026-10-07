import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ElectionCycle, Respondent } from '../utils/types';
import { WelfareMetrics } from '../utils/WelfareMetrics';

/**
 * "Points per person" strip, drawn under the population chart with one bar
 * per LS column. Shows how much one person in each column is worth under
 * the current level's rule:
 *   Level 1: every point of LS counts the same (points = LS).
 *   Level 2: only the lowest occupied column counts.
 *   Levels 3/4: the average across respondents' own curves (deciding for
 *     others / for themselves). This is what the score uses, and matches
 *     the utility table's "Utility per person" row.
 */

/** Must match the 1D histogram in D3Chart (margin.left / margin.right). */
const CHART_MARGIN = { left: 45, right: 15 };
/** Matches the chart wrapper's p-2. */
const CARD_PADDING_PX = 8;
const LEVELS = Array.from({ length: 11 }, (_, i) => i);
const MAX_POINTS = 10;

const CAPTIONS: Record<ElectionCycle, string> = {
  [ElectionCycle.Benthamite]: 'Every point of LS counts the same.',
  [ElectionCycle.Rawlsian]: 'Only the worst-off column counts.',
  [ElectionCycle.SocietalUtility]: 'The public’s curve, deciding for others.',
  [ElectionCycle.PersonalUtility]: 'The public’s curve, deciding for themselves.',
};

/** Average utility of one person at this LS across respondents' own curves,
 * worked out the same way as UtilityTable's "Utility per person" row. */
function averageUtilityAt(cycle: ElectionCycle, ls: number, population: Respondent[]): number {
  if (population.length === 0) return 0;
  const allLS = new Array(population.length).fill(ls);
  return population.reduce(
    (sum, r) => sum + WelfareMetrics.getCycleUtility({ ...r, currentLS: ls }, cycle, population.length, allLS),
    0,
  ) / population.length;
}

function pointsPerPerson(
  cycle: ElectionCycle, ls: number, lowestOccupied: number | null, utilityByLevel: number[] | null,
): number {
  switch (cycle) {
    case ElectionCycle.Benthamite:
      return ls;
    case ElectionCycle.Rawlsian:
      return ls === lowestOccupied ? ls : 0;
    case ElectionCycle.SocietalUtility:
    case ElectionCycle.PersonalUtility:
      return utilityByLevel?.[ls] ?? 0;
    default:
      return 0;
  }
}

interface PointsStripProps {
  cycle: ElectionCycle;
  /** The population histogram's bins (name = LS column, count = people). */
  histogramData: { name: number | string; count: number }[];
  /** Needed for Levels 3/4, where each respondent has their own curve. */
  population: Respondent[];
  color: string;
}

export default function PointsStrip({ cycle, histogramData, population, color }: PointsStripProps) {
  // Each respondent's curve is fixed, so this only changes with the level
  // (the population prop changes every turn, but the averages don't).
  const utilityByLevel = useMemo(
    () => (cycle === ElectionCycle.SocietalUtility || cycle === ElectionCycle.PersonalUtility
      ? LEVELS.map((ls) => averageUtilityAt(cycle, ls, population))
      : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cycle, population.length],
  );

  const counts = new Map(histogramData.map((b) => [Number(b.name), b.count]));
  const occupied = LEVELS.filter((ls) => (counts.get(ls) ?? 0) > 0);
  const lowestOccupied = occupied.length ? occupied[0] : null;

  return (
    <div
      className="shrink-0 pb-2 flex flex-col gap-1"
      data-telemetry-id="points_per_person_strip"
      data-telemetry-type="graph"
    >
      <div
        className="flex justify-between items-baseline gap-2"
        style={{ paddingLeft: CARD_PADDING_PX + 4, paddingRight: CARD_PADDING_PX + CHART_MARGIN.right }}
      >
        <span className="text-[12px] font-black uppercase tracking-widest text-zinc-500">Points per person</span>
        <span className="text-[12px] text-zinc-500 truncate">{CAPTIONS[cycle]}</span>
      </div>

      <div
        className="flex h-10 items-end"
        style={{
          paddingLeft: CARD_PADDING_PX + CHART_MARGIN.left,
          paddingRight: CARD_PADDING_PX + CHART_MARGIN.right,
        }}
      >
        {LEVELS.map((ls) => {
          const pts = pointsPerPerson(cycle, ls, lowestOccupied, utilityByLevel);
          const people = counts.get(ls) ?? 0;
          return (
            <div
              key={ls}
              className="flex-1 h-full flex flex-col justify-end items-center px-[2px]"
              title={`LS ${ls}: ${pts.toFixed(1)} points per person${people ? ` × ${people} ${people === 1 ? 'person' : 'people'}` : ''}`}
            >
              <motion.div
                className="w-full rounded-t-sm"
                style={{ backgroundColor: color, opacity: people > 0 ? 1 : 0.25 }}
                initial={false}
                animate={{ height: `${(pts / MAX_POINTS) * 100}%` }}
                transition={{ type: 'spring', stiffness: 220, damping: 28 }}
              />
            </div>
          );
        })}
      </div>

      <div
        className="flex"
        style={{
          paddingLeft: CARD_PADDING_PX + CHART_MARGIN.left,
          paddingRight: CARD_PADDING_PX + CHART_MARGIN.right,
        }}
      >
        {LEVELS.map((ls) => {
          const pts = pointsPerPerson(cycle, ls, lowestOccupied, utilityByLevel);
          return (
            <span key={ls} className="flex-1 text-center text-[10px] font-bold text-zinc-500 tabular-nums">
              {Number.isInteger(pts) ? pts : pts >= 9.95 ? '10' : pts.toFixed(1)}
            </span>
          );
        })}
      </div>
    </div>
  );
}