-- Phone notifications: remember what happened to the last one sent to each device (so problems show in the app)
ALTER TABLE push_subscriptions ADD COLUMN device TEXT;           -- e.g. "Android · Chrome", "iPhone"
ALTER TABLE push_subscriptions ADD COLUMN last_status INTEGER;   -- HTTP status from the phone's push service
ALTER TABLE push_subscriptions ADD COLUMN last_at TEXT;
ALTER TABLE push_subscriptions ADD COLUMN ok_at TEXT;            -- last time one was accepted
ALTER TABLE push_subscriptions ADD COLUMN fails INTEGER NOT NULL DEFAULT 0;

-- Everyone who has ever started a book (one row per person), so its owner can be told about new readers
CREATE TABLE IF NOT EXISTS book_readers (
  book_id  TEXT NOT NULL,
  user_id  TEXT NOT NULL,
  first_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (book_id, user_id)
);
INSERT OR IGNORE INTO book_readers (book_id, user_id, first_at) SELECT book_id, user_id, created_at FROM user_books;
