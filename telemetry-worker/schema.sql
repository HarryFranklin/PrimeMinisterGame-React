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
, final_outcome TEXT, last_event TEXT, last_cycle TEXT, last_attempt_number INTEGER, last_turn INTEGER, last_progress_at INTEGER, difficulty_seed INTEGER, win_threshold_scalars TEXT);
CREATE TABLE cycle_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_id INTEGER NOT NULL REFERENCES participants(id),
  attempt_id TEXT UNIQUE NOT NULL,
  cycle TEXT,
  attempt_number INTEGER,
  outcome TEXT,
  player_won INTEGER,
  starting_score REAL,
  final_score REAL,
  score_delta REAL,
  turns_played INTEGER,
  time_on_briefing_ms INTEGER,
  time_on_term_summary_ms INTEGER,
  time_on_verdict_ms INTEGER,
  time_on_wellbeing_changes_ms INTEGER,
  time_on_electorate_feedback_ms INTEGER,
  time_on_academic_debrief_ms INTEGER,
  voter_quotes_clicked INTEGER,
  player_viewed_enacted_history INTEGER,
  player_viewed_animated_histogram INTEGER,
  press_conf_q1_correct INTEGER,
  press_conf_q2_correct INTEGER,
  press_conf_non_chosen_policy_chosen INTEGER,
  pct_policy_options_previewed REAL,
  pct_policy_options_view_details_opened REAL,
  total_cycle_duration_ms INTEGER,
  turns TEXT, -- JSON array of per-turn objects, incl. preview/view-details duration arrays
  received_at INTEGER
, app_version TEXT);
CREATE TABLE IF NOT EXISTS "d1_migrations"(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
DELETE FROM sqlite_sequence;
CREATE INDEX idx_participants_prolific ON participants(prolific_pid);
CREATE INDEX idx_cycle_attempts_participant ON cycle_attempts(participant_id);
