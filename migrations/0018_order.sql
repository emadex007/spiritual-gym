-- SpiritualGym — devotion order: Stillness → Worship → The Word → Prayer → Praying in tongues → Thanksgiving
-- Prayer and praying in tongues are separate steps. Only the six built-in workouts are rewritten.

DELETE FROM workout_steps WHERE workout_id = 'w-moment-5';
INSERT INTO workout_steps (id, workout_id, position, kind, label, seconds, guidance) VALUES
 ('w-moment-5-1','w-moment-5',1,'stillness','Be still',30,'Breathe slowly. You are here, and God is here.'),
 ('w-moment-5-2','w-moment-5',2,'worship','Worship',60,'Sing or whisper a short song of praise.'),
 ('w-moment-5-3','w-moment-5',3,'scripture','The Word',75,'Read today’s verse slowly, twice. What is God saying to you?'),
 ('w-moment-5-4','w-moment-5',4,'prayer','Prayer',75,'Pray what you just read. Then talk to God about what is on your heart.'),
 ('w-moment-5-5','w-moment-5',5,'thanksgiving','Thanksgiving',60,'Thank Him for one thing today.');

DELETE FROM workout_steps WHERE workout_id = 'w-reset-10';
INSERT INTO workout_steps (id, workout_id, position, kind, label, seconds, guidance) VALUES
 ('w-reset-10-1','w-reset-10',1,'breathe','Breathe and become still',60,'No catching up, no guilt. Just breathe and become present.'),
 ('w-reset-10-2','w-reset-10',2,'worship','Worship',120,'Lift your voice or your heart in a simple song of praise.'),
 ('w-reset-10-3','w-reset-10',3,'scripture','The Word',150,'Read slowly. What does it say about God? What does it say to you?'),
 ('w-reset-10-4','w-reset-10',4,'prayer','Prayer',150,'Pray through what you read. Tell God honestly where you are and ask for grace to begin again.'),
 ('w-reset-10-5','w-reset-10',5,'thanksgiving','Thanksgiving',120,'Thank Him for three things, however small.');

DELETE FROM workout_steps WHERE workout_id = 'w-morning-15';
INSERT INTO workout_steps (id, workout_id, position, kind, label, seconds, guidance) VALUES
 ('w-morning-15-1','w-morning-15',1,'stillness','Stillness',60,'Quiet your mind. Let the noise settle.'),
 ('w-morning-15-2','w-morning-15',2,'worship','Worship',150,'Sing, speak or listen to a song of worship.'),
 ('w-morning-15-3','w-morning-15',3,'devotion','The Word',210,'Read today’s word slowly, then speak the declaration aloud.'),
 ('w-morning-15-4','w-morning-15',4,'prayer','Prayer',150,'Pray the Word you received, then your needs, then others.'),
 ('w-morning-15-5','w-morning-15',5,'tongues','Praying in tongues',180,'Pray in the Spirit (Jude 1:20). Let your spirit pray freely.'),
 ('w-morning-15-6','w-morning-15',6,'thanksgiving','Thanksgiving',150,'Give thanks for what He has done and for who He is.');

DELETE FROM workout_steps WHERE workout_id = 'w-deepen-30';
INSERT INTO workout_steps (id, workout_id, position, kind, label, seconds, guidance) VALUES
 ('w-deepen-30-1','w-deepen-30',1,'stillness','Stillness',120,'Settle in. There is no rush here.'),
 ('w-deepen-30-2','w-deepen-30',2,'worship','Worship',300,'Worship without hurry.'),
 ('w-deepen-30-3','w-deepen-30',3,'devotion','The Word',420,'Read today’s word and the passage around it. Speak the declaration.'),
 ('w-deepen-30-4','w-deepen-30',4,'prayer','Prayer',360,'Pray through what you read, then bring your requests and pray for others.'),
 ('w-deepen-30-5','w-deepen-30',5,'tongues','Praying in tongues',360,'Build yourself up in your most holy faith, praying in the Holy Ghost (Jude 1:20).'),
 ('w-deepen-30-6','w-deepen-30',6,'thanksgiving','Thanksgiving',240,'Thank Him without hurry for all He has done.');

DELETE FROM workout_steps WHERE workout_id = 'w-secret-60';
INSERT INTO workout_steps (id, workout_id, position, kind, label, seconds, guidance) VALUES
 ('w-secret-60-1','w-secret-60',1,'stillness','Stillness',240,'Enter the secret place. Be still and know that He is God (Psalm 46:10).'),
 ('w-secret-60-2','w-secret-60',2,'worship','Worship',600,'Worship Him with all your heart. Take your time.'),
 ('w-secret-60-3','w-secret-60',3,'devotion','The Word',900,'Read today’s word, then the whole passage around it. Read slowly; meditate on what speaks to you.'),
 ('w-secret-60-4','w-secret-60',4,'prayer','Prayer',720,'Pray the Word, your needs, your family, your church and the nations.'),
 ('w-secret-60-5','w-secret-60',5,'tongues','Praying in tongues',780,'Pray in the Holy Ghost. Let the Spirit help you pray (Romans 8:26).'),
 ('w-secret-60-6','w-secret-60',6,'thanksgiving','Thanksgiving',360,'Give thanks for everything He has done and is doing.');

DELETE FROM workout_steps WHERE workout_id = 'w-spirit-20';
INSERT INTO workout_steps (id, workout_id, position, kind, label, seconds, guidance) VALUES
 ('w-spirit-20-1','w-spirit-20',1,'stillness','Stillness',60,'Quiet your heart before the Lord.'),
 ('w-spirit-20-2','w-spirit-20',2,'worship','Worship',240,'Worship until your heart is fully turned to Him.'),
 ('w-spirit-20-3','w-spirit-20',3,'scripture','The Word',120,'Read the verse slowly and let it stir your faith.'),
 ('w-spirit-20-4','w-spirit-20',4,'prayer','Prayer',120,'Bring your heart and your requests to God.'),
 ('w-spirit-20-5','w-spirit-20',5,'tongues','Praying in tongues',540,'Build yourself up in your most holy faith, praying in the Holy Ghost (Jude 1:20).'),
 ('w-spirit-20-6','w-spirit-20',6,'thanksgiving','Thanksgiving',120,'Thank Him for His presence and His Word.');
