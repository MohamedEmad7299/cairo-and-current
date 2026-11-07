PRAGMA foreign_keys = ON;
CREATE TABLE records (
 id TEXT PRIMARY KEY, token TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
 mobile TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
 created_at TEXT NOT NULL
);
CREATE TABLE scans (
 id TEXT PRIMARY KEY, record_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
 scanned_at TEXT NOT NULL
);
CREATE INDEX scans_record_time ON scans(record_id, scanned_at);
CREATE INDEX scans_time ON scans(scanned_at);
CREATE TABLE sessions (
 hash TEXT PRIMARY KEY, role TEXT NOT NULL CHECK(role IN ('admin','viewer')), expires_at INTEGER NOT NULL
);
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
