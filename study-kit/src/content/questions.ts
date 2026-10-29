// ============================================================================
// Baseline (pre-test) and post-test questions – SINGLE SOURCE OF TRUTH.
// From "5. Learning Objectives and Questionnaire" (19 Oct 2026), plus
// demographics adapted from the supervisor's earlier survey (surveyForms.js).
//
// Both apps render these with the same component, so a change here reaches
// both arms. Bump QUESTIONNAIRE_VERSION when wording changes – it's saved
// with every participant's answers.
//
// Answers are stored by item id (and row id for grids), e.g.
//   pretest.answers.ls = 7, posttest.answers['lo3_2'] = { benthamite: 'X', … }
//
// Chart data: charts.json. Correct answers: /study-kit/answer-key.json (not
// shipped to participants' browsers; used by the export's scoring).
// ============================================================================

import charts from './charts.json';

export const QUESTIONNAIRE_VERSION = 'q-0.6 (29 Oct 2026, draft)';

export type Condition = 'game' | 'wiki';
export type Phase = 'pre' | 'post';
/** Text that differs between arms: { game: '…', wiki: '…' }. */
export type ArmText = string | Record<Condition, string>;

export interface Option {
  value: string;
  label: string;
}

/** A statement in a grid; its wording can differ between arms. */
export interface GridRow {
  value: string;
  label: ArmText;
}

interface ItemBase {
  id: string;
  prompt: ArmText;
  help?: string;
  /** Default true. Optional items can be left blank. */
  required?: boolean;
  /** Only shown to this arm. Keep arm-only items LAST (in the phase or on
   * their page) so every shared question has the same number in both arms. */
  onlyFor?: Condition;
  /** Shown without a question number (e.g. optional final comments). */
  unnumbered?: boolean;
}

export type Item =
  | (ItemBase & { type: 'single'; options: Option[] })
  | (ItemBase & { type: 'multi'; options: Option[] }) // "select all that apply"; none ticked is a valid answer
  | (ItemBase & {
      type: 'number';
      min?: number;
      max?: number;
      integer?: boolean;
      prefix?: string;
      suffix?: string;
      /** Extra button(s) that count as an answer instead of a number. */
      alternatives?: Option[];
    })
  | (ItemBase & { type: 'scale'; min: number; max: number; lowLabel: string; highLabel: string; alternatives?: Option[] })
  | (ItemBase & {
      type: 'grid'; // one answer per row
      rows: GridRow[];
      options: Option[];
      /** 'matrix': statements down the side, the answer scale across the top
       * once (for agree/disagree batteries). Default 'cards': each row in its
       * own box with its own buttons (for rows whose answers are long). */
      layout?: 'cards' | 'matrix';
      /** Show the rows in a random order, fixed per participant. The order
       * shown is saved with the answers (`row_orders`). */
      shuffleRows?: boolean;
    })
  | (ItemBase & { type: 'text'; multiline?: boolean; /** Default 200 (one line) / 1500 (multiline). */ maxLength?: number });

/** Non-question content (info, charts, tables). Shown inside the box of the
 * question that FOLLOWS it, under that question's number. */
export type Block =
  | { type: 'info'; text: ArmText }
  | { type: 'charts'; charts: string[] } // ids in DISTRIBUTIONS
  | { type: 'table'; columns: string[]; rows: string[][] };

export interface Page {
  id: string;
  title: string;
  intro?: string;
  onlyFor?: Condition;
  content: (Item | Block)[];
}

// ---------------------------------------------------------------------------
// Shared option sets
// ---------------------------------------------------------------------------
const PREFER_NOT: Option = { value: 'prefer_not', label: 'Prefer not to say' };
const DONT_KNOW: Option = { value: 'dont_know', label: 'I don’t know' };

const AGREE5: Option[] = [
  { value: '1', label: 'Disagree fully' },
  { value: '2', label: 'Disagree a little' },
  { value: '3', label: 'Neither agree nor disagree' },
  { value: '4', label: 'Agree a little' },
  { value: '5', label: 'Agree fully' },
];

