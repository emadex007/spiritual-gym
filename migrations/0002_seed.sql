-- SpiritualGym — starter content: workouts, journeys, verse of the day (KJV, public domain)

-- ---------- WORKOUTS ----------
INSERT INTO workouts (id, slug, title, description, level, minutes, is_recovery, sort) VALUES
 ('w-moment-5',   'moment-5',   '5-Minute Moment',        'A small, honest start. One breath, one verse, one prayer.',        'recovery',  5,  1, 1),
 ('w-reset-10',   'reset-10',   '10-Minute Reset',        'You don''t need to catch up on everything. Let''s simply begin again.', 'recovery', 10, 1, 2),
 ('w-morning-15', 'morning-15', '15-Minute Morning Workout','Stillness, Scripture, prayer, worship and reflection.',          'build',    15, 0, 3),
 ('w-deepen-30',  'deepen-30',  '30-Minute Deepen',       'Unhurried time in the Word and in prayer.',                         'deepen',   30, 0, 4),
 ('w-secret-60',  'secret-60',  '60-Minute Secret Place', 'An extended time to simply be with God.',                           'intensive',60, 0, 5);

INSERT INTO workout_steps (id, workout_id, position, kind, label, seconds, guidance) VALUES
 ('s-m5-1','w-moment-5',1,'stillness','Be still',60,'Put the phone face-down after starting. Breathe slowly. You are here.'),
 ('s-m5-2','w-moment-5',2,'scripture','Scripture',90,'Read today''s verse slowly, twice. Notice one word.'),
 ('s-m5-3','w-moment-5',3,'prayer','Prayer',120,'Talk to God simply about what is on your heart.'),
 ('s-m5-4','w-moment-5',4,'thanksgiving','Thank Him',30,'Name one thing you are grateful for.'),

 ('s-r10-1','w-reset-10',1,'breathe','Breathe and become still',120,'No catching up, no guilt. Just breathe and become present.'),
 ('s-r10-2','w-reset-10',2,'scripture','Scripture',180,'Read the verse slowly. What does it say about God?'),
 ('s-r10-3','w-reset-10',3,'prayer','Prayer',180,'Tell God honestly where you are. Ask for grace to begin again.'),
 ('s-r10-4','w-reset-10',4,'thanksgiving','Thanksgiving',120,'Thank Him for three things, however small.'),

 ('s-m15-1','w-morning-15',1,'stillness','Stillness',120,'Quiet your mind. Let the noise settle.'),
 ('s-m15-2','w-morning-15',2,'scripture','Scripture',180,'Read today''s passage. Read it again, slower.'),
 ('s-m15-3','w-morning-15',3,'prayer','Prayer',300,'Thanksgiving, then your needs, then others.'),
 ('s-m15-4','w-morning-15',4,'worship','Worship',180,'Sing, speak or listen to a song of worship.'),
 ('s-m15-5','w-morning-15',5,'reflection','Reflection',120,'What stood out to you? Hold on to it today.'),

 ('s-d30-1','w-deepen-30',1,'stillness','Stillness',180,'Settle in. There is no rush here.'),
 ('s-d30-2','w-deepen-30',2,'scripture','Scripture',480,'Read a full chapter. Pause where it speaks to you.'),
 ('s-d30-3','w-deepen-30',3,'prayer','Prayer',600,'Pray through what you read, then bring your requests.'),
 ('s-d30-4','w-deepen-30',4,'worship','Worship',360,'Worship without hurry.'),
 ('s-d30-5','w-deepen-30',5,'reflection','Reflection',180,'Write down one thing you received.'),

 ('s-s60-1','w-secret-60',1,'stillness','Stillness',300,'Come away from distraction. Be with Him.'),
 ('s-s60-2','w-secret-60',2,'scripture','Scripture',900,'Read slowly and meditate on a passage.'),
 ('s-s60-3','w-secret-60',3,'prayer','Prayer',1200,'Pray for yourself, your family, your church and the world.'),
 ('s-s60-4','w-secret-60',4,'worship','Worship',900,'Extended worship.'),
 ('s-s60-5','w-secret-60',5,'reflection','Reflection',300,'Journal what God has been teaching you.');

