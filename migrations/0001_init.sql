-- Sites table
CREATE TABLE IF NOT EXISTS sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  check_interval INTEGER NOT NULL DEFAULT 5,
  timeout_ms INTEGER NOT NULL DEFAULT 5000,
  expected_status INTEGER NOT NULL DEFAULT 200,
  keyword TEXT,
  alert_after_failures INTEGER NOT NULL DEFAULT 3,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Checks table
CREATE TABLE IF NOT EXISTS checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  status_code INTEGER NOT NULL,
  response_ms INTEGER NOT NULL,
  success INTEGER NOT NULL,
  checked_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_checks_site_id ON checks(site_id);
CREATE INDEX IF NOT EXISTS idx_checks_checked_at ON checks(checked_at);

-- Incidents table
CREATE TABLE IF NOT EXISTS incidents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT,
  failure_count INTEGER NOT NULL DEFAULT 1,
  last_status_code INTEGER NOT NULL,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_incidents_site_id ON incidents(site_id);
CREATE INDEX IF NOT EXISTS idx_incidents_resolved_at ON incidents(resolved_at);

-- Backup heartbeats table
CREATE TABLE IF NOT EXISTS backup_heartbeats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_name TEXT NOT NULL UNIQUE,
  last_backup_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'success'
);

-- Site failure streak tracking (for incident logic)
CREATE TABLE IF NOT EXISTS site_status (
  site_id INTEGER PRIMARY KEY,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_check_success INTEGER,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);
