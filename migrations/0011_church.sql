-- SpiritualGym: Church Mode + donations

-- A church is requested by a pastor or leader and goes live only after the SpiritualGym admin approves it
CREATE TABLE churches (
  id            TEXT PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  city          TEXT,
  country       TEXT,
  denomination  TEXT,
  description   TEXT,
  logo_key      TEXT,
  color         TEXT NOT NULL DEFAULT '#4f7a63',
  invite_code   TEXT NOT NULL UNIQUE,
  status        TEXT NOT NULL DEFAULT 'pending',   -- pending | approved | rejected | suspended
  pastor_name   TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  website       TEXT,
  created_by    TEXT NOT NULL,                     -- no FK so deleting that account never blocks
  review_note   TEXT,
  reviewed_at   TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_churches_status ON churches(status, created_at);

CREATE TABLE church_members (
  church_id TEXT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'member',        -- member | admin
  notify    INTEGER NOT NULL DEFAULT 1,
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (church_id, user_id)
);
CREATE INDEX idx_church_members_user ON church_members(user_id);

-- Announcements, written only by church admins (members cannot message each other here)
CREATE TABLE church_posts (
  id         TEXT PRIMARY KEY,
  church_id  TEXT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  author_id  TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  is_pinned  INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_church_posts ON church_posts(church_id, created_at);

-- Church programs (prayer challenges, fasting, devotionals, workers' programs) reuse journeys
ALTER TABLE journeys ADD COLUMN church_id TEXT;
ALTER TABLE journeys ADD COLUMN kind TEXT;
CREATE INDEX idx_journeys_church ON journeys(church_id);

-- Church-wide Bible plans reuse reading circles
ALTER TABLE reading_circles ADD COLUMN church_id TEXT;
CREATE INDEX idx_circles_church ON reading_circles(church_id);

-- Voluntary gifts to support the SpiritualGym mission (Paystack or Flutterwave)
CREATE TABLE donations (
  id            TEXT PRIMARY KEY,
  reference     TEXT NOT NULL UNIQUE,
  provider      TEXT NOT NULL,                     -- paystack | flutterwave
  currency      TEXT NOT NULL,
  amount_minor  INTEGER NOT NULL,                  -- in the smallest unit (kobo, cents…)
  name          TEXT,
  email         TEXT NOT NULL,
  user_id       TEXT,
  message       TEXT,
  is_anonymous  INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'pending',   -- pending | success | failed
  provider_ref  TEXT,
  paid_at       TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_donations_status ON donations(status, created_at);
