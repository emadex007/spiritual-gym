-- TheRenewGym — meeting usage meter. Each device reports, every 30 seconds while in a meeting, how much data its
-- connections used, split into "relay" (through Cloudflare's TURN relay: this is what costs money) and "direct" (free).
CREATE TABLE meeting_usage (
  day          TEXT NOT NULL,                 -- YYYY-MM-DD (UTC)
  user_id      TEXT NOT NULL,
  room         TEXT NOT NULL,                 -- meet:<meetingId> | group:<groupId>
  relay_bytes  INTEGER NOT NULL DEFAULT 0,
  direct_bytes INTEGER NOT NULL DEFAULT 0,
  seconds      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, user_id, room)
);
CREATE INDEX idx_meeting_usage_room ON meeting_usage(room);

-- Usage alerts already sent (so each one goes out once), e.g. "2026-10:alert:80"
CREATE TABLE usage_alerts (
  key     TEXT PRIMARY KEY,
  sent_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO settings (key, value) VALUES
 ('usage_free_gb', '1000'),
 ('usage_free_monthly', '0'),
 ('usage_price_gb', '0.05'),
 ('usage_alert_gb', '50'),
 ('usage_alert_email', '');
