ALTER TABLE records ADD COLUMN view_code TEXT;
ALTER TABLE records ADD COLUMN view_code_hash TEXT;
ALTER TABLE sessions ADD COLUMN record_id TEXT;
CREATE INDEX IF NOT EXISTS idx_records_view_code_hash ON records(view_code_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_record_id ON sessions(record_id);