const opts = (...labels: string[]): Option[] =>
  labels.map((label, i) => ({ value: String.fromCharCode(97 + i), label })); // a, b, c…

// ---------------------------------------------------------------------------
// Charts used in questions live in charts.json (shared with the scoring script,
// which works out the LO1 / LO2.3 answers from the same numbers).
// ---------------------------------------------------------------------------
export const DISTRIBUTIONS: Record<string, { label: string; counts: number[] | null }> = Object.fromEntries(
  Object.entries(charts).filter(([k]) => !k.startsWith('_')) as [string, { label: string; counts: number[] }][]
);

/** Shared options for the two "where would the value come from" questions
 * (personal = d, social = c). */
const UTILITY_SOURCES: Option[] = opts(
  'Asking people how much gains for others are worth, based on the risks they would take in their own life',
  'Asking people how much a gain in their own life is worth, based on choices they would make if they were in charge of others',
  'Asking people how much gains for others are worth, based on choices they would make if they were in charge of others',
  'Asking people how much a gain in their own life is worth, based on choices they would make about their own life'
);

const SOCIETIES_AB: Option[] = [
  { value: 'A', label: 'Society A' },
  { value: 'B', label: 'Society B' },
];
const SOCIETIES_ABC: Option[] = [...SOCIETIES_AB, { value: 'C', label: 'Society C' }];
// Post-test chart questions: two societies, like the baseline, so guessing has
// the same 50% chance before and after.
const SOCIETIES_12: Option[] = [
  { value: '1', label: 'Society 1' },
  { value: '2', label: 'Society 2' },
];

// ---------------------------------------------------------------------------
// Experience questionnaire (validated scales; see the "Experience
// questionnaire" doc). Row ids name the subscale so the export can score them
// (study-kit/scales.mjs). Keep each scale's own response format.
// ---------------------------------------------------------------------------
const nums = (labels: string[], first = 1): Option[] => labels.map((label, i) => ({ value: String(first + i), label }));
/** UES-SF: 1–5 agreement. */
const AGREE5_UES = nums(['Strongly disagree', 'Disagree', 'Neither agree nor disagree', 'Agree', 'Strongly agree']);
/** IMI: 1–7, not at all true – very true. */
const TRUE7 = nums(['1 – Not at all true', '2', '3', '4 – Somewhat true', '5', '6', '7 – Very true']);
/** miniPXI: −3 to +3 (stored as -3…3), with the PXI's own labels. */
const PXI7 = nums(['Strongly disagree', 'Disagree', 'Slightly disagree', 'Neither agree nor disagree', 'Slightly agree', 'Agree', 'Strongly agree'], -3);
/** Self-rated understanding: 1–5. */
const WELL5 = nums(['1 – Not at all well', '2', '3', '4', '5 – Very well']);

/** Text that names the activity: "the game" / "the guide". */
const arm = (game: string, wiki: string) => ({ game, wiki });

/** Part D: one item per learning objective, asked before and after (same id in both). */
const CONFIDENCE_PAGE: Page = {
  id: 'confidence',
  title: 'How confident are you?',
  content: [
    {
      id: 'conf',
      type: 'grid',
      layout: 'matrix',
      prompt: 'How well could you explain or do each of these right now?',
      help: 'There are no right or wrong answers.',
      options: WELL5,
      rows: [
        { value: 'lo1', label: 'Read a chart of a society’s life satisfaction scores and say which society has the higher average, the higher floor, or more inequality' },
        { value: 'lo2', label: 'Explain how judging a country by its average differs from judging it by how its worst-off people are doing' },
        { value: 'lo3', label: 'Explain why a one-point rise in life satisfaction can be worth more to some people than to others' },
        { value: 'lo4', label: 'Explain the difference between how people value their own lives and how they value other people’s lives when judging policy' },
      ],
    },
  ],
};

