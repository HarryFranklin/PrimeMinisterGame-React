PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_key TEXT NOT NULL UNIQUE,
  user_id TEXT,
  session_id TEXT,
  prolific_pid TEXT,
  study_id TEXT,
  prolific_session_id TEXT,
  app_version TEXT,
  first_seen_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  event_count INTEGER NOT NULL DEFAULT 0
, final_outcome TEXT, last_event TEXT, last_cycle TEXT, last_attempt_number INTEGER, last_turn INTEGER, last_progress_at INTEGER, difficulty_seed INTEGER, win_threshold_scalars TEXT, condition TEXT DEFAULT 'game');
CREATE TABLE IF NOT EXISTS "d1_migrations"(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
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
  active_duration_ms INTEGER,   
  max_scroll_pct REAL,
  word_count INTEGER,
  expected_reading_seconds INTEGER,
  met_minimum_reading_time INTEGER,  
  received_at INTEGER NOT NULL
);
CREATE TABLE wiki_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_id INTEGER NOT NULL REFERENCES participants(id),
  page_slug TEXT,
  event_type TEXT NOT NULL,
  event_data TEXT,
  occurred_at INTEGER NOT NULL,
  received_at INTEGER NOT NULL
);
CREATE TABLE wiki_page_completions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_id INTEGER NOT NULL REFERENCES participants(id),
  page_slug TEXT NOT NULL,
  completed_at INTEGER NOT NULL,
  received_at INTEGER NOT NULL,
  UNIQUE(participant_id, page_slug)
);
CREATE TABLE wiki_completion_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_id INTEGER NOT NULL REFERENCES participants(id),
  event_type TEXT NOT NULL,          
                                      
  ms_since_modal_shown INTEGER,      
  extend_deadline INTEGER,           
  occurred_at INTEGER NOT NULL,
  received_at INTEGER NOT NULL
);
DELETE FROM sqlite_sequence;
CREATE INDEX idx_participants_prolific ON participants(prolific_pid);
CREATE INDEX idx_participants_condition ON participants(condition);
CREATE INDEX idx_wiki_page_views_participant ON wiki_page_views(participant_id);
CREATE INDEX idx_wiki_page_views_slug ON wiki_page_views(page_slug);
CREATE INDEX idx_wiki_events_participant ON wiki_events(participant_id);
CREATE INDEX idx_wiki_page_completions_participant ON wiki_page_completions(participant_id);
CREATE INDEX idx_wiki_completion_events_participant ON wiki_completion_events(participant_id);
CREATE INDEX idx_wiki_completion_events_type ON wiki_completion_events(event_type);
