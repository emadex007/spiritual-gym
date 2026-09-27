-- SpiritualGym — Community: prayer groups, prayer wall, live prayer, reports, blocks

CREATE TABLE prayer_groups (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  purpose       TEXT NOT NULL DEFAULT 'general',
  description   TEXT,
  is_private    INTEGER NOT NULL DEFAULT 0,
  invite_code   TEXT NOT NULL UNIQUE,
  created_by    TEXT,                       -- NULL = official group
  is_featured   INTEGER NOT NULL DEFAULT 0,
  is_hidden     INTEGER NOT NULL DEFAULT 0,
  member_count  INTEGER NOT NULL DEFAULT 0,
  live_count    INTEGER NOT NULL DEFAULT 0,
  last_live_at  TEXT,
  last_activity_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_groups_purpose ON prayer_groups(purpose, is_hidden);

CREATE TABLE prayer_group_members (
  group_id  TEXT NOT NULL REFERENCES prayer_groups(id) ON DELETE CASCADE,
  user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'member',  -- owner | member
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (group_id, user_id)
);
CREATE INDEX idx_members_user ON prayer_group_members(user_id);

CREATE TABLE prayer_posts (
  id           TEXT PRIMARY KEY,
  group_id     TEXT NOT NULL REFERENCES prayer_groups(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL DEFAULT 'request',  -- request | testimony | encouragement
  body         TEXT NOT NULL,
  prayed_count INTEGER NOT NULL DEFAULT 0,
  is_hidden    INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_posts_group ON prayer_posts(group_id, created_at);

CREATE TABLE prayer_post_prayed (
  post_id    TEXT NOT NULL REFERENCES prayer_posts(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE prayer_replies (
  id         TEXT PRIMARY KEY,
  post_id    TEXT NOT NULL REFERENCES prayer_posts(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  is_hidden  INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_replies_post ON prayer_replies(post_id, created_at);

CREATE TABLE prayer_live_log (
  id        TEXT PRIMARY KEY,
  group_id  TEXT NOT NULL,
  user_id   TEXT NOT NULL,
  joined_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_live_log ON prayer_live_log(joined_at);

CREATE TABLE reports (
  id          TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  target_type TEXT NOT NULL,                  -- post | reply | group | user
  target_id   TEXT NOT NULL,
  reason      TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open',   -- open | actioned | dismissed
  resolved_by TEXT,
  resolved_at TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_reports_status ON reports(status, created_at);

CREATE TABLE user_blocks (
  user_id    TEXT NOT NULL,
  blocked_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, blocked_id)
);

-- Official starter groups
INSERT INTO prayer_groups (id, name, purpose, description, invite_code, is_featured) VALUES
 ('g-morning',  'Morning Prayer Circle', 'general',     'Start the day together in prayer and thanksgiving.', 'MORNING1', 1),
 ('g-night',    'Night Watch',           'nightwatch',  'Late-night intercession for anyone awake and praying.', 'NIGHTW01', 1),
 ('g-nigeria',  'Pray for Nigeria',      'nation',      'Peace, justice and revival across our nation.', 'NIGERIA1', 1),
 ('g-healing',  'Healing & Comfort',     'healing',     'Standing together for the sick, the grieving and the weary.', 'HEALING1', 1),
 ('g-family',   'Family & Marriage',     'family',      'Homes, marriages, children and those we love.', 'FAMILY01', 1),
 ('g-thanks',   'Thanksgiving & Testimonies', 'thanksgiving', 'Share what God has done and give thanks together.', 'THANKS01', 1);
