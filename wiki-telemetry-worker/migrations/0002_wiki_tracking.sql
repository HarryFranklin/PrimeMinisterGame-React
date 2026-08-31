-- Adds tracking for the wiki (the study's control condition).
-- Run with: wrangler d1 migrations apply <DB_NAME>

-- Tags each participant row with which arm of the study they're in.
-- Existing rows (all game data so far) default to 'game'; the wiki
-- registers new participants as 'control'.
ALTER TABLE participants ADD COLUMN condition TEXT DEFAULT 'game';
CREATE INDEX idx_participants_condition ON participants(condition);

-- One row per page visit: when they arrived, when they left, how long
-- they stayed, how far they scrolled, and how that compares to the
-- page's expected reading time. view_index gives you click order
-- ("1st page visited", "2nd", ...) within a participant's session.
CREATE TABLE wiki_page_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_id INTEGER NOT NULL REFERENCES participants(id),
  view_id TEXT UNIQUE NOT NULL,
  page_slug TEXT NOT NULL,
  page_title TEXT,
  view_index INTEGER NOT NULL,
  entered_at INTEGER NOT NULL,
  left_at INTEGER,
  duration_ms INTEGER,
  active_duration_ms INTEGER,   -- duration minus time the tab was hidden/blurred
  max_scroll_pct REAL,
  word_count INTEGER,
  expected_reading_seconds INTEGER,
  met_minimum_reading_time INTEGER,  -- 0/1: did duration clear the expected-time threshold
  received_at INTEGER NOT NULL
);
CREATE INDEX idx_wiki_page_views_participant ON wiki_page_views(participant_id);
CREATE INDEX idx_wiki_page_views_slug ON wiki_page_views(page_slug);

-- Generic event log: link clicks, search usage, theme toggles, etc.
-- event_data is a JSON blob so you can add new event types without
-- another migration.
CREATE TABLE wiki_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_id INTEGER NOT NULL REFERENCES participants(id),
  page_slug TEXT,
  event_type TEXT NOT NULL,
  event_data TEXT,
  occurred_at INTEGER NOT NULL,
  received_at INTEGER NOT NULL
);
CREATE INDEX idx_wiki_events_participant ON wiki_events(participant_id);