/** Parts A–C (+ E in the game arm): asked straight after the game / wiki, before the knowledge questions. */
const EXPERIENCE_PAGES: Page[] = [
  {
    // Part A – User Engagement Scale short form (O'Brien, Cairns & Hall 2018). fa = focused
    // attention, pu = perceived usability (reverse-scored), ae = aesthetic appeal, rw = reward.
    id: 'engagement',
    title: 'Your experience',
    content: [
      {
        id: 'ues',
        type: 'grid',
        layout: 'matrix',
        shuffleRows: true,
        prompt: arm('Thinking about the game you just played, how much do you agree with each statement?', 'Thinking about the guide you just read, how much do you agree with each statement?'),
        options: AGREE5_UES,
        rows: [
          { value: 'fa1', label: 'I lost myself in this experience.' },
          { value: 'fa2', label: arm('The time I spent using the game just slipped away.', 'The time I spent using the guide just slipped away.') },
          { value: 'fa3', label: 'I was absorbed in this experience.' },
          { value: 'pu1', label: arm('I felt frustrated while using the game.', 'I felt frustrated while using the guide.') },
          { value: 'pu2', label: arm('I found the game confusing to use.', 'I found the guide confusing to use.') },
          { value: 'pu3', label: arm('Using the game was taxing.', 'Using the guide was taxing.') },
          { value: 'ae1', label: arm('The game was attractive.', 'The guide was attractive.') },
          { value: 'ae2', label: arm('The game was aesthetically appealing.', 'The guide was aesthetically appealing.') },
          { value: 'ae3', label: arm('The game appealed to my visual senses.', 'The guide appealed to my visual senses.') },
          { value: 'rw1', label: arm('Using the game was worthwhile.', 'Using the guide was worthwhile.') },
          { value: 'rw2', label: 'My experience was rewarding.' },
          { value: 'rw3', label: 'I felt interested in this experience.' },
        ],
      },
    ],
  },
  {
    // Part B – Intrinsic Motivation Inventory subsets: ie = interest/enjoyment, pc = perceived
    // competence (reworded to understanding the ideas), vu = value/usefulness. ie3, pc3 reversed.
    // Part C – Paas (1992) mental effort.
    id: 'motivation',
    title: 'Your experience',
    content: [
      {
        id: 'imi',
        type: 'grid',
        layout: 'matrix',
        shuffleRows: true,
        prompt: arm('How true is each statement for you, thinking about the game?', 'How true is each statement for you, thinking about the guide?'),
        options: TRUE7,
        rows: [
          { value: 'ie1', label: arm('I enjoyed playing the game very much.', 'I enjoyed reading the guide very much.') },
          { value: 'ie2', label: arm('Playing the game was fun to do.', 'Reading the guide was fun to do.') },
          { value: 'ie3', label: arm('I thought the game was boring.', 'I thought the guide was boring.') },
          { value: 'ie4', label: arm('I would describe the game as very interesting.', 'I would describe the guide as very interesting.') },
          { value: 'pc1', label: arm('After working through the game for a while, I felt pretty competent with its ideas.', 'After working through the guide for a while, I felt pretty competent with its ideas.') },
          { value: 'pc2', label: arm('I am satisfied with how well I understood the ideas in the game.', 'I am satisfied with how well I understood the ideas in the guide.') },
          { value: 'pc3', label: arm('I couldn’t follow the ideas in the game very well.', 'I couldn’t follow the ideas in the guide very well.') },
          { value: 'vu1', label: arm('I believe the game could be of some value to me.', 'I believe the guide could be of some value to me.') },
          { value: 'vu2', label: arm('I think the game is useful for understanding how a government could judge whether its policies are working.', 'I think the guide is useful for understanding how a government could judge whether its policies are working.') },
          { value: 'vu3', label: arm('I think the game could help me think critically about how policies affect different groups in society.', 'I think the guide could help me think critically about how policies affect different groups in society.') },
        ],
      },
      {
        id: 'effort',
        type: 'scale',
        min: 1,
        max: 9,
        lowLabel: 'Very, very low mental effort',
        highLabel: 'Very, very high mental effort',
        prompt: arm('How much mental effort did you invest in the game?', 'How much mental effort did you invest in the guide?'),
      },
    ],
  },
  {
    // Part E – miniPXI (Haider et al. 2022), one item per construct, + the custom impact item.
    id: 'about_game',
    title: 'About the game',
    onlyFor: 'game',
    content: [
      {
        id: 'pxi',
        type: 'grid',
        unnumbered: true, // game arm only: unnumbered so shared questions keep the same numbers in both arms
        layout: 'matrix',
        shuffleRows: true,
        prompt: 'How much do you agree with each statement about the game?',
        options: PXI7,
        rows: [
          { value: 'aa', label: 'I liked the look and feel of the game.' },
          { value: 'ch', label: 'The game was not too easy and not too hard to play.' },
          { value: 'ec', label: 'It was easy to know how to perform actions in the game.' },
          { value: 'gr', label: 'The goals of the game were clear to me.' },
          { value: 'pf', label: 'The game gave clear feedback on my progress towards the goals.' },
          { value: 'aut', label: 'I felt free to play the game in my own way.' },
          { value: 'cur', label: 'I wanted to explore how the game evolved.' },
          { value: 'imm', label: 'I was fully focused on the game.' },
          { value: 'mas', label: 'I felt I was good at playing this game.' },
          { value: 'mea', label: 'Playing the game was meaningful to me.' },
          { value: 'enj', label: 'I had a good time playing this game.' },
        ],
      },
      { id: 'exp_impact', type: 'single', unnumbered: true, options: AGREE5, prompt: 'I felt that my decisions had a meaningful impact on the outcomes in the game.' },
    ],
  },
];

