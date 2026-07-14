/**
 * Centralised colour dictionaries for consistent visual language across all graphs and tabs.
 * Keeping these here means changing a colour updates the entire app instantly.
 */
import { ElectionCycle } from './types';

export const DEMO_COLORS = {
  wealth: { 'Poor': '#ef4444', 'Middle': '#3b82f6', 'Wealthy': '#10b981' },
  age: { 'Youth': '#ec4899', 'Adult': '#8b5cf6', 'Elderly': '#7ff163' }
};

export const IMPACT_COLORS = {
  'Will improve': '#3b82f6',
  'Will be stable': '#d4d4d8',
  'Will worsen': '#f59e0b'
};

/**
 * The single source of truth for "which colour represents which political
 * framework / Prime Minister". Previously this same set of four hex values
 * was hand-typed independently in frameworkRules.ts (graphColor) and
 * LevelSelectTab.tsx (PM_PROFILES color/colorClass) — if a colour ever
 * changed, both files had to be edited in lockstep, and nothing enforced
 * that. Everything that needs a cycle's colour should read it from here.
 */
export const CYCLE_COLORS: Record<ElectionCycle, string> = {
  [ElectionCycle.Benthamite]: '#ec4899',
  [ElectionCycle.Rawlsian]: '#3b82f6',
  [ElectionCycle.SocietalUtility]: '#10b981',
  [ElectionCycle.PersonalUtility]: '#8b5cf6',
};

/** Tailwind text-colour classes matching CYCLE_COLORS, for places that need a class rather than an inline style/hex. */
export const CYCLE_TEXT_COLOR_CLASS: Record<ElectionCycle, string> = {
  [ElectionCycle.Benthamite]: 'text-pink-600',
  [ElectionCycle.Rawlsian]: 'text-blue-600',
  [ElectionCycle.SocietalUtility]: 'text-emerald-600',
  [ElectionCycle.PersonalUtility]: 'text-purple-600',
};