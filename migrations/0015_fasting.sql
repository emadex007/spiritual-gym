-- SpiritualGym: fasting tracker (for everyone) and a moderated testimonies wall

CREATE TABLE fasts (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL,              -- partial | daniel | full | dry | media
  title         TEXT NOT NULL,
  intention     TEXT,                       -- private: what they are seeking God for
  days          INTEGER NOT NULL DEFAULT 1, -- for daily fasts (partial, daniel, media)
  hours         INTEGER,                    -- for continuous fasts (full, dry)
  start_day     TEXT NOT NULL,              -- YYYY-MM-DD, local to the person
  daily_start   TEXT,                       -- HH:MM (partial fasts)
  daily_end     TEXT,                       -- HH:MM (partial fasts)
  start_at      TEXT NOT NULL,              -- ISO time the fast began (UTC)
  end_at        TEXT NOT NULL,              -- ISO time the whole fast ends (UTC)
  timezone      TEXT NOT NULL DEFAULT 'Africa/Lagos',
  notify        INTEGER NOT NULL DEFAULT 1,
  last_notified TEXT,                       -- local day of the last break-fast reminder
  status        TEXT NOT NULL DEFAULT 'active', -- active | completed | stopped
  completed_at  TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_fasts_user ON fasts(user_id, status);
CREATE INDEX idx_fasts_active ON fasts(status, end_at);

CREATE TABLE fast_days (
  fast_id    TEXT NOT NULL REFERENCES fasts(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  note       TEXT,                          -- private reflection
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (fast_id, day_number)
);

-- A 21-day fasting devotional (longer fasts cycle through it)
CREATE TABLE fasting_guide (
  day        INTEGER PRIMARY KEY,
  title      TEXT NOT NULL,
  reference  TEXT NOT NULL,
  text       TEXT NOT NULL,
  reflection TEXT NOT NULL,
  points     TEXT NOT NULL                  -- JSON array of prayer points
);

-- Testimonies: shared by adults, published only after an admin approves them
CREATE TABLE testimonies (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prayer_item_id TEXT,
  category       TEXT NOT NULL DEFAULT 'answered',
  title          TEXT NOT NULL,
  body           TEXT NOT NULL,
  scripture      TEXT,
  is_anonymous   INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected | hidden
  review_note    TEXT,
  amens          INTEGER NOT NULL DEFAULT 0,
  praises        INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  approved_at    TEXT
);
CREATE INDEX idx_testimonies_status ON testimonies(status, approved_at);
CREATE INDEX idx_testimonies_user ON testimonies(user_id);

CREATE TABLE testimony_reactions (
  testimony_id TEXT NOT NULL REFERENCES testimonies(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL,               -- amen | praise
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (testimony_id, user_id, kind)
);

INSERT INTO fasting_guide (day, title, reference, text, reflection, points) VALUES
(1, 'The Fast God Chooses', 'Isaiah 58:6', 'Is not this the fast that I have chosen? to loose the bands of wickedness, to undo the heavy burdens, and to let the oppressed go free, and that ye break every yoke?', 'God''s kind of fast is not about looking holy or going hungry for nothing. It is about drawing near to Him so that chains break, burdens lift and people are set free. Begin this fast with an open heart and expect God to meet you.', '["Thank God for the privilege of seeking His face through this fast.", "Ask the Lord to loose every band of wickedness holding you or your loved ones.", "Pray that this fast will make you kinder and more generous to people around you."]'),
(2, 'Return With All Your Heart', 'Joel 2:12', 'Therefore also now, saith the LORD, turn ye even to me with all your heart, and with fasting, and with weeping, and with mourning:', 'God is not calling you to perform but to come home. He invites you to turn to Him with your whole heart, even with tears. Wherever you have drifted, today is a good day to return, and He is waiting with open arms.', '["Thank God that His door is always open to those who return.", "Ask the Lord to draw your whole heart back to Him, holding nothing back.", "Pray for grace to seek God sincerely throughout this fast, not just outwardly."]'),
(3, 'Fasting Before Your Father', 'Matthew 6:17-18', 'But thou, when thou fastest, anoint thine head, and wash thy face; That thou appear not unto men to fast, but unto thy Father which is in secret: and thy Father, which seeth in secret, shall reward thee openly.', 'Jesus teaches us to fast quietly, without drawing attention to ourselves. Your fast is a private conversation with a Father who sees in secret. You do not need anyone''s applause, because He notices every sincere step you take toward Him.', '["Thank God that He sees and values what is done in secret.", "Ask the Lord to keep your motives pure and free from show.", "Declare that this fast is for God alone, and He will honour it."]'),
(4, 'A Clean Heart, Please', 'Psalm 51:10', 'Create in me a clean heart, O God; and renew a right spirit within me.', 'David did not try to fix himself; he asked God to create a clean heart in him. Real change starts when we bring our hearts honestly to the Lord. He does not just patch us up; He renews us from the inside.', '["Ask God to create a clean heart and renew a right spirit within you.", "Thank the Lord that He can make all things new in you.", "Pray for grace to guard your heart in what you watch, hear and think."]'),
(5, 'Faithful to Forgive', '1 John 1:9', 'If we confess our sins, he is faithful and just to forgive us our sins, and to cleanse us from all unrighteousness.', 'Confession is not about being shamed; it is about being set free. When we are honest with God about our sins, He is faithful to forgive and cleanse us completely. You do not have to carry yesterday''s guilt into today.', '["Confess to God anything that has come between you and Him.", "Thank the Lord that He is faithful and just to forgive you.", "Declare that you are cleansed and walk today free from condemnation."]'),
(6, 'Humble Yourself and Pray', '2 Chronicles 7:14', 'If my people, which are called by my name, shall humble themselves, and pray, and seek my face, and turn from their wicked ways; then will I hear from heaven, and will forgive their sin, and will heal their land.', 'God''s promise to heal the land begins with His own people humbling themselves, praying and turning from wrong ways. Revival starts with us, not with others. As you fast, let your humility become a doorway for God''s healing touch on your life and land.', '["Ask God for a humble heart that seeks His face above everything.", "Pray for grace to turn from every wrong way in your life.", "Ask the Lord to hear from heaven and heal our land."]'),
(7, 'Search Me, O God', 'Psalm 139:23-24', 'Search me, O God, and know my heart: try me, and know my thoughts: And see if there be any wicked way in me, and lead me in the way everlasting.', 'It takes courage to invite God to search your heart, but He does it with love, not to condemn you. He shows us what hurts us so He can lead us into the way everlasting. Let Him gently shine His light within today.', '["Invite the Holy Spirit to search your heart and thoughts today.", "Ask the Lord to reveal and remove anything that grieves Him.", "Pray that God will lead you in the way everlasting."]'),
(8, 'Call and He Answers', 'Jeremiah 33:3', 'Call unto me, and I will answer thee, and shew thee great and mighty things, which thou knowest not.', 'God is not distant or silent toward those who call on Him. He promises to answer and to show us things we could not figure out on our own. Bring your questions to Him today and listen with expectation.', '["Call on the Lord and thank Him that He answers.", "Ask God to show you great and mighty things you do not yet know.", "Pray for patience to wait and listen for His answer."]'),
(9, 'Trust Him With Your Paths', 'Proverbs 3:5-6', 'Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.', 'Our understanding is limited, but God sees the whole road ahead. When we trust Him fully and acknowledge Him in every decision, He directs our paths. Whatever choice you are facing, invite Him into it before you move.', '["Ask the Lord for grace to trust Him with all your heart.", "Surrender to God the decisions you are facing right now.", "Pray that He will direct your paths in family, work and ministry."]'),
(10, 'His Sheep Hear Him', 'John 10:27', 'My sheep hear my voice, and I know them, and they follow me:', 'Jesus says His sheep hear His voice. Hearing God is not only for a special few; it is part of belonging to Him. As you quiet your heart in this fast, expect to recognise His voice and follow where He leads.', '["Thank Jesus that you are His sheep and He knows you.", "Ask the Lord to quiet every noise so you can hear His voice clearly.", "Pray for a willing heart to follow wherever He leads."]'),
(11, 'Guided by His Eye', 'Psalm 32:8', 'I will instruct thee and teach thee in the way which thou shalt go: I will guide thee with mine eye.', 'God is a patient teacher. He promises to instruct you, teach you and guide you in the way you should go. You are not walking alone or guessing in the dark; His loving eye is on you every step of the way.', '["Thank God that He personally instructs and teaches you.", "Ask the Lord to guide you in the way you should go this season.", "Pray for a teachable spirit that responds quickly to His leading."]'),
(12, 'Renewed Strength While Waiting', 'Isaiah 40:31', 'But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.', 'Fasting can leave the body weak, but waiting on the Lord renews a deeper strength within. Those who wait on Him rise like eagles and keep going without giving up. If you feel tired today, lean on Him and receive fresh strength.', '["Ask the Lord to renew your strength as you wait on Him.", "Declare that you will run and not be weary, walk and not faint.", "Pray for anyone around you who feels tired or discouraged today."]'),
(13, 'Not by Might', 'Zechariah 4:6', 'Then he answered and spake unto me, saying, This is the word of the LORD unto Zerubbabel, saying, Not by might, nor by power, but by my spirit, saith the LORD of hosts.', 'Some mountains cannot be moved by effort, connections or cleverness. God reminds us that breakthrough comes by His Spirit. Stop straining in your own strength and invite the Holy Spirit to do what only He can do.', '["Surrender to God the situations you have been trying to fix alone.", "Ask the Holy Spirit to move in every area where you need breakthrough.", "Declare that your victory comes not by might, but by God''s Spirit."]'),
(14, 'Power to Be Witnesses', 'Acts 1:8', 'But ye shall receive power, after that the Holy Ghost is come upon you: and ye shall be witnesses unto me both in Jerusalem, and in all Judaea, and in Samaria, and unto the uttermost part of the earth.', 'The Holy Spirit gives power not for show but for witness. He empowers ordinary people to share Jesus at home, in their city and to the ends of the earth. Ask for a fresh filling today so your life points others to Christ.', '["Ask the Lord for a fresh filling of the Holy Spirit today.", "Pray for boldness to share Jesus with someone this week.", "Pray for missionaries and evangelists taking the gospel to hard places."]'),
(15, 'The Lord Builds the House', 'Psalm 127:1', 'Except the LORD build the house, they labour in vain that build it: except the LORD keep the city, the watchman waketh but in vain.', 'No matter how hard we work, a home is truly secure only when the Lord builds and keeps it. Today, bring your family before God. Invite Him to be the foundation, the protector and the peace of your household.', '["Invite the Lord to build and keep your home.", "Pray for peace, love and unity among your family members.", "Ask God to watch over every member of your family, near and far."]'),
(16, 'A Church That Continues', 'Acts 2:42', 'And they continued stedfastly in the apostles'' doctrine and fellowship, and in breaking of bread, and in prayers.', 'The early church grew strong by staying faithful to teaching, fellowship, sharing meals and prayer. These simple habits still keep God''s people healthy today. Pray for your local church to be a family that continues steadfastly together.', '["Thank God for your local church and its leaders.", "Pray for your church to stay steadfast in the Word, fellowship and prayer.", "Ask the Lord to heal divisions and strengthen love among believers."]'),
(17, 'Praying for Our Nation', '1 Timothy 2:1-2', 'I exhort therefore, that, first of all, supplications, prayers, intercessions, and giving of thanks, be made for all men; For kings, and for all that are in authority; that we may lead a quiet and peaceable life in all godliness and honesty.', 'Scripture asks us to pray for all people, including those in authority, so that we may live peaceful and godly lives. Whatever the news says, your prayers for Nigeria and every nation matter. Pray with hope, not bitterness.', '["Pray for wisdom, integrity and the fear of God for our leaders.", "Ask the Lord for peace, safety and justice across the nation.", "Thank God in advance for what He will do in our land."]'),
(18, 'Enter With Thanksgiving', 'Psalm 100:4', 'Enter into his gates with thanksgiving, and into his courts with praise: be thankful unto him, and bless his name.', 'Thanksgiving is the gate into God''s presence. Before asking for anything today, pause to thank Him for what He has already done. A grateful heart sees God''s goodness more clearly and fasts with joy instead of heaviness.', '["Thank God for specific blessings He has given you this year.", "Praise the Lord for His faithfulness during this fast.", "Ask God to fill your heart with gratitude in every season."]'),
(19, 'He Will Supply', 'Philippians 4:19', 'But my God shall supply all your need according to his riches in glory by Christ Jesus.', 'Paul wrote this to generous believers who had cared for him. God knows every need you have, not just money but strength, wisdom and comfort. He supplies from His riches in Christ, so you can rest instead of worry.', '["Thank God that He knows every need you have.", "Commit your needs to the Lord and ask Him to supply them in Christ.", "Ask for a generous heart to meet the needs of others too."]'),
(20, 'Faith That Pleases God', 'Hebrews 11:6', 'But without faith it is impossible to please him: for he that cometh to God must believe that he is, and that he is a rewarder of them that diligently seek him.', 'Faith simply means coming to God believing He is real and that He rewards those who seek Him. Every day of this fast has been an act of seeking. Be encouraged: your seeking is not wasted, and God sees it.', '["Declare that God is real and He rewards those who seek Him.", "Ask the Lord to strengthen your faith where doubt has crept in.", "Pray for grace to keep seeking God diligently after this fast."]'),
(21, 'He Will Finish It', 'Philippians 1:6', 'Being confident of this very thing, that he which hath begun a good work in you will perform it until the day of Jesus Christ:', 'The fast may end, but God''s work in you continues. What He began during these days, He will carry on to completion. Break your fast gently, keep the habits of prayer you have built, and walk confidently in what God has done.', '["Thank God for everything He has done in you during this fast.", "Declare that He who began a good work in you will complete it.", "Ask the Lord for grace to keep walking closely with Him from today."]');
