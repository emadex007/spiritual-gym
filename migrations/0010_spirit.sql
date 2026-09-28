-- SpiritualGym — worship, praying in the Spirit, devotion, daily word, reading plans, medals, music

-- Praying in tongues can be switched off in Profile (those steps then become personal prayer)
ALTER TABLE profiles ADD COLUMN include_tongues INTEGER NOT NULL DEFAULT 1;

INSERT INTO workouts (id, slug, title, description, level, minutes, is_recovery, sort) VALUES ('w-spirit-20','spirit-20','Praying in the Spirit','Worship, then pray in the Holy Ghost (Jude 1:20).','build',20,0,6);

DELETE FROM workout_steps WHERE workout_id = 'w-moment-5';
INSERT INTO workout_steps (id, workout_id, position, kind, label, seconds, guidance) VALUES
 ('w-moment-5-1','w-moment-5',1,'stillness','Be still',60,'Breathe slowly. You are here, and God is here.'),
 ('w-moment-5-2','w-moment-5',2,'scripture','Scripture',60,'Read today’s verse slowly, twice.'),
 ('w-moment-5-3','w-moment-5',3,'worship','Worship',60,'Sing or whisper a short song of praise.'),
 ('w-moment-5-4','w-moment-5',4,'prayer','Prayer',90,'Talk to God simply about what is on your heart.'),
 ('w-moment-5-5','w-moment-5',5,'thanksgiving','Thank Him',30,'Name one thing you are grateful for.');
UPDATE workouts SET minutes = 5 WHERE id = 'w-moment-5';
DELETE FROM workout_steps WHERE workout_id = 'w-reset-10';
INSERT INTO workout_steps (id, workout_id, position, kind, label, seconds, guidance) VALUES
 ('w-reset-10-1','w-reset-10',1,'breathe','Breathe and become still',120,'No catching up, no guilt. Just breathe and become present.'),
 ('w-reset-10-2','w-reset-10',2,'scripture','Scripture',120,'Read the verse slowly. What does it say about God?'),
 ('w-reset-10-3','w-reset-10',3,'worship','Worship',120,'Lift your voice or your heart in a simple song of praise.'),
 ('w-reset-10-4','w-reset-10',4,'prayer','Prayer',120,'Tell God honestly where you are. Ask for grace to begin again.'),
 ('w-reset-10-5','w-reset-10',5,'thanksgiving','Thanksgiving',120,'Thank Him for three things, however small.');
UPDATE workouts SET minutes = 10 WHERE id = 'w-reset-10';
DELETE FROM workout_steps WHERE workout_id = 'w-morning-15';
INSERT INTO workout_steps (id, workout_id, position, kind, label, seconds, guidance) VALUES
 ('w-morning-15-1','w-morning-15',1,'stillness','Stillness',90,'Quiet your mind. Let the noise settle.'),
 ('w-morning-15-2','w-morning-15',2,'devotion','Devotion',180,'Read today’s word slowly, then speak the declaration aloud.'),
 ('w-morning-15-3','w-morning-15',3,'worship','Worship',180,'Sing, speak or listen to a song of worship.'),
 ('w-morning-15-4','w-morning-15',4,'tongues','Praying in the Spirit',180,'Pray in the Spirit (Jude 1:20). Let your spirit pray freely.'),
 ('w-morning-15-5','w-morning-15',5,'prayer','Prayer',180,'Thanksgiving, then your needs, then others.'),
 ('w-morning-15-6','w-morning-15',6,'reflection','Reflection',90,'What stood out to you? Hold on to it today.');
UPDATE workouts SET minutes = 15 WHERE id = 'w-morning-15';
DELETE FROM workout_steps WHERE workout_id = 'w-deepen-30';
INSERT INTO workout_steps (id, workout_id, position, kind, label, seconds, guidance) VALUES
 ('w-deepen-30-1','w-deepen-30',1,'stillness','Stillness',180,'Settle in. There is no rush here.'),
 ('w-deepen-30-2','w-deepen-30',2,'devotion','Devotion',300,'Read today’s word and the passage around it. Speak the declaration.'),
 ('w-deepen-30-3','w-deepen-30',3,'worship','Worship',360,'Worship without hurry.'),
 ('w-deepen-30-4','w-deepen-30',4,'tongues','Praying in the Spirit',420,'Build yourself up in your most holy faith, praying in the Holy Ghost (Jude 1:20).'),
 ('w-deepen-30-5','w-deepen-30',5,'prayer','Prayer',420,'Pray through what you read, then bring your requests.'),
 ('w-deepen-30-6','w-deepen-30',6,'reflection','Reflection',120,'Write down one thing you received.');
