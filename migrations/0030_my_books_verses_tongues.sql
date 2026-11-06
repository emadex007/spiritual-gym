-- TheRenewGym — books people upload themselves, coloured verses in the Bible, and praying-in-tongues sounds.

-- Books: each person uploads their own (private to them). A quick check confirms it's a Christian book before reading.
-- owner_id NULL = a book shared with everyone (older admin uploads).
ALTER TABLE books ADD COLUMN owner_id TEXT;
ALTER TABLE books ADD COLUMN size INTEGER NOT NULL DEFAULT 0;
ALTER TABLE books ADD COLUMN check_note TEXT;
CREATE INDEX idx_books_owner ON books(owner_id, created_at);
-- status for uploaded books: uploading | ready | rejected  (shared books: draft | published)

-- Verses someone coloured in the Bible
CREATE TABLE verse_marks (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book       INTEGER NOT NULL,
  chapter    INTEGER NOT NULL,
  verse      INTEGER NOT NULL,
  color      TEXT NOT NULL,                      -- yellow | green | blue | pink | purple
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, book, chapter, verse)
);

-- My songs can be a worship song or a praying-in-tongues sound
ALTER TABLE worship_songs ADD COLUMN kind TEXT NOT NULL DEFAULT 'worship';  -- worship | tongues
