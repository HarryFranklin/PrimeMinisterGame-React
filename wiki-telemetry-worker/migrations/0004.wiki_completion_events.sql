-- Tracks what happens once a participant reaches the "you're done reading"
-- modal: when it appeared, which choice they made, and — if they took the
-- one-time 5-minute extension — how that resolved (finished early, or
-- auto-kicked to Prolific when the timer ran out).
--
-- Reading duration itself ("how long from starting to hitting this modal")
-- doesn't need a new column: it's participants.first_seen_at subtracted
-- from this table's occurred_at, joinable at query time.
CREATE TABLE wiki_completion_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_id INTEGER NOT NULL REFERENCES participants(id),
  event_type TEXT NOT NULL,          -- 'modal_shown' | 'chose_finish' | 'chose_extend' |
                                      -- 'finished_during_extension' | 'auto_finished_timeout'
  ms_since_modal_shown INTEGER,      -- time from modal_shown to this event, where applicable
  extend_deadline INTEGER,           -- set on chose_extend: epoch ms the 5-min timer expires
  occurred_at INTEGER NOT NULL,
  received_at INTEGER NOT NULL
);
CREATE INDEX idx_wiki_completion_events_participant ON wiki_completion_events(participant_id);
CREATE INDEX idx_wiki_completion_events_type ON wiki_completion_events(event_type);