// ============================================================================
// BASELINE (pre-test)
// ============================================================================
export const PRETEST: Page[] = [
  {
    id: 'about_you',
    title: 'About you',
    intro:
      'We collect anonymous background information to help us understand our participants. Every question on this page is optional – choose “Prefer not to say” for any you would rather not answer.',
    content: [
      { id: 'age', type: 'number', prompt: 'What is your age?', min: 18, max: 120, integer: true, suffix: 'years', alternatives: [PREFER_NOT] },
      {
        id: 'gender',
        type: 'single',
        prompt: 'You identify as…',
        options: [
          { value: 'female', label: 'Female' },
          { value: 'male', label: 'Male' },
          { value: 'other', label: 'Other' },
          PREFER_NOT,
        ],
      },
      {
        id: 'employment',
        type: 'single',
        prompt: 'What is your employment status?',
        options: [
          { value: 'employed_full', label: 'Employed full time' },
          { value: 'employed_part', label: 'Employed part time' },
          { value: 'self_employed', label: 'Self employed' },
          { value: 'unemployed', label: 'Unemployed, looking for work' },
          { value: 'not_working_health', label: 'Not working because of poor health' },
          { value: 'house_person', label: 'Full-time house-person' },
          { value: 'student', label: 'Full time student' },
          { value: 'retired', label: 'Retired' },
          { value: 'other', label: 'Other' },
          PREFER_NOT,
        ],
      },
      {
        // PROPOSED bands – check with supervisor.
        id: 'income',
        type: 'single',
        prompt: 'What is your total household income per year, before tax?',
        options: [
          { value: 'lt20', label: 'Under £20,000' },
          { value: '20_40', label: '£20,000 – £39,999' },
          { value: '40_60', label: '£40,000 – £59,999' },
          { value: '60_80', label: '£60,000 – £79,999' },
          { value: '80_100', label: '£80,000 – £99,999' },
          { value: 'ge100', label: '£100,000 or more' },
          PREFER_NOT,
        ],
      },
      {
        id: 'politics',
        type: 'single',
        prompt: 'Regarding politics, do you consider yourself more left leaning or right leaning?',
        options: [
          { value: 'left', label: 'Left leaning' },
          { value: 'neither', label: 'Neither left nor right' },
          { value: 'right', label: 'Right leaning' },
          PREFER_NOT,
        ],
      },
    ],
  },
  {
    id: 'life_satisfaction',
    title: 'Your life satisfaction',
    content: [
      {
        id: 'ls',
        type: 'scale',
        prompt: 'Overall, how satisfied are you with your life nowadays?',
        min: 0,
        max: 10,
        lowLabel: 'Not at all satisfied',
        highLabel: 'Completely satisfied',
        alternatives: [PREFER_NOT],
      },
    ],
  },
  {
    id: 'background',
    title: 'Your background',
    content: [
      {
        id: 'prior_study',
        type: 'single',
        prompt: 'Have you studied economics, philosophy or politics?',
        help: 'Choose the highest level. Informal study counts too (e.g. reading, online courses) – pick the level it is closest to.',
        options: [
          { value: 'no', label: 'No' },
          { value: 'school', label: 'Yes – school or equivalent level (e.g. GCSE, A level)' },
          { value: 'ug', label: 'Yes – undergraduate or equivalent level' },
          { value: 'pg', label: 'Yes – postgraduate or equivalent level' },
        ],
      },
      {
        id: 'interest',
        type: 'scale',
        prompt: 'How interested are you in economics, politics or public policy?',
        min: 1,
        max: 5,
        lowLabel: 'Not at all',
        highLabel: 'Very',
      },
    ],
  },
  {
    id: 'numeracy',
    title: 'Numbers',
    intro:
      'The following questions are intended to test your mathematical knowledge. They are not an attention check and there is no penalty for giving the wrong answer or clicking “I don’t know.” Please answer based on the knowledge you have – do not look up answers online or elsewhere.',
    content: [
      {
        id: 'n1',
        type: 'single',
        prompt: 'Which of the following represents the biggest risk of something happening?',
        options: [...opts('1 in 100', '1 in 1,000', '1 in 10'), DONT_KNOW],
      },
      {
        id: 'n2',
        type: 'number',
        prompt: 'If something has a 1 in 1,000 chance of happening, how many times would you expect it to happen in 10,000 tries?',
        min: 0,
        suffix: 'times',
        alternatives: [DONT_KNOW],
      },
      {
        id: 'n3',
        type: 'number',
        prompt:
          'A gambling machine costs £1 to play. 90% of the time, the player will win nothing, but 10% of the time the player wins £5. If you were to play 100 times, this would cost you £100. How much would you expect to win? (Do not deduct the £100 you paid.)',
        min: 0,
        prefix: '£',
        alternatives: [DONT_KNOW],
      },
    ],
  },
  {
    id: 'charts_pre',
    title: 'Reading charts',
    intro: 'Each chart shows how many people in a society have each life satisfaction score, from 0 to 10.',
    content: [
      { type: 'charts', charts: ['pre_A', 'pre_B'] },
      { id: 'lo1_1', type: 'single', prompt: 'Which society has the higher average (mean) life satisfaction?', options: SOCIETIES_AB },
      { id: 'lo1_2', type: 'single', prompt: 'Which society has the higher floor (lowest life satisfaction present)?', options: SOCIETIES_AB },
      { id: 'lo1_3', type: 'single', prompt: 'Which society has the larger spread (more inequality)?', options: SOCIETIES_AB },
    ],
  },
  {
    id: 'intuitions',
    title: 'Your intuitions',
    intro: 'There are no right or wrong answers here – we are interested in what you think.',
    content: [
      {
        id: 'bi1',
        type: 'single',
        prompt:
          'A policy could raise one person’s life satisfaction by exactly one point. Should that gain count for more if the person starts at 2/10 than if they start at 8/10?',
        options: opts('Yes, it should count for more', 'No, it should count the same', 'It should count for less', 'Not sure'),
      },
      { type: 'info', text: '- **Society X:** all 10 people are at 6/10.\n- **Society Y:** 9 people are at 8/10 and 1 person is at 2/10.' },
      {
        id: 'bi2',
        type: 'grid',
        prompt: 'Which society would you choose?',
        rows: [
          { value: 'self', label: 'You’ll be placed at random in one of these societies. Which would you choose to live in?' },
          { value: 'others', label: 'You’re in charge and must choose which society to create for everyone else. Which would you choose?' },
        ],
        options: [
          { value: 'X', label: 'Society X' },
          { value: 'Y', label: 'Society Y' },
        ],
      },
    ],
  },
  CONFIDENCE_PAGE,
  {
    // Game group only, and last, so it never shifts other question numbers.
    id: 'gaming',
    title: 'Video games',
    onlyFor: 'game',
    content: [
      {
        id: 'gaming_frequency',
        type: 'single',
        prompt: 'How often do you play video games?',
        options: [
          { value: 'never', label: 'Never' },
          { value: 'rarely', label: 'Rarely' },
          { value: 'monthly', label: 'Monthly' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'daily', label: 'Daily' },
        ],
      },
      {
        id: 'gaming_types',
        type: 'multi',
        prompt: 'What types of games do you play?',
        options: [
          { value: 'puzzle', label: 'Puzzle' },
          { value: 'strategy', label: 'Strategy' },
          { value: 'simulation', label: 'Simulation / management' },
          { value: 'rpg', label: 'Role-playing' },
          { value: 'action', label: 'Action / adventure' },
          { value: 'shooter', label: 'Shooter' },
          { value: 'sports', label: 'Sports / racing' },
          { value: 'casual', label: 'Casual / mobile' },
          { value: 'party', label: 'Party / social' },
          { value: 'other', label: 'Other (please say below)' },
          { value: 'none', label: 'I don’t play video games' },
        ],
      },
      {
        id: 'gaming_types_other',
        type: 'text',
        required: false,
        unnumbered: true,
        maxLength: 100,
        prompt: 'Other types of game (if any):',
      },
    ],
  },
];

