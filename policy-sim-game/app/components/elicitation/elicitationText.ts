/**
 * All on-screen wording for the utility elicitation block, in one place.
 *
 * Gamble wording follows Cooper et al. (2026)'s supplementary material,
 * adapted to a sure LS X vs an LS 10 / LS 2 lottery (no death).
 */
import { CurveDirection, GambleBlock } from '../../utils/ElicitationEngine';

export const INTRO_EMAIL = {
  title: 'A request from the Treasury',
  message:
    'Prime Minister,\n\n' +
    'Before your next term, the Treasury needs to settle a question every wellbeing government faces: is every point of life satisfaction worth the same, wherever it falls?\n\n' +
    'Researchers answer this in several ways. Two of the main ones are to ask people to choose between gambles, and to ask them directly. We would like you to try both.\n\n' +
    'The first few questions are personal. The rest are about policy.',
  button: 'Begin',
};

export const PAUSE_CARD = {
  kicker: 'Simulation paused',
  title: 'Step out of the PM role',
  body:
    'These four questions are about you and your own life, not the country. There are no right or wrong answers: choose what you would genuinely do.',
  button: 'Start',
};

export const TRANSITION_CARD = {
  kicker: 'Back in office',
  title: 'The context of these decisions is different',
  body:
    'You are Prime Minister again. The next four decisions are about policies that affect a large group of people, including you. Please read carefully.',
  button: 'Continue',
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
  /** Line shown above the options after the first choice in a gamble. */
  followUp: { afterA: string; afterB: string };
  buttons: { a: string; b: string; unsure: string };
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
    followUp: {
      afterA: 'You chose Treatment A. Now suppose Treatment B were safer:',
      afterB: 'You chose Treatment B. Now suppose Treatment B were riskier:',
    },
    buttons: { a: 'Choose Treatment A', b: 'Choose Treatment B', unsure: 'Can’t choose' },
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
    followUp: {
      afterA: 'You chose Policy A. Now suppose Policy B harmed fewer people:',
      afterB: 'You chose Policy B. Now suppose Policy B harmed more people:',
    },
    buttons: { a: 'Choose Policy A', b: 'Choose Policy B', unsure: 'Can’t choose' },
  },
};

/** Shown on the gamble that uses the player's own LS. */
export const OWN_POINT_NOTE = 'This is the score you gave for your own life.';

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
  /** Caption comparing personal and policy gambles. 'higher' = the
   * personal curve sits above the policy curve (more cautious for yourself).
   * Cooper et al. (2026): median aversion 4.0 for others vs 2.2 for self
   * (no-death gambles); "the latter being even more strongly avoided". */
  personalVsSocial: (different: boolean, direction: CurveDirection) => {
    if (!different || direction === 'none')
      return 'Your personal and policy choices were broadly similar, though in one UK study, people were typically more cautious when deciding for others than for themselves (Cooper et al., 2026).';
    if (direction === 'lower')
      return 'You were more cautious when deciding for others than for yourself. That matches research: in one UK study, people were typically more cautious when deciding for others than for themselves (Cooper et al., 2026).';
    if (direction === 'higher')
      return 'You were more cautious when deciding for yourself than for others. That is less common: in one UK study, people were typically more cautious when deciding for others than for themselves (Cooper et al., 2026).';
    return 'Your personal and policy choices differed, but not in one direction: at some starting levels you were more cautious for yourself, at others for other people. For comparison, in one UK study, people were typically more cautious when deciding for others than for themselves (Cooper et al., 2026).';
  },
  /** Caption comparing policy gambles with Treasury weights. 'higher' = the
   * policy-gamble curve sits above the Treasury curve. Layard & Oparina
   * (2026, p.9) compared their direct method with Cooper's societal
   * gambles, and note the same gap in the income literature. */
  socialVsDirect: (different: boolean, direction: CurveDirection) => {
    if (!different || direction === 'none')
      return 'Your policy choices and your Treasury weights gave broadly similar curves. When researchers compared the two methods, gambles put substantially more weight on gains at the bottom than asking people directly did, a gap also seen in research on income (Layard & Oparina, 2026).';
    if (direction === 'higher')
      return 'Your policy choices put more weight on gains at the bottom than your Treasury weights did. When researchers compared the two methods, gambles put substantially more weight on gains at the bottom than asking people directly did, a gap also seen in research on income (Layard & Oparina, 2026).';
    if (direction === 'lower')
      return 'Your Treasury weights put more weight on gains at the bottom than your policy choices did. That is the opposite of what researchers found. When researchers compared the two methods, gambles put substantially more weight on gains at the bottom than asking people directly did, a gap also seen in research on income (Layard & Oparina, 2026).';
    return 'Your policy choices and your Treasury weights disagreed, but not in one direction: each put more weight on a different part of the scale. When researchers compared the two methods, gambles put substantially more weight on gains at the bottom than asking people directly did, a gap also seen in research on income (Layard & Oparina, 2026).';
  },
  /** The learning objective, shown to every player. */
  takeaway:
    'Scoring systems can differ depending on the method used and on whose life is at stake, even for the same person.',
  citizens:
    'The citizens you are about to govern answered questions like these. Their answers will score your next two terms.',
  button: 'Continue',
};