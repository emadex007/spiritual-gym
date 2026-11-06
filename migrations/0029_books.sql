-- TheRenewGym — Books: PDF books (uploaded by admins) that members read over a period they choose (7, 14, 30, 60 days…).
-- The text of every page is stored so the app can split the book into daily readings of similar length, read it aloud,
-- and let people highlight, save, explain and share words from it.
CREATE TABLE books (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  author      TEXT,
  description TEXT,
  category    TEXT,
  pdf_key     TEXT,
  cover_key   TEXT,
  pages       INTEGER NOT NULL DEFAULT 0,
  words       INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'draft',     -- draft | published
  sort        INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE book_pages (
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  page    INTEGER NOT NULL,
  text    TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (book_id, page)
);

-- Someone reading a book over a number of days
CREATE TABLE user_books (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id     TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  days        INTEGER NOT NULL,
  start_date  TEXT NOT NULL,                     -- YYYY-MM-DD
  done        INTEGER NOT NULL DEFAULT 0,        -- days finished
  status      TEXT NOT NULL DEFAULT 'active',    -- active | finished
  last_page   INTEGER,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, book_id)
);
CREATE INDEX idx_user_books ON user_books(user_id, status);

-- Words people pick from a book and save
CREATE TABLE book_highlights (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id    TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  page       INTEGER NOT NULL,
  text       TEXT NOT NULL,
  note       TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_book_highlights ON book_highlights(user_id, book_id, created_at);
