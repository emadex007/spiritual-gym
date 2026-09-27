-- SpiritualGym — Phase 3: journal, prayer, Scripture memory extras

-- Scripture memory review schedule (0 = new … 5 = well known)
ALTER TABLE scripture_memory ADD COLUMN mastery INTEGER NOT NULL DEFAULT 0;
ALTER TABLE scripture_memory ADD COLUMN next_review TEXT;          -- YYYY-MM-DD

-- Journal: mark entries that came from a workout reflection prompt, and allow editing
ALTER TABLE journal_entries ADD COLUMN updated_at TEXT;

-- Prayer: optional Scripture to pray through
ALTER TABLE prayer_items ADD COLUMN scripture TEXT;

-- More public-domain (KJV) verses for memory suggestions
INSERT INTO verses (id, reference, text) VALUES
 ('v16','John 3:16','For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.'),
 ('v17','Philippians 4:13','I can do all things through Christ which strengtheneth me.'),
 ('v18','Psalm 119:11','Thy word have I hid in mine heart, that I might not sin against thee.'),
 ('v19','Matthew 6:33','But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.'),
 ('v20','Isaiah 41:10','Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.'),
 ('v21','Romans 12:2','And be not conformed to this world: but be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God.'),
 ('v22','Galatians 2:20','I am crucified with Christ: nevertheless I live; yet not I, but Christ liveth in me: and the life which I now live in the flesh I live by the faith of the Son of God, who loved me, and gave himself for me.'),
 ('v23','1 John 1:9','If we confess our sins, he is faithful and just to forgive us our sins, and to cleanse us from all unrighteousness.');
