-- Replaces the four per-event wiki tables with ONE JSON payload column on
-- participants, to minimise rows written/read (one row per participant).
--
-- This DELETES all existing wiki (control group) data. Back up first:
--   npx wrangler d1 export policy-sim-telemetry --remote --output backup-before-0006.sql
-- Game rows (condition = 'game') are not touched.

-- Wiki tables reference participants, so they go first.
DROP TABLE IF EXISTS wiki_events;
DROP TABLE IF EXISTS wiki_page_views;
DROP TABLE IF EXISTS wiki_page_completions;
DROP TABLE IF EXISTS wiki_completion_events;

DELETE FROM participants WHERE condition = 'wiki';

-- The whole wiki session for a participant: page views in order, totals per
-- page, pages marked complete, and the end-of-study choices.
-- NULL for game participants.
ALTER TABLE participants ADD COLUMN wiki_payload TEXT;