UPDATE workouts SET minutes = 30 WHERE id = 'w-deepen-30';
DELETE FROM workout_steps WHERE workout_id = 'w-secret-60';
INSERT INTO workout_steps (id, workout_id, position, kind, label, seconds, guidance) VALUES
 ('w-secret-60-1','w-secret-60',1,'stillness','Stillness',300,'Come away from distraction. Be with Him.'),
 ('w-secret-60-2','w-secret-60',2,'devotion','Devotion',600,'Meditate on today’s word. Read it again and again.'),
 ('w-secret-60-3','w-secret-60',3,'worship','Worship',900,'Extended worship.'),
 ('w-secret-60-4','w-secret-60',4,'tongues','Praying in the Spirit',900,'Pray in the Spirit, and let your spirit pray freely.'),
 ('w-secret-60-5','w-secret-60',5,'prayer','Prayer',600,'Pray for yourself, your family, your church and the nation.'),
 ('w-secret-60-6','w-secret-60',6,'reflection','Reflection',300,'Journal what God has been teaching you.');
UPDATE workouts SET minutes = 60 WHERE id = 'w-secret-60';
DELETE FROM workout_steps WHERE workout_id = 'w-spirit-20';
INSERT INTO workout_steps (id, workout_id, position, kind, label, seconds, guidance) VALUES
 ('w-spirit-20-1','w-spirit-20',1,'stillness','Stillness',120,'Quiet your heart before the Lord.'),
 ('w-spirit-20-2','w-spirit-20',2,'scripture','Scripture',120,'Read Jude 1:20 and Romans 8:26.'),
 ('w-spirit-20-3','w-spirit-20',3,'worship','Worship',300,'Worship until your heart is fully turned to Him.'),
 ('w-spirit-20-4','w-spirit-20',4,'tongues','Praying in the Spirit',600,'Pray in the Spirit. Let the Holy Spirit help you pray.'),
 ('w-spirit-20-5','w-spirit-20',5,'reflection','Reflection',60,'Thank God for His presence.');
UPDATE workouts SET minutes = 20 WHERE id = 'w-spirit-20';
UPDATE workouts SET description = 'Stillness, devotion, worship, praying in the Spirit and prayer.' WHERE id = 'w-morning-15';

