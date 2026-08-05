ALTER TABLE participants ADD COLUMN last_event TEXT;
ALTER TABLE participants ADD COLUMN last_cycle TEXT;
ALTER TABLE participants ADD COLUMN last_attempt_number INTEGER;
ALTER TABLE participants ADD COLUMN last_turn INTEGER;
ALTER TABLE participants ADD COLUMN last_progress_at INTEGER;

ALTER TABLE cycle_attempts ADD COLUMN app_version TEXT;