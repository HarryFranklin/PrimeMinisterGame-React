/**
 * All on-screen wording for the utility elicitation block, in one place.
 *
 * Gamble wording follows Cooper et al. (2026)'s supplementary material,
 * adapted to a sure LS X vs an LS 10 / LS 2 lottery (no death).
 */
import { GambleBlock } from '../../utils/ElicitationEngine';  

export const INTRO_EMAIL = {
  title: 'A request from the Treasury',
    message:
    'Prime Minister,\n\n' +
    'Before your next term, the Treasury needs to settle a question every wellbeing government faces: is every point of life satisfaction worth the same, wherever it falls?\n\n' +
    'One way researchers answer this is to ask people to choose between a sure outcome and a gamble. The next three decisions are about the citizens you govern.',
  button: 'Begin',
};

export const PAUSE_CARD = {
  kicker: 'Simulation paused',
  title: 'Step out of the PM role',
  body:
    'These three questions are about you and your own life, not the country. There are no right or wrong answers: choose what you would genuinely do.',
  button: 'Start',
};

interface BlockText {
  progress: (n: number, total: number) => string;
  /** Full scenario, shown on the first gamble of the block. */
  scenario: (x: number) => string;
  /** Short version, shown on later gambles (full version on request). */
  compact: (x: number) => string;
  showFull: string;
  hideFull: string;
  optionA: { name: string; detail: (x: number) => string };
  optionB: { name: string; detail: string };
  /** How the risk is described under the odds grid. */
  oddsLine: (label: string) => string;
  successLegend: string;
  failureLegend: string;
  veil?: string;
  question: string;
  /** Line shown above the options after the player turns the gamble down. */
  followUp: string;
  buttons: { a: string; b: string; equal: string };
}

export const BLOCK_TEXT: Record<GambleBlock, BlockText> = {
  personal: {
    progress: (n, total) => `Personal decision ${n} of ${total}`,
    scenario: (x) =>
      `Imagine you are in a situation where you rate your life satisfaction as ${x} out of 10.\n\n` +
      'Imagine that all your life, you have had a chronic health condition which you were born with, and which restricts your life somewhat. One day your doctor says you must choose between two treatments for this condition.',
    compact: (x) =>
      `Your life satisfaction is ${x}. Treatment A keeps it at ${x}. Treatment B raises it to 10 if it succeeds, or drops it to 2 if it fails.`,
    showFull: 'Show the full scenario',
    hideFull: 'Hide the full scenario',
    optionA: {
      name: 'Treatment A',
      detail: (x) => `Guaranteed outcome. Your life satisfaction after treatment would be ${x}.`,
    },
    optionB: {
      name: 'Treatment B',
      detail: 'Potentially better, but carries risk. If it succeeds, your life satisfaction improves to 10. If it fails, it falls to 2.',
    },
    oddsLine: (label) => `It fails for ${label} people.`,
    successLegend: 'Succeeds: LS 10',
    failureLegend: 'Fails: LS 2',
    question: 'Which treatment would you choose?',
    followUp: 'You chose Treatment A. Now suppose Treatment B were safer:',
    buttons: { a: 'Choose Treatment A', b: 'Choose Treatment B', equal: 'Both options seemed equally good' },
  },
  social: {
    progress: (n, total) => `Policy decision ${n} of ${total}`,
    scenario: (x) =>
      'As Prime Minister, you must choose between two policies affecting a large group of people. ' +
      `Currently, everyone in the group rates their life satisfaction as ${x} out of 10.`,
    compact: (x) =>
      `Everyone is currently at ${x}. Policy A keeps everyone at ${x}. Policy B raises some people to 10 and drops others to 2.`,
    showFull: 'Show the full scenario',
    hideFull: 'Hide the full scenario',
    optionA: {
      name: 'Policy A',
      detail: (x) => `Guaranteed outcome. Everyone’s life satisfaction afterwards would be ${x}.`,
    },
    optionB: {
      name: 'Policy B',
      detail: 'Outcomes vary between people. Some rise to 10, but others fall to 2. You cannot tell beforehand who will benefit.',
    },
    oddsLine: (label) => `${label} people fall to 2.`,
    successLegend: 'Benefit: LS 10',
    failureLegend: 'Worse off: LS 2',
    veil: 'The policy will affect you as well, though you don’t yet know whether you will benefit or be negatively affected.',
    question: 'Which policy would you choose?',
    followUp: 'You chose Policy A. Now suppose Policy B harmed fewer people:',
    buttons: { a: 'Choose Treatment A', b: 'Choose Treatment B', equal: 'Both options seemed equally good' },
  },
};

// ---------------------------------------------------------------------------
// Pass 2b: asking directly (Layard & Oparina), comparison, questions
// ---------------------------------------------------------------------------

export const DIRECT_FORM = {
  kicker: 'HM Treasury',
  title: 'Wellbeing priority weights',
  intro:
    'Public spending can help people who are struggling and people who are already doing well, but budgets are limited. So the Treasury has to decide: how important is it to improve life satisfaction at different levels?',
  guide:
    'As a guide, suppose it is worth 100 units to help someone move from 2 to 4. On a scale from 0 to 100, where 0 means not at all important and 100 means very important, how important is it to help someone move from each level below to the next?',
  fixedNote: 'Fixed at 100',
  untouched: 'Move the slider',
  lowLabel: 'Not at all important',
  highLabel: 'Very important',
  button: 'Submit to the Treasury',
  waiting: 'Set all three sliders to continue',
};

export const COMPARISON = {
  kicker: 'Civil Service analysis',
  title: 'Three scoring systems, one person',
  intro:
    'The Civil Service has turned your answers into three scoring systems. Each one shows how much a rise in life satisfaction is worth, depending on where someone starts.',
  howToRead:
    'A curve that rises steeply and then flattens means gains at the bottom matter most. The straight line counts every point the same, as in your first term. Hollow dots show your fourth answer, at your own LS where possible.',
  chartTab: 'Chart',
  tableTab: 'Table',
  tableIntro: 'Value of each 2-point rise, with 2→4 set to 100.',
  legend: {
    personal: 'Your personal choices',
    social: 'Your policy choices',
    direct: 'Your Treasury weights',
    linear: 'Every point counts the same',
    you: 'Your LS',
  },
  axisX: 'Life satisfaction',
  axisY: 'Value',
  /** The learning objective, shown to every player. */
  takeaway:
    'Scoring systems can differ depending on the method used and on whose life is at stake, even for the same person.',
  citizens:
    'The citizens you are about to govern answered questions like these. Their answers will score your next two terms.',
  button: 'Continue',
};