-- Daily word: verse + short reflection + declaration (rotates daily; admins can add more)
CREATE TABLE devotions (
  id          TEXT PRIMARY KEY,
  sort        INTEGER NOT NULL DEFAULT 0,
  reference   TEXT NOT NULL,
  text        TEXT NOT NULL,
  reflection  TEXT NOT NULL,
  declaration TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO devotions (id, sort, reference, text, reflection, declaration) VALUES
 ('dv001', 1, 'Lamentations 3:22-23', 'It is of the LORD''s mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness.', 'Yesterday does not get the final word. Every morning God meets you with fresh mercy, not leftover patience.', 'I receive new mercy today. I am not consumed; I begin again in God''s faithfulness.'),
 ('dv002', 2, 'Psalm 46:10', 'Be still, and know that I am God: I will be exalted among the heathen, I will be exalted in the earth.', 'Stillness is not doing nothing. It is choosing to trust that God is God while you stop striving.', 'I will be still. God is God, and He is with me in this day.'),
 ('dv003', 3, 'Isaiah 40:31', 'But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.', 'Waiting on the Lord is not wasted time. It is where tired people are quietly given new strength.', 'I wait on the Lord, and my strength is renewed. I will run and not be weary.'),
 ('dv004', 4, 'Philippians 4:13', 'I can do all things through Christ which strengtheneth me.', 'This promise is not about doing everything you want; it is about facing everything you must, with Christ''s strength.', 'Through Christ who strengthens me, I can face whatever this day holds.'),
 ('dv005', 5, 'Proverbs 3:5-6', 'Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.', 'Trusting God with all your heart often means trusting Him beyond what you understand.', 'I trust the Lord with all my heart. He is directing my paths.'),
 ('dv006', 6, 'Psalm 23:1', 'The LORD is my shepherd; I shall not want.', 'When the Lord is your shepherd, your needs are known and your steps are watched over.', 'The Lord is my shepherd. I lack nothing I truly need.'),
 ('dv007', 7, 'Joshua 1:9', 'Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.', 'Courage is not the absence of fear. It is moving forward because God goes with you.', 'I am strong and of good courage. The Lord my God is with me wherever I go.'),
 ('dv008', 8, 'Matthew 11:28', 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.', 'Jesus does not ask the weary to try harder. He invites them to come and rest.', 'I come to Jesus with every burden, and I receive His rest.'),
 ('dv009', 9, 'Romans 8:28', 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.', 'Not everything is good, but God is able to work good out of everything for those who love Him.', 'All things are working together for my good, because I love God and I am called by Him.'),
 ('dv010', 10, 'Jeremiah 29:11', 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.', 'God''s thoughts toward you are peace, not evil. Your future is held by a good Father.', 'God''s thoughts toward me are peace. My future is secure in His hands.'),
 ('dv011', 11, '2 Corinthians 5:17', 'Therefore if any man be in Christ, he is a new creature: old things are passed away; behold, all things are become new.', 'In Christ you are not a repaired old thing; you are a new creation.', 'I am a new creature in Christ. Old things have passed away; all things are new.'),
 ('dv012', 12, 'Psalm 119:105', 'Thy word is a lamp unto my feet, and a light unto my path.', 'God''s Word may not show you the whole road, but it lights the next step.', 'God''s Word is a lamp to my feet. I will walk in its light today.'),
 ('dv013', 13, 'Hebrews 4:16', 'Let us therefore come boldly unto the throne of grace, that we may obtain mercy, and find grace to help in time of need.', 'You do not have to earn your way into God''s presence. Grace invites you to come boldly.', 'I come boldly to the throne of grace, and I find help in my time of need.'),
 ('dv014', 14, 'James 4:8', 'Draw nigh to God, and he will draw nigh to you. Cleanse your hands, ye sinners; and purify your hearts, ye double minded.', 'God is never far from the one who draws near. Take one step toward Him today.', 'I draw near to God, and He draws near to me.'),
 ('dv015', 15, 'Micah 7:8', 'Rejoice not against me, O mine enemy: when I fall, I shall arise; when I sit in darkness, the LORD shall be a light unto me.', 'A fall is not the end of your story. Even in darkness, the Lord is your light.', 'When I fall, I shall arise. The Lord is my light.'),
 ('dv016', 16, 'Philippians 4:6-7', 'Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God. And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus.', 'Anxiety loses its grip when worries become prayers mixed with thanksgiving.', 'I will not be anxious. I bring everything to God with thanksgiving, and His peace guards my heart.'),
 ('dv017', 17, 'Isaiah 41:10', 'Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.', 'God does not only tell you not to fear; He gives you the reason: I am with you.', 'I will not fear, for God is with me. He strengthens me, helps me and upholds me.'),
 ('dv018', 18, 'Psalm 27:1', 'The LORD is my light and my salvation; whom shall I fear? the LORD is the strength of my life; of whom shall I be afraid?', 'When God is your light and strength, fear loses its right to rule you.', 'The Lord is my light and my salvation. I will not be afraid.'),
 ('dv019', 19, 'Deuteronomy 31:8', 'And the LORD, he it is that doth go before thee; he will be with thee, he will not fail thee, neither forsake thee: fear not, neither be dismayed.', 'Before you enter today, the Lord has already gone ahead of you.', 'The Lord goes before me. He will not fail me nor forsake me.'),
 ('dv020', 20, 'Psalm 34:8', 'O taste and see that the LORD is good: blessed is the man that trusteth in him.', 'Faith grows as you taste and see for yourself that God is good.', 'I taste and see that the Lord is good. I am blessed as I trust in Him.'),
 ('dv021', 21, 'Isaiah 26:3', 'Thou wilt keep him in perfect peace, whose mind is stayed on thee: because he trusteth in thee.', 'Peace follows focus. A mind stayed on God is kept in perfect peace.', 'My mind is stayed on God, and I am kept in perfect peace.'),
 ('dv022', 22, 'John 14:27', 'Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you. Let not your heart be troubled, neither let it be afraid.', 'The peace Jesus gives does not depend on calm circumstances.', 'I receive the peace of Jesus. My heart will not be troubled or afraid.'),
 ('dv023', 23, 'Romans 8:37', 'Nay, in all these things we are more than conquerors through him that loved us.', 'You are not merely surviving; in Christ you are more than a conqueror.', 'In all these things I am more than a conqueror through Him who loves me.'),
 ('dv024', 24, '2 Timothy 1:7', 'For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.', 'Fear is not from God. He gives power, love and a sound mind.', 'I have not been given a spirit of fear, but of power, love and a sound mind.'),
 ('dv025', 25, 'Galatians 6:9', 'And let us not be weary in well doing: for in due season we shall reap, if we faint not.', 'Faithfulness in small, unseen things will bear fruit in due season.', 'I will not grow weary in doing good. My harvest is coming in due season.'),
 ('dv026', 26, 'Psalm 37:4', 'Delight thyself also in the LORD: and he shall give thee the desires of thine heart.', 'As you delight in God, your desires begin to look more like His.', 'I delight myself in the Lord, and He shapes and fulfils the desires of my heart.'),
 ('dv027', 27, 'Nehemiah 8:10', 'Then he said unto them, Go your way, eat the fat, and drink the sweet, and send portions unto them for whom nothing is prepared: for this day is holy unto our LORD: neither be ye sorry; for the joy of the LORD is your strength.', 'Joy is not a mood you manufacture. The joy of the Lord is strength He gives.', 'The joy of the Lord is my strength today.'),
 ('dv028', 28, 'Zechariah 4:6', 'Then he answered and spake unto me, saying, This is the word of the LORD unto Zerubbabel, saying, Not by might, nor by power, but by my spirit, saith the LORD of hosts.', 'What seems impossible by human effort is possible by God''s Spirit.', 'Not by might, nor by power, but by the Spirit of the Lord, this day is victorious.'),
 ('dv029', 29, 'Ephesians 3:20', 'Now unto him that is able to do exceeding abundantly above all that we ask or think, according to the power that worketh in us,', 'God is able to do far more than you can ask or imagine. Pray big, trust deeply.', 'God is able to do exceedingly abundantly above all I ask or think.'),
 ('dv030', 30, 'Psalm 121:1-2', 'I will lift up mine eyes unto the hills, from whence cometh my help. My help cometh from the LORD, which made heaven and earth.', 'Lift your eyes past the problem. Your help comes from the Maker of heaven and earth.', 'My help comes from the Lord, who made heaven and earth.'),
 ('dv031', 31, 'Matthew 6:33', 'But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.', 'Put God first, and trust Him with the rest.', 'I seek first the kingdom of God, and everything I need will be added to me.'),
 ('dv032', 32, 'Psalm 91:1-2', 'He that dwelleth in the secret place of the most High shall abide under the shadow of the Almighty. I will say of the LORD, He is my refuge and my fortress: my God; in him will I trust.', 'There is a secret place of safety for those who dwell near God.', 'I dwell in the secret place of the Most High. He is my refuge and my fortress.'),
 ('dv033', 33, 'Isaiah 43:19', 'Behold, I will do a new thing; now it shall spring forth; shall ye not know it? I will even make a way in the wilderness, and rivers in the desert.', 'God is not finished. He can make a way where you see no way.', 'God is doing a new thing in my life. He is making a way in the wilderness.'),
 ('dv034', 34, '1 Peter 5:7', 'Casting all your care upon him; for he careth for you.', 'You were never meant to carry your cares alone. God cares for you.', 'I cast all my cares on God, because He cares for me.'),
 ('dv035', 35, 'Psalm 118:24', 'This is the day which the LORD hath made; we will rejoice and be glad in it.', 'Today is a gift from God. Choose to rejoice in it.', 'This is the day the Lord has made. I will rejoice and be glad in it.'),
 ('dv036', 36, 'Hebrews 13:5', 'Let your conversation be without covetousness; and be content with such things as ye have: for he hath said, I will never leave thee, nor forsake thee.', 'Whatever changes around you, God''s presence does not leave.', 'God will never leave me nor forsake me. I am content in Him.'),
 ('dv037', 37, 'John 15:5', 'I am the vine, ye are the branches: He that abideth in me, and I in him, the same bringeth forth much fruit: for without me ye can do nothing.', 'Fruitfulness flows from connection. Stay close to Jesus today.', 'I abide in Christ, the true vine, and my life bears much fruit.'),
 ('dv038', 38, 'Romans 15:13', 'Now the God of hope fill you with all joy and peace in believing, that ye may abound in hope, through the power of the Holy Ghost.', 'Hope is not wishful thinking; it is a gift the Holy Spirit fills you with.', 'The God of hope fills me with joy and peace. I abound in hope by the power of the Holy Spirit.'),
 ('dv039', 39, 'Psalm 139:14', 'I will praise thee; for I am fearfully and wonderfully made: marvellous are thy works; and that my soul knoweth right well.', 'You are not an accident. You were fearfully and wonderfully made.', 'I am fearfully and wonderfully made. God''s works are marvellous, and I am one of them.'),
 ('dv040', 40, 'Colossians 3:23', 'And whatsoever ye do, do it heartily, as to the Lord, and not unto men;', 'Ordinary work becomes worship when you do it for the Lord.', 'Whatever I do today, I do heartily as unto the Lord.'),
 ('dv041', 41, '1 John 4:19', 'We love him, because he first loved us.', 'Your love for God begins with His love for you. He loved you first.', 'I am loved by God, and His love flows through me to others today.'),
 ('dv042', 42, 'Revelation 21:4', 'And God shall wipe away all tears from their eyes; and there shall be no more death, neither sorrow, nor crying, neither shall there be any more pain: for the former things are passed away.', 'Every tear is noticed, and a day is coming when God will wipe them all away.', 'My hope is in God. Sorrow will not have the last word in my life.');


-- Medals & trophies (personal only, no leaderboards)
CREATE TABLE user_awards (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  award_key  TEXT NOT NULL,
  awarded_at TEXT NOT NULL DEFAULT (datetime('now')),
  seen_at    TEXT,
  PRIMARY KEY (user_id, award_key)
);

-- Bible reading plans
CREATE TABLE user_plans (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_key     TEXT NOT NULL,
  circle_id    TEXT,
  start_date   TEXT NOT NULL,              -- YYYY-MM-DD
  status       TEXT NOT NULL DEFAULT 'active', -- active | completed | stopped
  completed_at TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_user_plans ON user_plans(user_id, status);

CREATE TABLE plan_days_done (
  user_plan_id TEXT NOT NULL REFERENCES user_plans(id) ON DELETE CASCADE,
  day_number   INTEGER NOT NULL,
  completed_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_plan_id, day_number)
);

-- Read together: a circle of friends on the same plan
CREATE TABLE reading_circles (
  id          TEXT PRIMARY KEY,
  plan_key    TEXT NOT NULL,
  name        TEXT NOT NULL,
  created_by  TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  start_date  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- What I learnt (private to me, or shared with my circle)
CREATE TABLE plan_notes (
  id           TEXT PRIMARY KEY,
  user_plan_id TEXT NOT NULL REFERENCES user_plans(id) ON DELETE CASCADE,
  circle_id    TEXT,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_number   INTEGER NOT NULL,
  body         TEXT NOT NULL,
  is_hidden    INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_plan_notes_circle ON plan_notes(circle_id, created_at);

-- Instrumental music uploaded by admins (played during workouts; otherwise the built-in calm music is used)
CREATE TABLE music_tracks (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  media_key  TEXT NOT NULL,
  sort       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
