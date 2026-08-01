-- migration.sql
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS participants;

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
);

CREATE INDEX idx_participants_prolific ON participants(prolific_pid);

CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_id INTEGER NOT NULL REFERENCES participants(id),
  event TEXT NOT NULL,
  layer TEXT NOT NULL,
  ts INTEGER NOT NULL,
  level_id TEXT,
  attempt_id TEXT,
  attempt_number INTEGER,
  turn INTEGER,
  payload TEXT,
  ms_since_last_event INTEGER,
  ms_since_last_same_event INTEGER,
  received_at INTEGER NOT NULL
);

CREATE INDEX idx_events_participant ON events(participant_id);
CREATE INDEX idx_events_event ON events(event);