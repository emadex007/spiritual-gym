-- Team email on the app's own domain (info@therenewgym.org and more), read and written in Admin → Mail.
-- Email arrives through Cloudflare Email Routing (catch-all → this Worker) and is sent with Resend. See MAIL.md.

-- Addresses. owner_id NULL = a shared address every admin can open (info, hello, prayer…);
-- owner_id set = one admin's own address (e.g. sogo@), only they can open it.
CREATE TABLE IF NOT EXISTS mail_boxes (
  name       TEXT PRIMARY KEY,                    -- the part before @ (info, hello, sogo)
  label      TEXT NOT NULL DEFAULT '',            -- shown in the dashboard, e.g. "General enquiries"
  owner_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO mail_boxes (name, label) VALUES ('info', '');

CREATE TABLE IF NOT EXISTS mail_messages (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  mailbox      TEXT NOT NULL,                     -- 'info', 'hello', 'sogo'…
  folder       TEXT NOT NULL DEFAULT 'inbox',     -- inbox | sent | trash
  from_addr    TEXT NOT NULL DEFAULT '',
  from_name    TEXT NOT NULL DEFAULT '',
  to_addrs     TEXT NOT NULL DEFAULT '',          -- comma-separated
  cc_addrs     TEXT NOT NULL DEFAULT '',
  subject      TEXT NOT NULL DEFAULT '',
  text_body    TEXT NOT NULL DEFAULT '',
  html_body    TEXT NOT NULL DEFAULT '',
  message_id   TEXT NOT NULL DEFAULT '',
  in_reply_to  TEXT NOT NULL DEFAULT '',
  is_read      INTEGER NOT NULL DEFAULT 0,
  has_files    INTEGER NOT NULL DEFAULT 0,
  sent_by      TEXT NOT NULL DEFAULT '',          -- admin's name, for sent mail
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_mail_box ON mail_messages (mailbox, folder, id);

CREATE TABLE IF NOT EXISTS mail_files (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  mail_id      INTEGER NOT NULL REFERENCES mail_messages(id) ON DELETE CASCADE,
  filename     TEXT NOT NULL DEFAULT 'file',
  content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  size         INTEGER NOT NULL DEFAULT 0,
  r2_key       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mail_files ON mail_files (mail_id);

-- Each admin's new-mail alerts (to their personal email) and signature
CREATE TABLE IF NOT EXISTS mail_prefs (
  user_id     TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  forward_to  TEXT NOT NULL DEFAULT '',           -- personal email ('' = their account email)
  notify_mode TEXT NOT NULL DEFAULT 'alert',      -- copy | alert | off
  signature   TEXT NOT NULL DEFAULT ''
);

-- "Email all members": the email, and one queue row per person (sent a little at a time, within the daily limit)
CREATE TABLE IF NOT EXISTS mail_broadcasts (
  id          TEXT PRIMARY KEY,
  mailbox     TEXT NOT NULL,
  subject     TEXT NOT NULL,
  text_body   TEXT NOT NULL,
  created_by  TEXT NOT NULL DEFAULT '',
  total       INTEGER NOT NULL DEFAULT 0,
  sent        INTEGER NOT NULL DEFAULT 0,
  failed      INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'sending',    -- sending | done | stopped
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT
);
CREATE TABLE IF NOT EXISTS mail_queue (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  broadcast_id TEXT NOT NULL REFERENCES mail_broadcasts(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL,
  email        TEXT NOT NULL,
  name         TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'wait',      -- wait | sent | fail
  sent_at      TEXT
);
CREATE INDEX IF NOT EXISTS idx_mail_queue ON mail_queue (status, id);

-- Members can say no to news emails (Profile → Notifications, or the link at the bottom of each one)
ALTER TABLE profiles ADD COLUMN news_email INTEGER NOT NULL DEFAULT 1;
