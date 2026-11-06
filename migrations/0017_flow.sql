-- SpiritualGym — devotion order, ministry titles, verse insights
-- 1) New order for the built-in workouts: Stillness → Opening prayer → The Word → Prayer → Thanksgiving
--    (only the six built-in workouts are rewritten; workouts you created in Admin are not touched)
-- 2) profiles.ministry_role: Pastor, Apostle, Prophet, Teacher… ("Pastor's Corner", "Prophet's Corner")
-- 3) verse_insights: the AI explanation of a verse, written once and shared by everyone

ALTER TABLE profiles ADD COLUMN ministry_role TEXT;

CREATE TABLE verse_insights (
  reference  TEXT PRIMARY KEY,
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

DELETE FROM workout_steps WHERE workout_id = 'w-moment-5';
INSERT INTO workout_steps (id, workout_id, position, kind, label, seconds, guidance) VALUES
 ('w-moment-5-1','w-moment-5',1,'stillness','Be still',45,'Breathe slowly. You are here, and God is here.'),
 ('w-moment-5-2','w-moment-5',2,'prayer','Opening prayer',45,'Invite the Holy Spirit. “Open thou mine eyes, that I may behold wondrous things out of thy law” (Psalm 119:18).'),
 ('w-moment-5-3','w-moment-5',3,'scripture','The Word',75,'Read today’s verse slowly, twice. What is God saying to you?'),
 ('w-moment-5-4','w-moment-5',4,'prayer','Prayer',75,'Pray what you just read. Then talk to God about what is on your heart.'),
 ('w-moment-5-5','w-moment-5',5,'thanksgiving','Thanksgiving',60,'Thank Him for one thing today, and praise Him for who He is.');

DELETE FROM workout_steps WHERE workout_id = 'w-reset-10';
INSERT INTO workout_steps (id, workout_id, position, kind, label, seconds, guidance) VALUES
 ('w-reset-10-1','w-reset-10',1,'breathe','Breathe and become still',90,'No catching up, no guilt. Just breathe and become present.'),
 ('w-reset-10-2','w-reset-10',2,'prayer','Opening prayer',90,'Tell God you have come to meet Him. Ask Him to speak to you through His Word.'),
 ('w-reset-10-3','w-reset-10',3,'scripture','The Word',150,'Read slowly. What does it say about God? What does it say to you?'),
 ('w-reset-10-4','w-reset-10',4,'prayer','Prayer',150,'Pray through what you read. Tell God honestly where you are and ask for grace to begin again.'),
 ('w-reset-10-5','w-reset-10',5,'thanksgiving','Thanksgiving & worship',120,'Thank Him for three things, however small. Sing or speak a word of praise.');

DELETE FROM workout_steps WHERE workout_id = 'w-morning-15';
INSERT INTO workout_steps (id, workout_id, position, kind, label, seconds, guidance) VALUES
 ('w-morning-15-1','w-morning-15',1,'stillness','Stillness',60,'Quiet your mind. Let the noise settle.'),
 ('w-morning-15-2','w-morning-15',2,'prayer','Opening prayer',90,'Invite the Holy Spirit. Ask Him to open your eyes and your heart to His Word (Psalm 119:18).'),
 ('w-morning-15-3','w-morning-15',3,'devotion','The Word',210,'Read today’s word slowly, then speak the declaration aloud.'),
 ('w-morning-15-4','w-morning-15',4,'reflection','Reflection',60,'What stood out to you? Hold on to it and take it into prayer.'),
 ('w-morning-15-5','w-morning-15',5,'tongues','Praying in the Spirit',150,'Pray in the Spirit (Jude 1:20). Let your spirit pray freely.'),
 ('w-morning-15-6','w-morning-15',6,'prayer','Prayer',180,'Pray the Word you received, then your needs, then others.'),
 ('w-morning-15-7','w-morning-15',7,'thanksgiving','Thanksgiving & worship',150,'Give thanks for what He has done and worship Him for who He is. Sing, speak or listen to a song of worship.');

DELETE FROM workout_steps WHERE workout_id = 'w-deepen-30';
INSERT INTO workout_steps (id, workout_id, position, kind, label, seconds, guidance) VALUES
 ('w-deepen-30-1','w-deepen-30',1,'stillness','Stillness',120,'Settle in. There is no rush here.'),
 ('w-deepen-30-2','w-deepen-30',2,'prayer','Opening prayer',180,'Invite the Holy Spirit, surrender your day, and ask Him to teach you (John 14:26).'),
 ('w-deepen-30-3','w-deepen-30',3,'devotion','The Word',360,'Read today’s word and the passage around it. Speak the declaration.'),
 ('w-deepen-30-4','w-deepen-30',4,'reflection','Reflection',120,'Write down one thing you received. Take it into prayer.'),
 ('w-deepen-30-5','w-deepen-30',5,'tongues','Praying in the Spirit',360,'Build yourself up in your most holy faith, praying in the Holy Ghost (Jude 1:20).'),
 ('w-deepen-30-6','w-deepen-30',6,'prayer','Prayer',360,'Pray through what you read, then bring your requests and pray for others.'),
 ('w-deepen-30-7','w-deepen-30',7,'thanksgiving','Thanksgiving & worship',300,'Thank Him without hurry, and worship Him in song.');

DELETE FROM workout_steps WHERE workout_id = 'w-secret-60';
INSERT INTO workout_steps (id, workout_id, position, kind, label, seconds, guidance) VALUES
 ('w-secret-60-1','w-secret-60',1,'stillness','Stillness',240,'Enter the secret place. Be still and know that He is God (Psalm 46:10).'),
 ('w-secret-60-2','w-secret-60',2,'prayer','Opening prayer',300,'Invite the Holy Spirit. Confess anything between you and God, and ask Him to speak.'),
 ('w-secret-60-3','w-secret-60',3,'devotion','The Word',720,'Read today’s word, then the whole passage around it. Read slowly; meditate on what speaks to you.'),
 ('w-secret-60-4','w-secret-60',4,'reflection','Reflection',240,'Write what God showed you. Turn it into prayer.'),
 ('w-secret-60-5','w-secret-60',5,'tongues','Praying in the Spirit',780,'Pray in the Holy Ghost. Let the Spirit help you pray (Romans 8:26).'),
 ('w-secret-60-6','w-secret-60',6,'prayer','Prayer',720,'Pray the Word, your needs, your family, your church and the nations.'),
 ('w-secret-60-7','w-secret-60',7,'thanksgiving','Thanksgiving & worship',600,'Give thanks for everything, and worship Him with all your heart.');

DELETE FROM workout_steps WHERE workout_id = 'w-spirit-20';
INSERT INTO workout_steps (id, workout_id, position, kind, label, seconds, guidance) VALUES
 ('w-spirit-20-1','w-spirit-20',1,'stillness','Stillness',90,'Quiet your heart before the Lord.'),
 ('w-spirit-20-2','w-spirit-20',2,'prayer','Opening prayer',90,'Invite the Holy Spirit to fill you and lead your prayer.'),
 ('w-spirit-20-3','w-spirit-20',3,'scripture','The Word',120,'Read the verse slowly and let it stir your faith.'),
 ('w-spirit-20-4','w-spirit-20',4,'tongues','Praying in the Spirit',600,'Build yourself up in your most holy faith, praying in the Holy Ghost (Jude 1:20).'),
 ('w-spirit-20-5','w-spirit-20',5,'thanksgiving','Thanksgiving & worship',300,'Thank Him and worship Him in song.');
