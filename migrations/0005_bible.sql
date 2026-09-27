-- SpiritualGym — full Bible (KJV). Text is loaded separately from seed/kjv.sql.
CREATE TABLE bible_books (
  id        INTEGER PRIMARY KEY,         -- 1 Genesis … 66 Revelation
  name      TEXT NOT NULL UNIQUE,
  testament TEXT NOT NULL,               -- OT | NT
  chapters  INTEGER NOT NULL
);

CREATE TABLE bible_verses (
  id      INTEGER PRIMARY KEY,
  book_id INTEGER NOT NULL,
  chapter INTEGER NOT NULL,
  verse   INTEGER NOT NULL,
  text    TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_bible_ref ON bible_verses(book_id, chapter, verse);

-- Full-text search over the Bible
CREATE VIRTUAL TABLE bible_fts USING fts5(text, content='bible_verses', content_rowid='id');