-- ---------- JOURNEYS ----------
INSERT INTO journeys (id, slug, title, subtitle, focus, days, start_minutes, end_minutes, is_recovery, sort) VALUES
 ('j-prayer-7',   'prayer-reset-7',   '7-Day Prayer Reset',        'A gentle restart for your prayer life.',        'prayer',      7, 10, 10, 1, 1),
 ('j-word-14',    'word-revival-14',  '14-Day Word Revival',       'Fall in love with Scripture again.',            'bible',      14, 10, 15, 0, 2),
 ('j-consist-21', 'consistency-21',   '21-Day Consistency Journey','Small daily steps that become a rhythm.',       'consistency',21,  5, 15, 0, 3),
 ('j-prayer-30',  'prayer-reset-30',  '30-Day Prayer Reset',       'Build from 10 to 30 minutes over four weeks.',  'prayer',     30, 10, 30, 0, 4),
 ('j-gratitude-7','gratitude-7',      'Gratitude Journey',         'Seven days of noticing His goodness.',          'gratitude',   7,  5,  5, 1, 5);

-- 7-Day Prayer Reset (hand-written)
INSERT INTO journey_days (id, journey_id, day_number, title, scripture, prompt, minutes) VALUES
 ('jd-p7-1','j-prayer-7',1,'Come as you are','Matthew 11:28-30','What are you carrying that you can hand to God today?',10),
 ('jd-p7-2','j-prayer-7',2,'Begin with thanks','Psalm 100','List five things God has done for you.',10),
 ('jd-p7-3','j-prayer-7',3,'Bring your cares','Philippians 4:6-7','What worry can you turn into a prayer?',10),
 ('jd-p7-4','j-prayer-7',4,'Pray the Word','Psalm 23','Pray Psalm 23 back to God line by line.',10),
 ('jd-p7-5','j-prayer-7',5,'Be still and listen','Psalm 46:10','Spend two minutes in silence. What did you notice?',10),
 ('jd-p7-6','j-prayer-7',6,'Pray for others','James 5:16','Who are three people you can pray for today?',10),
 ('jd-p7-7','j-prayer-7',7,'Keep walking','Lamentations 3:22-23','What rhythm will you carry into next week?',10);

-- Gratitude (hand-written)
INSERT INTO journey_days (id, journey_id, day_number, title, scripture, prompt, minutes) VALUES
 ('jd-g7-1','j-gratitude-7',1,'Today''s mercies','Lamentations 3:22-23','Name three new mercies from today.',5),
 ('jd-g7-2','j-gratitude-7',2,'People you thank God for','Philippians 1:3','Who has God used in your life?',5),
 ('jd-g7-3','j-gratitude-7',3,'In every thing','1 Thessalonians 5:16-18','What is hard right now that you can still thank Him in?',5),
 ('jd-g7-4','j-gratitude-7',4,'Remember','Psalm 103:1-5','What has God done that you should not forget?',5),
 ('jd-g7-5','j-gratitude-7',5,'Daily bread','Matthew 6:11','Thank God for ordinary provision.',5),
 ('jd-g7-6','j-gratitude-7',6,'Answered prayer','Psalm 116:1-2','Recall a prayer God has answered.',5),
 ('jd-g7-7','j-gratitude-7',7,'A thankful heart','Colossians 3:15-17','How will gratitude shape your week?',5);

-- Longer journeys: generated days with rotating themes
WITH RECURSIVE n(d) AS (SELECT 1 UNION ALL SELECT d + 1 FROM n WHERE d < 30)
INSERT INTO journey_days (id, journey_id, day_number, title, scripture, prompt, minutes)
SELECT 'jd-p30-' || d, 'j-prayer-30', d,
  CASE d % 7 WHEN 1 THEN 'Come as you are' WHEN 2 THEN 'Pray with thanksgiving' WHEN 3 THEN 'Bring your cares'
             WHEN 4 THEN 'Pray the Word' WHEN 5 THEN 'Wait and listen' WHEN 6 THEN 'Pray for others' ELSE 'Rest and review' END,
  CASE d % 7 WHEN 1 THEN 'Matthew 6:5-13' WHEN 2 THEN 'Psalm 100' WHEN 3 THEN 'Philippians 4:6-7'
             WHEN 4 THEN 'Psalm 119:105-112' WHEN 5 THEN 'Psalm 5:1-3' WHEN 6 THEN '1 Timothy 2:1-4' ELSE 'Luke 18:1-8' END,
  CASE d % 7 WHEN 1 THEN 'What would you like to tell God honestly today?' WHEN 2 THEN 'Thank Him for five specific things.'
             WHEN 3 THEN 'Which worry will you hand over today?' WHEN 4 THEN 'Pray one verse back to God.'
             WHEN 5 THEN 'Sit in silence for a moment. What rises in your heart?' WHEN 6 THEN 'Who will you pray for by name?'
             ELSE 'Look back on this week. What has changed?' END,
  CASE WHEN d <= 7 THEN 10 WHEN d <= 14 THEN 15 WHEN d <= 21 THEN 20 ELSE 30 END
FROM n;

