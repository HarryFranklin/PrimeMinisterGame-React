-- Fresh schema for the single study worker. BACK UP FIRST:
--   npx wrangler d1 export policy-sim-telemetry --remote --output ../backup-before-study-schema.sql
-- This DELETES all old telemetry tables and their (test) data.

DROP TABLE IF EXISTS cycle_attempts;
DROP TABLE IF EXISTS events_legacy;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS wiki_events;
DROP TABLE IF EXISTS wiki_page_views;
DROP TABLE IF EXISTS wiki_page_completions;
DROP TABLE IF EXISTS wiki_completion_events;
DROP TABLE IF EXISTS participants;

-- One row per participant. Plain columns are for filtering/sorting;
-- everything they do lives in the five JSON cells (pis, consent, pretest,
-- activity, posttest). Updating any number of columns of this row in one
-- statement = ONE row written.
CREATE TABLE participants (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  pid                 TEXT    NOT NULL UNIQUE,  -- Prolific ID (live) or generated PILOT_/TEST_ id
  token               TEXT    NOT NULL,         -- random secret from /start; /sync must present it
  mode                TEXT    NOT NULL,         -- 'live' | 'pilot' | 'test'
  condition           TEXT    NOT NULL,         -- 'game' | 'wiki'
  prolific_pid        TEXT,                     -- cleared at de-identification
  study_id            TEXT,
  prolific_session_id TEXT,
  created_at          INTEGER NOT NULL,         -- epoch ms
  last_seen_at        INTEGER NOT NULL,
  origin              TEXT,                     -- site the first sync came from
  app_version         TEXT,                     -- build commit of the latest sync
  sync_count          INTEGER NOT NULL DEFAULT 0,
  stage               TEXT,                     -- last screen reached (for drop-out analysis)
  consent_status      TEXT    NOT NULL DEFAULT 'pending',  -- 'pending' | 'signed' | 'declined'
  consent_signed_at   INTEGER,
  completed_at        INTEGER,
  final_outcome       TEXT,
  pis                 TEXT,  -- JSON: which sheet/version, opened/confirmed times
  consent             TEXT,  -- JSON: version, each statement ticked + when, signed/declined
  pretest             TEXT,  -- JSON: baseline answers
  activity            TEXT,  -- JSON: game cycles/turns, or wiki page views
  posttest            TEXT   -- JSON: post-test answers
);

-- Used by /start to balance groups. Only written on insert (these columns
-- never change), so it costs nothing on syncs.
CREATE INDEX idx_participants_balance ON participants(mode, condition);
