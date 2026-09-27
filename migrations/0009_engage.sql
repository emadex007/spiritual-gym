-- SpiritualGym — notifications, scheduled group prayer, Walk With Me

CREATE TABLE push_subscriptions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_push_user ON push_subscriptions(user_id);

CREATE TABLE notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,          -- prayed | reply | schedule | reminder | walk | announcement
  title      TEXT NOT NULL,
  body       TEXT,
  url        TEXT,
  read_at    TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_notif_user ON notifications(user_id, created_at);

-- Daily reminder preferences
ALTER TABLE profiles ADD COLUMN reminder_time TEXT;            -- "HH:MM" local, NULL = off
ALTER TABLE profiles ADD COLUMN timezone TEXT NOT NULL DEFAULT 'Africa/Lagos';
ALTER TABLE profiles ADD COLUMN last_reminded_day TEXT;
ALTER TABLE profiles ADD COLUMN notify_prayed INTEGER NOT NULL DEFAULT 1;
ALTER TABLE profiles ADD COLUMN notify_replies INTEGER NOT NULL DEFAULT 1;

-- Per-group: get reminders for scheduled prayer times (1) or mute them (0)
ALTER TABLE prayer_group_members ADD COLUMN notify INTEGER NOT NULL DEFAULT 1;

CREATE TABLE prayer_schedules (
  id         TEXT PRIMARY KEY,
  group_id   TEXT NOT NULL REFERENCES prayer_groups(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  days       TEXT NOT NULL,                      -- "daily" or comma list of 0-6 (0 = Sunday)
  time       TEXT NOT NULL,                      -- "HH:MM" in the schedule's timezone
  timezone   TEXT NOT NULL DEFAULT 'Africa/Lagos',
  duration_min INTEGER NOT NULL DEFAULT 30,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sched_group ON prayer_schedules(group_id);

CREATE TABLE schedule_sent (
  schedule_id TEXT NOT NULL,
  occurrence  TEXT NOT NULL,                     -- ISO time of the session start
  PRIMARY KEY (schedule_id, occurrence)
);

CREATE TABLE walk_pairs (
  id          TEXT PRIMARY KEY,
  inviter_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_id  TEXT REFERENCES users(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE,
  status      TEXT NOT NULL DEFAULT 'pending',   -- pending | active | ended
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  accepted_at TEXT
);
CREATE INDEX idx_walk_inviter ON walk_pairs(inviter_id, status);
CREATE INDEX idx_walk_invitee ON walk_pairs(invitee_id, status);

CREATE TABLE walk_cheers (
  id         TEXT PRIMARY KEY,
  pair_id    TEXT NOT NULL REFERENCES walk_pairs(id) ON DELETE CASCADE,
  from_user  TEXT NOT NULL,
  to_user    TEXT NOT NULL,
  message    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Official groups get starter prayer times (Lagos time)
INSERT INTO prayer_schedules (id, group_id, title, days, time) VALUES
 ('s-morning', 'g-morning', 'Morning prayer', 'daily', '06:00'),
 ('s-night',   'g-night',   'Night Watch', '5', '22:00'),
 ('s-nigeria', 'g-nigeria', 'Pray for Nigeria', '0', '18:00');

-- Phone notifications waiting to be sent (drained 40 at a time by the PushDispatcher Durable Object)
CREATE TABLE push_outbox (
  id         TEXT PRIMARY KEY,
  sub_id     TEXT NOT NULL,
  payload    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_outbox_created ON push_outbox(created_at);
