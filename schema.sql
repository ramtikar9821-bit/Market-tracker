CREATE TABLE IF NOT EXISTS readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  value REAL,
  raw_text TEXT,
  captured_at TEXT DEFAULT (datetime('now'))
);
