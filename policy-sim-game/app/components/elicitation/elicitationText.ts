/**
 * All on-screen wording for the utility elicitation blocks, in one place.
 *
 * Gamble wording follows Cooper et al. (2026)'s supplementary material,
 * adapted to chained gambles between adjacent levels: a sure LS X vs a
 * lottery between X+2 and X-2 (no death).
 */
import { GambleBlock, lossOutcome, winOutcome } from '../../utils/ElicitationEngine';

/** Opens the social block (before Level 3), after the utility intro. */
export const SOCIAL_INTRO_CARD = {
  kicker: 'Advisers’ briefings',
  title: 'Three decisions for your citizens',
  body:
    'Before your next term, your advisers will bring you three briefings. Each one asks you to choose between a sure outcome and a gamble for a group of citizens. There are no right or wrong answers: choose what you think is best for them.',
  button: 'Read the first briefing',
};

/** Opens the personal block (before Level 4). */
export const PERSONAL_INTRO_CARD = {
  kicker: 'Out of office',
  title: 'Step out of the PM role',
  body:
    'These three questions are about you and your own life, not the country. There are no right or wrong answers: choose what you would genuinely do.',
  button: 'Start',
};

/** Wording shared by both blocks. */
export const GAMBLE_UI = {
  showFull: 'Show the full scenario',
  hideFull: 'Hide the full scenario',
  back: 'Back',
  choose: 'Choose',
  certain: 'Certain',
  equal: 'Both options seem equally good',
  squaresNote: 'Each square is 100 people.',
};

interface BlockText {
  progress: (n: number, total: number) => string;
  /** Full scenario, shown on the first gamble of the block. */
  scenario: (x: number) => string;
  /** Short version, shown on later gambles (full version on request). */
  compact: (x: number) => string;
  optionA: { name: string; detail: (x: number) => string };
  optionB: { name: string; detail: (x: number) => string };
  /** How the risk is described above the odds grid. */
  oddsLine: (label: string, x: number) => string;
  successLegend: (x: number) => string;
  failureLegend: (x: number) => string;
  veil?: string;
  question: string;
  /** Line shown above the options after the player turns the gamble down. */
  followUp: string;
}

export const BLOCK_TEXT: Record<GambleBlock, BlockText> = {
  social: {
    progress: (n, total) => `Briefing ${n} of ${total}`,
    scenario: (x) =>
      'Briefing from your Chief Wellbeing Adviser.\n\n' +
      `A large group of citizens all rate their life satisfaction as ${x} out of 10. ` +
      'The government can fund one of two policies for them.',
    compact: (x) =>
      `Everyone in the group is at ${x}. Policy A keeps everyone at ${x}. Policy B lifts some people to ${winOutcome(x)} but drops others to ${lossOutcome(x)}.`,
    optionA: {
      name: 'Policy A',
      detail: (x) => `Guaranteed outcome. Everyone’s life satisfaction stays at ${x}.`,
    },
    optionB: {
      name: 'Policy B',
      detail: (x) =>
        `Outcomes vary between people. Some rise to ${winOutcome(x)}, but others fall to ${lossOutcome(x)}. No one can tell beforehand who will benefit.`,
    },
    oddsLine: (label, x) => `${label} people fall to ${lossOutcome(x)}.`,
    successLegend: (x) => `Benefit: LS ${winOutcome(x)}`,
    failureLegend: (x) => `Worse off: LS ${lossOutcome(x)}`,
    veil: 'You belong to this group too, but you don’t know whether you would be one of those who benefit or one of those who fall.',
    question: 'Which policy do you fund?',
    followUp: 'You chose Policy A. Now suppose Policy B harmed fewer people:',
  },
  personal: {
    progress: (n, total) => `Personal decision ${n} of ${total}`,
    scenario: (x) =>
      `Imagine your life satisfaction is ${x} out of 10.\n\n` +
      'All your life, you have had a health condition you were born with, which restricts your life somewhat. Your doctor says you must choose between two treatments.',
    compact: (x) =>
      `Your life satisfaction is ${x}. Treatment A keeps it at ${x}. Treatment B raises it to ${winOutcome(x)} if it works, or drops it to ${lossOutcome(x)} if it fails.`,
    optionA: {
      name: 'Treatment A',
      detail: (x) => `Guaranteed outcome. Your life satisfaction stays at ${x}.`,
    },
    optionB: {
      name: 'Treatment B',
      detail: (x) =>
        `Potentially better, but carries risk. If it works, your life satisfaction rises to ${winOutcome(x)}. If it fails, it falls to ${lossOutcome(x)}.`,
    },
    oddsLine: (label) => `It fails for ${label} people.`,
    successLegend: (x) => `Works: LS ${winOutcome(x)}`,
    failureLegend: (x) => `Fails: LS ${lossOutcome(x)}`,
    question: 'Which treatment would you choose?',
    followUp: 'You chose Treatment A. Now suppose Treatment B were safer:',
  },
};

/** End of the personal block: what the player's answers show. */
export const REVEAL_TEXT = {
  kicker: 'Your answers',
  title: 'What your choices reveal',
  socialLabel: 'Deciding for your citizens',
  personalLabel: 'Deciding for yourself',
  /** How the player treated risk in the social block. */
  social: {
    averse: 'you were cautious. You only backed Policy B when few people would fall: a drop counted for more, in your eyes, than an equal rise.',
    neutral: 'you weighed rises and falls about equally. You backed Policy B once the odds were close to even.',
    seeking: 'you were willing to gamble. You backed Policy B even when many people would fall: a rise counted for at least as much as an equal drop.',
  },
  /** Personal block compared with the social block (compareCurves(personal, social)). */
  comparison: {
    lower: 'you were more willing to take a chance than you were for them.',
    higher: 'you were more cautious than you were for them.',
    none: 'you answered in much the same way as you did for them.',
    mixed: 'it depended on where you started: you were more cautious at some levels and less at others.',
  },
  // The public's answers are more cautious for others than for themselves
  // (7.2 vs 5.5 points at LS 4), i.e. direction 'lower'.
  publicMatch: {
    title: 'You’re not alone.',
    body: 'Most people are more protective of others than of themselves, and the public’s answers show the same pattern.',
  },
  publicOther: {
    title: 'How this compares:',
    body: 'most people are more protective of others than of themselves. The public’s answers give the worst-off more weight when deciding for others.',
    opposite: 'that’s less common. Most people are more protective of others than of themselves, and the public’s answers show that pattern.',
  },
  bridge: {
    title: 'What this means for Level 4:',
    body: 'Level 3 judged you by how the public values other people’s lives. Level 4 judges you by how people value their own, which gives the worst-off less extra weight. You’ll face the same policies, through a different lens.',
  },
  chart: {
    title: (from: number, to: number) => `How many points is lifting one person from LS ${from} to LS ${to} worth?`,
    others: 'Deciding for others',
    self: 'Deciding for yourself',
    public: 'Public',
    you: 'You',
    equalLine: 'If every point counted the same (Level 1)',
    note: 'Taller bar: that rise counts for more. Try the other steps to see how the value of a rise changes further up the scale.',
  },
  button: 'Begin Level 4',
};