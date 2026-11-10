-- Errors from members' phones and from the server, grouped (the same error counts up instead of repeating).
-- Shown in Admin → Errors so problems get fixed before people have to report them.
CREATE TABLE IF NOT EXISTS error_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  fingerprint TEXT NOT NULL UNIQUE,              -- where + message + first stack line
  source      TEXT NOT NULL,                     -- app | server | job
  message     TEXT NOT NULL,
  stack       TEXT NOT NULL DEFAULT '',
  url         TEXT NOT NULL DEFAULT '',          -- last page it happened on
  user_agent  TEXT NOT NULL DEFAULT '',          -- last phone/browser
  user_id     TEXT,                              -- last person it happened to (if signed in)
  build       TEXT NOT NULL DEFAULT '',
  count       INTEGER NOT NULL DEFAULT 1,
  first_at    TEXT NOT NULL DEFAULT (datetime('now')),
  last_at     TEXT NOT NULL DEFAULT (datetime('now')),
  fixed       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_error_log ON error_log (fixed, last_at);
