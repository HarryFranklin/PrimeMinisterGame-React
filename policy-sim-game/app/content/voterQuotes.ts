/**
 * VOTER QUOTES
 * ============
 * This file is just words. There's no rendering logic here — that lives in
 * StageElectorateFeedback.tsx and rarely needs to change. If you're editing
 * dialogue, this is the only file you should need to open.
 *
 * HOW A QUOTE IS BUILT
 * --------------------
 * Each voter sentiment (very_negative, negative, ...) has TWO versions:
 * `standard` and `alt`. The game alternates between them so two voters with
 * the same sentiment don't say the identical thing back to back.
 *
 * Each version is a list of SEGMENTS, read in order. A segment is one of:
 *
 *   1) Plain text:
 *        { text: "Some sentence here." }
 *
 *   2) A sentence that references a policy (best or worst one this voter
 *      experienced), which becomes a clickable link in-game:
 *        {
 *          policyRef: 'bestPolicy',                 // or 'worstPolicy'
 *          withPolicy: "I loved {POLICY}!",          // shown if that policy exists
 *          withoutPolicy: "Nothing really changed."  // shown if it doesn't (optional)
 *        }
 *
 * RULES FOR WRITING TEXT
 * -----------------------
 * - Write {pmName} anywhere you want the Prime Minister's surname inserted.
 * - Write {POLICY} exactly once inside `withPolicy` — that's where the
 *   clickable policy name gets inserted. Everything before/after it is
 *   plain text.
 * - `withoutPolicy` is optional. If you leave it out, that whole segment is
 *   just skipped when there's no policy to reference (used for the
 *   "neutral_mixed" sentiment, where a voter might only have a good policy
 *   to mention, or only a bad one, or both).
 * - Use "\n" inside a `text` string to force a line break (used to separate
 *   the voter's opening reaction from their specific detail).
 */

export type VoterSentimentKind =
  | 'very_negative'
  | 'negative'
  | 'neutral_mixed'
  | 'neutral'
  | 'positive'
  | 'very_positive';

export interface PolicyRef {
  id: string;
  name: string;
}

export interface QuoteSegment {
  text?: string;
  policyRef?: 'bestPolicy' | 'worstPolicy';
  withPolicy?: string;
  withoutPolicy?: string;
}

export interface QuoteVariants {
  standard: QuoteSegment[];
  alt: QuoteSegment[];
}

export const VOTER_QUOTES: Record<VoterSentimentKind, QuoteVariants> = {

  very_negative: {
    standard: [
      { text: "Things have gotten really tough since this government took office.\n" },
      {
        policyRef: 'worstPolicy',
        withPolicy: "Having {POLICY} pass made it so much harder to get by, not that {pmName} seems to care.",
        withoutPolicy: "The policies completely ignored my needs, and {pmName} has lost my trust entirely.",
      },
    ],
    alt: [
      { text: "{pmName} has completely lost my trust.\n" },
      {
        policyRef: 'worstPolicy',
        withPolicy: "Things have gotten really tough, and having {POLICY} pass made it so much harder to get by.",
        withoutPolicy: "Things have gotten really tough, and their policies completely ignored my needs.",
      },
    ],
  },

  negative: {
    standard: [
      { text: "I'm definitely worse off than I was.\n" },
      {
        policyRef: 'worstPolicy',
        withPolicy: "{POLICY} really didn't help matters, and I honestly expected better from {pmName}'s administration.",
        withoutPolicy: "The agenda just didn't work for me.",
      },
    ],
    alt: [
      { text: "I honestly expected better from {pmName}.\n" },
      {
        policyRef: 'worstPolicy',
        withPolicy: "I'm definitely worse off than I was, and {POLICY} really didn't help matters.",
        withoutPolicy: "I'm definitely worse off than I was, and the agenda just didn't work for me.",
      },
    ],
  },

  neutral_mixed: {
    // No `withoutPolicy` on either segment below — each clause only
    // appears at all if that particular policy exists for this voter.
    standard: [
      { text: "I haven't noticed much difference overall.\n" },
      { policyRef: 'bestPolicy', withPolicy: "{POLICY} helped a bit, " },
      { policyRef: 'worstPolicy', withPolicy: "but {POLICY} set me back just as much." },
    ],
    alt: [
      { text: "{pmName}'s agenda has been a mixed bag for me.\n" },
      { policyRef: 'bestPolicy', withPolicy: "{POLICY} helped a bit, " },
      { policyRef: 'worstPolicy', withPolicy: "but {POLICY} set me back just as much." },
    ],
  },

  neutral: {
    // No policy references at all — same two lines every time this sentiment shows.
    standard: [
      { text: "My life hasn't changed much at all.\nAll the political noise from {pmName} hasn't really affected my day-to-day." },
    ],
    alt: [
      { text: "{pmName} hasn't really affected my day-to-day.\nMy life hasn't changed much at all despite all the political noise." },
    ],
  },

  positive: {
    standard: [
      { text: "Things are looking up a bit.\n" },
      {
        policyRef: 'bestPolicy',
        withPolicy: "{POLICY} actually made things easier for me, so I'm glad {pmName} finally delivered on that.",
        withoutPolicy: "The agenda seems to be heading in a good direction.",
      },
    ],
    alt: [
      { text: "I'm glad {pmName} is finally delivering.\n" },
      {
        policyRef: 'bestPolicy',
        withPolicy: "Things are looking up a bit, and {POLICY} actually made things easier for me.",
        withoutPolicy: "Things are looking up a bit, and the agenda seems to be heading in a good direction.",
      },
    ],
  },

  very_positive: {
    standard: [
      { text: "I've seen a huge difference!\n" },
      {
        policyRef: 'bestPolicy',
        withPolicy: "{POLICY} really turned things around for me. {pmName} has definitely earned my vote.",
        withoutPolicy: "The agenda directly enhanced my quality of life. {pmName} has definitely earned my vote.",
      },
    ],
    alt: [
      { text: "{pmName} has definitely earned my vote!\n" },
      {
        policyRef: 'bestPolicy',
        withPolicy: "I've seen a huge difference, and {POLICY} really turned things around for me.",
        withoutPolicy: "I've seen a huge difference, and the agenda directly enhanced my quality of life.",
      },
    ],
  },

};