// ============================================================================
// POST-TEST
// ============================================================================
export const POSTTEST: Page[] = [
  ...EXPERIENCE_PAGES,
  {
    id: 'charts_post',
    title: 'Reading charts',
    intro: 'Each chart shows how many people in a society have each life satisfaction score, from 0 to 10.',
    content: [
      { type: 'charts', charts: ['post_1', 'post_2'] },
      { id: 'lo1_1', type: 'single', prompt: 'Which society has the higher average (mean) life satisfaction?', options: SOCIETIES_12 },
      { id: 'lo1_2', type: 'single', prompt: 'Which society has the higher floor (lowest life satisfaction present)?', options: SOCIETIES_12 },
      { id: 'lo1_3', type: 'single', prompt: 'Which society has the larger spread (more inequality)?', options: SOCIETIES_12 },
    ],
  },
  {
    id: 'approaches',
    title: 'Two approaches',
    content: [
      {
        id: 'lo2_1',
        type: 'multi',
        prompt: 'Select all that are true about the Benthamite approach:',
        options: opts(
          'Maximises the total life satisfaction gained across everyone',
          'Aims to make everyone’s outcome as equal as possible',
          'Strongly protects whoever has the lowest life satisfaction, even at the cost of gains elsewhere',
          'Can justify large losses to some people if offset by larger gains to others, with no protection for the worst-off'
        ),
      },
      {
        id: 'lo2_2',
        type: 'multi',
        prompt: 'Select all that are true about the Rawlsian approach:',
        options: opts(
          'Treats a 1-point gain as equally valuable, whoever receives it',
          'Maximises the total life satisfaction gained across everyone',
          'Ignores larger benefits to the majority once the floor is addressed',
          'Strongly protects whoever has the lowest life satisfaction, even at the cost of gains elsewhere'
        ),
      },
      { type: 'charts', charts: ['lo2_A', 'lo2_B', 'lo2_C'] },
      {
        id: 'lo2_3',
        type: 'grid',
        prompt: 'Given these 3 societies, which would be classed as the better one under each approach?',
        rows: [
          { value: 'benthamite', label: 'Under Benthamite logic' },
          { value: 'rawlsian', label: 'Under Rawlsian logic' },
        ],
        options: SOCIETIES_ABC,
      },
    ],
  },
  {
    id: 'utility',
    title: 'Utility',
    content: [
      {
        id: 'lo3_1',
        type: 'single',
        prompt: 'Select the correct definition of utility:',
        options: opts(
          'How happy someone says they feel on a given day',
          'The value of a 1-point gain in life satisfaction, which depends on where the person starts',
          'The difference between a decision made for yourself and one made for someone else',
          'The total life satisfaction'
        ),
      },
      {
        type: 'info',
        text: 'A government earns points each time it raises one person’s life satisfaction by 1 point. Under each scoring system below, the points it earns depend on where that person starts. You can assume there are always some people at 2.',
      },
      {
        type: 'table',
        columns: ['Raising one person from…', 'System X', 'System Y', 'System Z'],
        rows: [
          ['2 to 3', '100 points', '100 points', '100 points'],
          ['4 to 5', '100 points', '0 points', '60 points'],
          ['6 to 7', '100 points', '0 points', '30 points'],
          ['8 to 9', '100 points', '0 points', '10 points'],
        ],
      },
      {
        id: 'lo3_2',
        type: 'grid',
        prompt: 'Which system is…',
        rows: [
          { value: 'benthamite', label: 'Benthamite' },
          { value: 'rawlsian', label: 'Rawlsian' },
          { value: 'between', label: 'Somewhere in between' },
        ],
        options: [
          { value: 'X', label: 'System X' },
          { value: 'Y', label: 'System Y' },
          { value: 'Z', label: 'System Z' },
        ],
      },
      {
        id: 'lo3_3',
        type: 'single',
        prompt: { game: 'In the game, where do the utility values come from?', wiki: 'In the wiki, where do the utility values come from?' },
        options: opts(
          'National GDP and economic growth figures',
          'The choices people make between hypothetical gambles',
          'How many people are at each life satisfaction level',
          'How happy people say they feel today'
        ),
      },
    ],
  },
  {
    id: 'personal_social',
    title: 'Personal and social utility',
    content: [
      {
        id: 'lo4_1a',
        type: 'single',
        prompt:
          'Imagine you don’t know which of the 10 people in a society you’d be, and you’re asked in which society you’d rather exist. What is this way of reasoning called?',
        options: opts('The veil of ignorance', 'Diminishing marginal utility', 'Benthamite ethics', 'Risk aversion'),
      },
      {
        id: 'lo4_1b_personal',
        type: 'single',
        prompt: 'If a government chose policies based on **personal utility**, the value of each person’s gain would come from…',
        options: UTILITY_SOURCES,
      },
      {
        id: 'lo4_1b_social',
        type: 'single',
        prompt: 'If a government chose policies based on **social utility**, the value of each person’s gain would come from…',
        options: UTILITY_SOURCES,
      },
      {
        id: 'lo4_2',
        type: 'single',
        prompt: 'Complete the sentence: People’s choices about their own life tend to be ___ than the choices they make on behalf of others.',
        options: opts('Safer/more risk-averse', 'About the same', 'Riskier/more risk-tolerant'),
      },
      {
        id: 'lo4_3',
        type: 'single',
        prompt: 'Which statement best describes the dilemma for government?',
        options: opts(
          'Social utility gives more weight to the worst-off than personal utility does, so the two can recommend different policies',
          'Personal and social utility always recommend the same policy, so the choice doesn’t matter',
          'Personal utility gives more weight to the worst-off than social utility does',
          'The dilemma is only about what a policy costs, not who gains from it'
        ),
      },
      {
        type: 'info',
        text:
          'The table below shows two policies, and how much each person’s 1-point gain is worth under personal and social utility. Policy A raises 5 people by 1 point, from 6 to 7. Policy B raises 1 person by 1 point, from 2 to 3.',
      },
      {
        type: 'table',
        columns: ['Policy', 'People raised', 'Each person goes from…', 'Personal value per person', 'Social value per person'],
        rows: [
          ['A', '5', '6 to 7', '60', '10'],
          ['B', '1', '2 to 3', '100', '100'],
        ],
      },
      {
        id: 'lo4_4',
        type: 'grid',
        prompt: 'Which policy does each approach favour?',
        rows: [
          { value: 'personal', label: 'Personal utility favours…' },
          { value: 'social', label: 'Social utility favours…' },
        ],
        options: [
          { value: 'A', label: 'Policy A' },
          { value: 'B', label: 'Policy B' },
        ],
      },
      { id: 'lo4_4c', type: 'text', multiline: true, prompt: 'Why do they diverge?' },
      {
        id: 'lo4_5',
        type: 'grid',
        prompt: 'Match each argument to the approach it supports:',
        rows: [
          { value: 'a', label: 'It respects the choices people make for their own lives' },
          { value: 'b', label: 'It reflects what people endorse when they’re responsible for others' },
          { value: 'c', label: 'It always maximises total life satisfaction, whoever gains' },
        ],
        options: [
          { value: 'personal', label: 'Personal utility' },
          { value: 'social', label: 'Social utility' },
          { value: 'neither', label: 'Neither' },
        ],
      },
    ],
  },
  CONFIDENCE_PAGE,
  {
    id: 'your_views',
    title: 'Your views',
    intro: 'There are no right or wrong answers here – we are interested in what you think.',
    content: [
      {
        id: 'om1',
        type: 'single',
        prompt: 'How should government decide?',
        options: opts(
          'By the risk and reward people would choose for themselves',
          'By the risk and reward people would choose for others',
          'Something in between',
          'Another way (e.g. Benthamite, Rawlsian, or other)'
        ),
      },
      { id: 'om1_explain', type: 'text', multiline: true, prompt: 'Please explain your answer.' },
      {
        id: 'om2',
        type: 'single',
        prompt: 'Are there policy domains where decisions shouldn’t weigh or trade off life satisfaction at all?',
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
          { value: 'not_sure', label: 'Not sure' },
        ],
      },
      {
        id: 'om2_explain',
        type: 'text',
        multiline: true,
        required: false,
        prompt: 'If so, which, and why?',
        help: 'Examples: NHS funding, education, civil rights, national defence spending, welfare and public health spending, environmental policy.',
      },
    ],
  },
  {
    id: 'comments',
    title: 'Your comments',
    content: [
      {
        id: 'final_comments',
        type: 'text',
        unnumbered: true,
        multiline: true,
        required: false,
        prompt: 'If you have any final comments or feedback on the study, please use the space below (optional).',
      },
    ],
  },
];

/** The pages this participant sees, with arm-only items removed and question
 * numbers (Q1, Q2…) added. Numbers run through the whole phase; because
 * arm-only items come last, shared questions get the same number in both arms. */
export function pagesFor(phase: Phase, condition: Condition): (Page & { content: (Item & { num?: number } | Block)[] })[] {
  const pages = phase === 'pre' ? PRETEST : POSTTEST;
  let n = 0;
  return pages
    .filter((p) => !p.onlyFor || p.onlyFor === condition)
    .map((p) => ({
      ...p,
      content: p.content
        .filter((c) => !('onlyFor' in c) || !c.onlyFor || c.onlyFor === condition)
        .map((c) => ('id' in c && !c.unnumbered ? { ...c, num: ++n } : c)),
    }));
}

/** Resolve arm-specific text. */
export function armText(text: ArmText, condition: Condition): string {
  return typeof text === 'string' ? text : text[condition];
}