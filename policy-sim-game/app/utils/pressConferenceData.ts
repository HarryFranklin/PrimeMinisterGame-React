import { ElectionCycle } from './types';

export interface PressPerson {
  name: string;
  outlet: string;
  emoji: string;
}

/**
 * A pool of fictional journalists/outlets, one picked at random per press
 * conference so the same face isn't asking every time. Kept separate from
 * PM_PROFILES/dpm-style "recurring character" data on purpose — these are
 * meant to feel like an anonymous press pool, not named recurring cast.
 */
export const PRESS_PEOPLE: PressPerson[] = [
  { name: "Priya Nair", outlet: "The Daily Ledger", emoji: "👩🏽" },
  { name: "Tom Fitzgerald", outlet: "Channel 6 News", emoji: "👨🏻" },
  { name: "Wei Chen", outlet: "The National Post", emoji: "🧑🏻" },
  { name: "Amara Bello", outlet: "Capital Wire", emoji: "👩🏿" },
  { name: "Liam O'Sullivan", outlet: "The Morning Herald", emoji: "👨🏼" },
  { name: "Sofia Reyes", outlet: "Public Eye Weekly", emoji: "👩🏻" },
];

export const getRandomPressPerson = (): PressPerson =>
  PRESS_PEOPLE[Math.floor(Math.random() * PRESS_PEOPLE.length)];

interface MetricQuestionOption {
  text: string;
  /** Which cycle this phrasing actually describes — the option is correct iff this matches the current cycle. */
  cycle: ElectionCycle;
}

/**
 * Each cycle's own metric, reworded away from its exact in-game phrasing —
 * this is deliberate: recognising the words verbatim isn't the same as
 * understanding the concept, so the correct option below never repeats
 * FRAMEWORK_RULES[cycle].targetMetricName or targetMetricDescription word
 * for word.
 */
const METRIC_REPHRASINGS: Record<ElectionCycle, string> = {
  [ElectionCycle.Benthamite]: "The average happiness score across the whole population, with every citizen's situation considered equally.",
  [ElectionCycle.Rawlsian]: "The wellbeing of whichever single citizen is currently faring the worst in the country.",
  [ElectionCycle.SocietalUtility]: "How fair the overall spread of happiness looks to citizens observing everyone else's lives, not just their own.",
  [ElectionCycle.PersonalUtility]: "How much a change is actually worth to someone, once you account for the fact that comfortable people gain less from help than struggling people do.",
};

/**
 * Hand-picked wrong options per cycle, rather than derived automatically.
 * Each pair is chosen to be a plausible confusion for that specific
 * framework — e.g. Benthamite's wrong options are Rawlsian (easy to
 * conflate "the average" with "the worst-off") and Personal Utility (both
 * involve averaging), rather than a random pair of the remaining three.
 */
const WRONG_OPTION_CYCLES: Record<ElectionCycle, [ElectionCycle, ElectionCycle]> = {
  [ElectionCycle.Benthamite]: [ElectionCycle.Rawlsian, ElectionCycle.PersonalUtility],
  [ElectionCycle.Rawlsian]: [ElectionCycle.SocietalUtility, ElectionCycle.Benthamite],
  [ElectionCycle.SocietalUtility]: [ElectionCycle.Rawlsian, ElectionCycle.Benthamite],
  [ElectionCycle.PersonalUtility]: [ElectionCycle.Benthamite, ElectionCycle.SocietalUtility],
};

export interface MetricQuestion {
  prompt: string;
  options: MetricQuestionOption[];
  correctIndex: number;
}

/**
 * Builds "what did you actually govern by" as a 3-option question with the
 * options shuffled (so the correct answer isn't always in the same slot).
 */
export function buildMetricQuestion(cycle: ElectionCycle): MetricQuestion {
  const [wrongA, wrongB] = WRONG_OPTION_CYCLES[cycle];
  const options: MetricQuestionOption[] = [
    { text: METRIC_REPHRASINGS[cycle], cycle },
    { text: METRIC_REPHRASINGS[wrongA], cycle: wrongA },
    { text: METRIC_REPHRASINGS[wrongB], cycle: wrongB },
  ];

  // Deterministic-per-cycle shuffle (not re-randomised on every re-render,
  // just varied so the answer isn't always option A) — simple rotation
  // keyed off the cycle's own numeric value.
  const rotation = cycle % 3;
  const rotated = [...options.slice(rotation), ...options.slice(0, rotation)];
  const correctIndex = rotated.findIndex(o => o.cycle === cycle);

  return {
    prompt: "You've led your government according to a specific measure of success this term. Which of these best describes what you were actually optimising for?",
    options: rotated,
    correctIndex,
  };
}
