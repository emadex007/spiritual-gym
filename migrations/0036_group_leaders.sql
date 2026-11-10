-- Community groups: leaders, join approval and invites.
-- Roles in prayer_group_members.role: 'owner' (made the group), 'leader' (appointed by the owner), 'member'.
-- Only the owner, leaders and site admins can START a live meeting; everyone else joins once it has started.

-- New members wait for a leader to accept them (on by default; the owner can switch it off)
ALTER TABLE prayer_groups ADD COLUMN approve_joins INTEGER NOT NULL DEFAULT 1;
-- When the last "the meeting has started" alert went out (so a leader rejoining doesn't alert everyone again)
ALTER TABLE prayer_groups ADD COLUMN live_alert_at TEXT;

CREATE TABLE IF NOT EXISTS prayer_group_requests (
  group_id   TEXT NOT NULL REFERENCES prayer_groups(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (group_id, user_id)
);

-- Invites by email. A leader's invite lets the person straight in; a member's invite still needs a leader to accept.
CREATE TABLE IF NOT EXISTS prayer_group_invites (
  group_id    TEXT NOT NULL REFERENCES prayer_groups(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  invited_by  TEXT NOT NULL,
  by_leader   INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (group_id, email)
);
