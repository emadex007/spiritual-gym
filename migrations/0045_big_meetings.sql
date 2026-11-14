-- Big meetings through Cloudflare Realtime (see src/lib/sfu.ts)
-- Meeting size: small = up to 12 (peer-to-peer, free) · large = up to 50 · event = hundreds watching, a few on stage
ALTER TABLE church_meetings ADD COLUMN size TEXT NOT NULL DEFAULT 'small';
ALTER TABLE prayer_groups ADD COLUMN live_size TEXT NOT NULL DEFAULT 'small';
-- Data that went through Cloudflare's media servers for big meetings (counts toward the same free 1,000 GB as the relay)
ALTER TABLE meeting_usage ADD COLUMN sfu_bytes INTEGER NOT NULL DEFAULT 0;
-- Each Cloudflare connection belongs to the person who opened it
CREATE TABLE sfu_sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  room       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sfu_sessions_created ON sfu_sessions(created_at);