WITH RECURSIVE n(d) AS (SELECT 1 UNION ALL SELECT d + 1 FROM n WHERE d < 14)
INSERT INTO journey_days (id, journey_id, day_number, title, scripture, prompt, minutes)
SELECT 'jd-w14-' || d, 'j-word-14', d,
  CASE d WHEN 1 THEN 'A lamp to my feet' WHEN 2 THEN 'The Word became flesh' WHEN 3 THEN 'Meditate day and night'
         WHEN 4 THEN 'Living and active' WHEN 5 THEN 'Hidden in my heart' WHEN 6 THEN 'Doers of the Word'
         WHEN 7 THEN 'Rest and review' WHEN 8 THEN 'The Good Shepherd' WHEN 9 THEN 'The sower'
         WHEN 10 THEN 'Abide in the vine' WHEN 11 THEN 'Renewed mind' WHEN 12 THEN 'Every good gift'
         WHEN 13 THEN 'Lovers of the Word' ELSE 'Keep reading' END,
  CASE d WHEN 1 THEN 'Psalm 119:105' WHEN 2 THEN 'John 1:1-14' WHEN 3 THEN 'Psalm 1'
         WHEN 4 THEN 'Hebrews 4:12-16' WHEN 5 THEN 'Psalm 119:9-16' WHEN 6 THEN 'James 1:19-25'
         WHEN 7 THEN 'Joshua 1:8-9' WHEN 8 THEN 'John 10:1-18' WHEN 9 THEN 'Matthew 13:1-23'
         WHEN 10 THEN 'John 15:1-11' WHEN 11 THEN 'Romans 12:1-2' WHEN 12 THEN 'James 1:16-18'
         WHEN 13 THEN 'Psalm 19:7-14' ELSE '2 Timothy 3:14-17' END,
  'Read slowly. What does this passage show you about God, and what will you do with it?',
  CASE WHEN d <= 7 THEN 10 ELSE 15 END
FROM n;

WITH RECURSIVE n(d) AS (SELECT 1 UNION ALL SELECT d + 1 FROM n WHERE d < 21)
INSERT INTO journey_days (id, journey_id, day_number, title, scripture, prompt, minutes)
SELECT 'jd-c21-' || d, 'j-consist-21', d,
  CASE d % 7 WHEN 1 THEN 'Start small' WHEN 2 THEN 'Same time, same place' WHEN 3 THEN 'When you miss a day'
             WHEN 4 THEN 'Grace, not pressure' WHEN 5 THEN 'Guard your mornings' WHEN 6 THEN 'Walk with someone'
             ELSE 'Look how far you''ve come' END,
  CASE d % 7 WHEN 1 THEN 'Zechariah 4:10' WHEN 2 THEN 'Daniel 6:10' WHEN 3 THEN 'Micah 7:8'
             WHEN 4 THEN '2 Corinthians 12:9' WHEN 5 THEN 'Mark 1:35' WHEN 6 THEN 'Ecclesiastes 4:9-10'
             ELSE 'Philippians 1:6' END,
  'What is one small step you can keep tomorrow?',
  CASE WHEN d <= 7 THEN 5 WHEN d <= 14 THEN 10 ELSE 15 END
FROM n;

-- ---------- VERSES (KJV — public domain) ----------
INSERT INTO verses (id, reference, text) VALUES
 ('v01','Psalm 23:1','The LORD is my shepherd; I shall not want.'),
 ('v02','Isaiah 40:31','But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.'),
 ('v03','Matthew 11:28','Come unto me, all ye that labour and are heavy laden, and I will give you rest.'),
 ('v04','Lamentations 3:22-23','It is of the LORD''s mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness.'),
 ('v05','Psalm 46:10','Be still, and know that I am God.'),
 ('v06','Proverbs 3:5-6','Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.'),
 ('v07','Joshua 1:9','Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.'),
 ('v08','Romans 8:28','And we know that all things work together for good to them that love God, to them who are the called according to his purpose.'),
 ('v09','2 Corinthians 5:17','Therefore if any man be in Christ, he is a new creature: old things are passed away; behold, all things are become new.'),
 ('v10','Psalm 119:105','Thy word is a lamp unto my feet, and a light unto my path.'),
 ('v11','Hebrews 4:16','Let us therefore come boldly unto the throne of grace, that we may obtain mercy, and find grace to help in time of need.'),
 ('v12','James 4:8','Draw nigh to God, and he will draw nigh to you.'),
 ('v13','Philippians 4:6','Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.'),
 ('v14','Micah 7:8','When I fall, I shall arise; when I sit in darkness, the LORD shall be a light unto me.'),
 ('v15','1 Thessalonians 5:16-18','Rejoice evermore. Pray without ceasing. In every thing give thanks: for this is the will of God in Christ Jesus concerning you.');
