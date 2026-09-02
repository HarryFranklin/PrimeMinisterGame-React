-- Tracks explicit "mark as complete" actions per wiki page, distinct from
-- wiki_page_views (which tracks visits/dwell time regardless of whether the
-- participant deliberately marked the page done).
CREATE TABLE wiki_page_completions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_id INTEGER NOT NULL REFERENCES participants(id),
  page_slug TEXT NOT NULL,
  completed_at INTEGER NOT NULL,
  received_at INTEGER NOT NULL,
  UNIQUE(participant_id, page_slug)
);
CREATE INDEX idx_wiki_page_completions_participant ON wiki_page_completions(participant_id);