# Study data – how-to

Run these from the `study-worker` folder in **Command Prompt** (not PowerShell – PowerShell
treats `$` in the commands as a variable). All commands act on the live database (`--remote`).

## Look at the data

```bat
npm run export
```
Writes CSVs to `study-worker/exports/<date-time>/` (git-ignored): `participants.csv` (one row per
person, all answers as `pre_*` / `post_*` columns), `game_attempts.csv`, `game_turns.csv`,
`wiki_views.csv`, and `raw.json`. Filter on the `mode` column: `live` = real participants,
`pilot` = pilots, `test` = you.

**Scores** are added to `participants.csv` automatically: `pre_numeracy` (/3), `pre_lo1` (/3),
`post_lo1` (/3), `post_lo2` (/4), `post_lo3` (/5), `post_lo4` (/10), `post_total` (LO2–LO4, /19),
plus one `pre_score_…` / `post_score_…` column per item (multi-select items also get a
`_partial` score). Correct answers are in `study-kit/answer-key.json`; the chart questions'
answers are worked out from `study-kit/src/content/charts.json`. `max_scores.json` in each
export lists the maximum for each total.

Quick check of the latest rows:
```bat
npx wrangler d1 execute policy-sim-telemetry --remote --command "SELECT id, pid, mode, condition, stage, consent_status, completed_at FROM participants ORDER BY id DESC LIMIT 10"
```

## A participant asks to withdraw (within the withdrawal window)

Replace `THEIR_PROLIFIC_ID`:
```bat
npx wrangler d1 execute policy-sim-telemetry --remote --command "DELETE FROM participants WHERE prolific_pid = 'THEIR_PROLIFIC_ID'"
```
Then delete any earlier CSV exports that contain them.

## Remove Prolific IDs (after payment AND the 14-day withdrawal window)

The information sheet promises: once payment is done and the withdrawal period has ended, the
Prolific ID is removed from the responses and kept separately as a record of consent.

Pick a cutoff date at least 14 days ago, e.g. `2026-12-01`, and use the **same date** in both steps.

**Step 1 – save the consent record (keep this file on secure university storage, NOT in the repo):**
```bat
npx wrangler d1 execute policy-sim-telemetry --remote --json --command "SELECT prolific_pid, study_id, created_at, consent_signed_at, json_extract(consent, '$.version') AS consent_version FROM participants WHERE mode = 'live' AND prolific_pid IS NOT NULL AND created_at < strftime('%s', '2026-12-01') * 1000" > ..\..\consent-record-2026-12-01.json
```

**Step 2 – remove the IDs from the responses:**
```bat
npx wrangler d1 execute policy-sim-telemetry --remote --command "UPDATE participants SET pid = 'anon_' || id, token = 'void', prolific_pid = NULL, prolific_session_id = NULL, study_id = NULL WHERE mode = 'live' AND prolific_pid IS NOT NULL AND created_at < strftime('%s', '2026-12-01') * 1000"
```
Each person keeps an anonymous ID (`anon_17` …), so their rows in the CSVs still join up.
Afterwards, delete any CSV exports made **before** this step (they contain Prolific IDs) and
export again.

Check (should list only people newer than the cutoff):
```bat
npx wrangler d1 execute policy-sim-telemetry --remote --command "SELECT id, prolific_pid, created_at FROM participants WHERE mode = 'live' AND prolific_pid IS NOT NULL"
```

## Clear your own test rows

Only once you've finished checking them:
```bat
npx wrangler d1 execute policy-sim-telemetry --remote --command "DELETE FROM participants WHERE mode = 'test'"
```

## Back up the whole database

```bat
npx wrangler d1 export policy-sim-telemetry --remote --output ..\..\backup-YYYY-MM-DD.sql
```
(Saves one level above the repo, so it can never be committed.)
