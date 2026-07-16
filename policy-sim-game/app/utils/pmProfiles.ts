import { ElectionCycle } from './types';
import { CYCLE_COLORS, CYCLE_TEXT_COLOR_CLASS } from './uiHelpers';

export interface PMProfile {
  cycle: ElectionCycle;
  name: string;
  philosophy: string;
  governance: string;
  metric: string;
  /** Hex colour for this PM's cycle — sourced from the single CYCLE_COLORS map, not redefined here. */
  color: string;
  /** Tailwind text-colour class matching `color`. */
  colorClass: string;
  /** Emoji "face" for this PM — used on the Level Select cards and in the in-game header. */
  emoji: string;
}

/**
 * The single source of truth for each Prime Minister's character data.
 * Originally this lived only inside LevelSelectTab.tsx; it's shared here so
 * any component representing "which PM/cycle is this" — the level select
 * cards, the in-game header, briefing/verdict modals, etc — draws from the
 * same name, colour and face rather than each screen defining its own copy.
 */
export const PM_PROFILES: PMProfile[] = [
  {
    cycle: ElectionCycle.Benthamite,
    name: "PM Victoria Sterling",
    philosophy: "Utilitarian Growth",
    governance: "I will govern for the majority. A rising tide lifts all boats — my job is to maximise total national happiness, even if some are left behind.",
    metric: "National Average Life Satisfaction",
    color: CYCLE_COLORS[ElectionCycle.Benthamite],
    colorClass: CYCLE_TEXT_COLOR_CLASS[ElectionCycle.Benthamite],
    emoji: "👩🏻",
  },
  {
    cycle: ElectionCycle.Rawlsian,
    name: "PM Evelyn Vance",
    philosophy: "Social Justice",
    governance: "A society is judged by how it treats its most vulnerable, not its most fortunate. I will raise the floor before I ever worry about the ceiling.",
    metric: "Minimum Wellbeing Baseline",
    color: CYCLE_COLORS[ElectionCycle.Rawlsian],
    colorClass: CYCLE_TEXT_COLOR_CLASS[ElectionCycle.Rawlsian],
    emoji: "👩🏾",
  },
  {
    cycle: ElectionCycle.SocietalUtility,
    name: "PM Eleanor Croft",
    philosophy: "Social Cohesion",
    governance: "Growth means nothing if people can see it passing them by. Visible inequality breeds resentment — we rise together, or we don't really rise at all.",
    metric: "National Fairness Index",
    color: CYCLE_COLORS[ElectionCycle.SocietalUtility],
    colorClass: CYCLE_TEXT_COLOR_CLASS[ElectionCycle.SocietalUtility],
    emoji: "🧑🏽",
  },
  {
    cycle: ElectionCycle.PersonalUtility,
    name: "PM Julian Thorne",
    philosophy: "Individual Liberty",
    governance: "You know your own life better than any minister ever could. My job isn't to decide what's good for you — it's to get out of your way and let you keep what you've earned.",
    metric: "National Personal Satisfaction",
    color: CYCLE_COLORS[ElectionCycle.PersonalUtility],
    colorClass: CYCLE_TEXT_COLOR_CLASS[ElectionCycle.PersonalUtility],
    emoji: "👨🏿",
  },
];

const PM_PROFILE_MAP: Record<ElectionCycle, PMProfile> = PM_PROFILES.reduce((acc, profile) => {
  acc[profile.cycle] = profile;
  return acc;
}, {} as Record<ElectionCycle, PMProfile>);

/** Convenience lookup — e.g. getPMProfile(currentCycle).emoji in the header. */
export const getPMProfile = (cycle: ElectionCycle): PMProfile => PM_PROFILE_MAP[cycle];
