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
  kicker: 'Adviser’s briefing',
  title: 'A decision for your citizens',
  body:
    'Before your next term, your Chief Wellbeing Adviser brings you one decision: a sure outcome or a gamble, for a group of citizens. If you turn the gamble down, the odds will improve until you would take it. There are no right or wrong answers: choose what you think is best for them.',
  button: 'Read the briefing',
};

/** Opens the personal block (before Level 4). */
export const PERSONAL_INTRO_CARD = {
  kicker: 'Out of office',
  title: 'Step out of the PM role',
  body:
    'This decision is about you and your own life, not the country. If you turn the risky option down, the odds will improve until you would take it. There are no right or wrong answers: choose what you would genuinely do.',
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
  squaresNote: (n: string) => `Each square is ${n} people.`,
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
    progress: (n, total) => (total > 1 ? `Briefing ${n} of ${total}` : 'Your briefing'),
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
    veil: 'You belong to this group too, but you don’t know whether you would be one of those who benefit or one of those who fall. Philosophers call this choosing behind a “veil of ignorance”.',
    question: 'Which policy do you fund?',
    followUp: 'You chose Policy A. Now suppose Policy B harmed fewer people:',
  },
  personal: {
    progress: (n, total) => (total > 1 ? `Personal decision ${n} of ${total}` : 'Your decision'),
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

/** Lines describing one answer. `at` is the ladder label ("1 in 10"). */
interface AnswerLines {
  label: string;
  first: string;
  at: (at: string) => string;
  never: string;
}

/** End of each block: what the player's single answer shows, next to the
 * public's. The ladder chart shows where each option B was accepted. */
export const REVEAL_TEXT = {
  kicker: 'Your answer',
  title: 'What your choice reveals',
  social: {
    label: 'Deciding for your citizens',
    first: 'you backed Policy B straight away, at 1 in 2: a rise counted for at least as much to you as an equal fall.',
    at: (at: string) => `you only backed Policy B once the risk was down to ${at}. A fall from 4 to 2 counted for more, in your eyes, than an equal rise from 4 to 6.`,
    never: 'you never backed Policy B, even at 1 in 1,000,000: protecting people from a fall mattered far more to you than lifting others up.',
  } as AnswerLines,
  personal: {
    label: 'Deciding for yourself',
    first: 'you chose Treatment B straight away, at 1 in 2.',
    at: (at: string) => `you chose Treatment B once the risk was down to ${at}.`,
    never: 'you never chose Treatment B, even at 1 in 1,000,000.',
  } as AnswerLines,
  /** Social reveal: the player's answer for others against the public's. */
  vsPublicLabel: 'Compared with the public',
  vsPublic: {
    higher: (pub: string) => `you were more cautious than most people, who back Policy B at ${pub}.`,
    lower: (pub: string) => `you were more willing to take a chance than most people, who wait until ${pub}.`,
    none: (pub: string) => `you answered like most people, who also back Policy B at ${pub}.`,
  },
  /** Personal reveal: the answer for yourself against the answer for others. */
  comparison: {
    lower: 'That is less cautious than you were for your citizens.',
    higher: 'That is more cautious than you were for your citizens.',
    none: 'That is the same as you chose for your citizens.',
  },
  publicMatch: { title: 'You’re not alone.' },
  publicOther: { title: 'How this compares:' },
  /** The public's pattern, from their answers (self vs others). */
  publicPattern: (self: string, others: string) =>
    `Most people would take a ${self} risk for themselves, but want it down to ${others} before taking it for others. People are more cautious with other people’s lives than with their own.`,
  chart: {
    title: 'Where each gamble was accepted',
    never: 'Never',
    youOthers: 'You, for others',
    publicOthers: 'Most people, for others',
    youSelf: 'You, for yourself',
    publicSelf: 'Most people, for yourself',
    note: 'Further down the ladder = more cautious. The more cautious people are, the more a gain near the bottom of the scale counts compared with the same gain further up.',
  },
  socialBridge: {
    title: 'What this means for Level 3:',
    body: 'Level 3 judges you by social utility (NFI), worked out from the answers your citizens gave to this same briefing. Because most people are cautious when deciding for others, a rise near the bottom of the scale counts for much more than the same rise near the top.',
    button: 'Begin Level 3',
  },
  personalBridge: {
    title: 'What this means for Level 4:',
    body: 'Level 3 judged you by how cautious people are with other people’s lives. Level 4 judges you by how people value their own lives: personal utility (NPS). People take more risk for themselves, so the worst-off get less extra weight than in Level 3. You’ll be offered the same set of bills, judged through a different lens.',
    button: 'Begin Level 4',
  },
};
