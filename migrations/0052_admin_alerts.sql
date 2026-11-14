-- Admin alerts: everything admins should know about (new members, things waiting for review, reports, gifts, new groups
-- and events), shown in Admin → Alerts with a bell and unread count. Email and phone alerts follow the settings there.
CREATE TABLE IF NOT EXISTS admin_alerts (
  id         TEXT PRIMARY KEY,
  cat        TEXT NOT NULL,          -- review | report | member | community | gift
  title      TEXT NOT NULL,
  body       TEXT,
  url        TEXT,
  actor_id   TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_created ON admin_alerts (created_at);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_cat ON admin_alerts (cat, created_at);

-- When each admin last opened the alerts (everything newer is "unread" for them)
CREATE TABLE IF NOT EXISTS admin_alert_seen (
  user_id TEXT PRIMARY KEY,
  seen_at TEXT NOT NULL
);

-- Start the feed with what's already waiting, and the last week's new members
INSERT OR IGNORE INTO admin_alerts (id, cat, title, body, url, actor_id, created_at)
  SELECT 'b-' || id, 'review', 'Book to review: ' || title, 'By ' || COALESCE(author, 'unknown') || '. Read it and approve it for the library.', '/admin/books', owner_id, COALESCE(submitted_at, created_at)
  FROM books WHERE share_status = 'submitted';
INSERT OR IGNORE INTO admin_alerts (id, cat, title, body, url, actor_id, created_at)
  SELECT 'p-' || id, 'review', 'Topic plan to review: ' || title, COALESCE(author_name, ''), '/admin/topics', author_id, COALESCE(submitted_at, created_at)
  FROM topic_plans WHERE status = 'submitted';
INSERT OR IGNORE INTO admin_alerts (id, cat, title, body, url, actor_id, created_at)
  SELECT 'c-' || id, 'review', 'Church request: ' || name, COALESCE(city, ''), '/admin/churches', created_by, created_at
  FROM churches WHERE status = 'pending';
INSERT OR IGNORE INTO admin_alerts (id, cat, title, body, url, actor_id, created_at)
  SELECT 't-' || id, 'review', 'Testimony to review', title, '/admin/testimonies', user_id, created_at
  FROM testimonies WHERE status = 'pending';
INSERT OR IGNORE INTO admin_alerts (id, cat, title, body, url, actor_id, created_at)
  SELECT 'r-' || id, 'report', 'Report: ' || target_type, reason, '/admin/reports', reporter_id, created_at
  FROM reports WHERE status = 'open';
INSERT OR IGNORE INTO admin_alerts (id, cat, title, body, url, actor_id, created_at)
  SELECT 'u-' || id, 'member', name || ' joined', email, '/admin/users', id, created_at
  FROM users WHERE created_at > datetime('now', '-7 days');
