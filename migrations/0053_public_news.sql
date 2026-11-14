-- New things for everyone (books, topic plans, journeys, public events): phone + in-app notifications, sent in the
-- daytime, at most once every 4 hours, several new things together in one notification.
CREATE TABLE IF NOT EXISTS public_news (
  id         TEXT PRIMARY KEY,              -- e.g. book-<id>, so the same thing is announced once
  kind       TEXT NOT NULL,                 -- book | plan | journey | event
  ref_id     TEXT NOT NULL,
  title      TEXT NOT NULL,
  url        TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  sent_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_public_news_unsent ON public_news (sent_at, created_at);
-- Each person can turn these off in Profile → Notifications
ALTER TABLE profiles ADD COLUMN notify_new INTEGER NOT NULL DEFAULT 1;
