-- Authors share their books with everyone: they upload a book (as before), then submit it to the library.
-- An admin reads it and approves or declines it. Approved books show in the shared library for everyone to read as a daily plan.
ALTER TABLE books ADD COLUMN share_status TEXT NOT NULL DEFAULT '';  -- '' (private) | submitted | approved | declined
ALTER TABLE books ADD COLUMN share_note TEXT;                        -- the admin's note to the author (e.g. why it was declined)
ALTER TABLE books ADD COLUMN author_bio TEXT;
ALTER TABLE books ADD COLUMN submitted_at TEXT;
ALTER TABLE books ADD COLUMN approved_at TEXT;
CREATE INDEX IF NOT EXISTS idx_books_share ON books (share_status, submitted_at);
