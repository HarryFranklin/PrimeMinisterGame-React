// Study-wide settings shared by the game and the wiki.

/** The single study worker (see /study-worker). For local testing against
 * `wrangler dev`, set NEXT_PUBLIC_STUDY_WORKER_URL=http://localhost:8787. */
export const WORKER_URL = process.env.NEXT_PUBLIC_STUDY_WORKER_URL || 'https://study-worker.franklinh.workers.dev';

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

/** Shown on the thank-you screen. Keep in line with the information sheet. */
export const CONTACT = { name: 'Harry Franklin', email: 'FranklinH@cardiff.ac.uk', withdrawalDays: 14 };
