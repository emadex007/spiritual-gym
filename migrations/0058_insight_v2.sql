-- Smarter "Understand this verse / chapter": explanations get a version. Version 1 (older, simpler) ones are
-- rewritten the next time someone opens them; the row is replaced, so the table doesn't grow.
ALTER TABLE verse_insights ADD COLUMN v INTEGER NOT NULL DEFAULT 1;
