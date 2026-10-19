// Study-wide settings shared by the game and the wiki.

/** The single study worker (see /study-worker). Set after `wrangler deploy`. */
export const WORKER_URL = 'https://study-worker.franklinh.workers.dev';

/** Prolific links. Paste the codes from your Prolific study's
 * "Study completion" settings. Pilot/test participants never see these. */
export const PROLIFIC = {
  /** Shown/redirected after the post-test. */
  completeUrl: 'https://app.prolific.com/submissions/complete?cc=TODO_COMPLETE',
  /** Used when someone declines consent (Prolific "returned" code). */
  noConsentUrl: 'https://app.prolific.com/submissions/complete?cc=TODO_NO_CONSENT',
};

/** Minimum screen size, matching the information sheet (1024 x 600). */
export const MIN_SCREEN = { width: 1024, height: 600 };
