-- Six starter topic plans so the Plans shelf isn't empty on day one (Anxiety, Hope, Fear, Marriage, Forgiveness, Purpose).
-- Published as TheRenewGym under the first admin account. Safe to run again (INSERT OR IGNORE); admins can edit or remove them.
-- If there is no admin yet, nothing is added.
INSERT OR IGNORE INTO topic_plans (id, author_id, title, topic, summary, author_name, author_bio, cover_key, days, status, submitted_at, approved_at)
  SELECT 'starter-anxiety', id, 'Peace in the Storm', 'Anxiety', 'Seven days for anyone carrying worry. Each day you bring one burden to God and learn a little more of the peace He promises, the kind that keeps your heart and mind.', 'TheRenewGym', 'Written by the TheRenewGym team.', NULL, 7, 'approved', datetime('now'), datetime('now')
  FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1;
INSERT OR IGNORE INTO topic_plan_days (plan_id, day, title, scripture, body, prayer)
  SELECT 'starter-anxiety', 1, 'You are not alone in this', 'Ps 34:4-6, 1 Pet 5:7', 'Worry can feel like a private storm, as if no one else can see it. But Scripture is full of people who were afraid, overwhelmed and sleepless, and who cried out to God. David wrote, “I sought the LORD, and he heard me, and delivered me from all my fears” (Ps 34:4).

Peter, who once sank in the waves, later wrote: “Casting all your care upon him; for he careth for you” (1 Pet 5:7). Notice the reason. Not because you are strong enough, but because He cares.

Today, don’t try to fix everything. Just tell God honestly what you are carrying. Name it. That is where peace begins.', 'Father, You see what I am carrying, even the things I haven’t said out loud. I bring them to You now: [name them]. Thank You that You care for me. Hold me today. In Jesus’ name, amen.' WHERE EXISTS (SELECT 1 FROM topic_plans WHERE id = 'starter-anxiety');
INSERT OR IGNORE INTO topic_plan_days (plan_id, day, title, scripture, body, prayer)
  SELECT 'starter-anxiety', 2, 'Peace is a Person', 'John 14:27, Isa 9:6', 'Jesus did not only give advice about peace. He said, “Peace I leave with you, my peace I give unto you” (Jn 14:27). Peace is something He gives, because He Himself is the Prince of Peace (Isa 9:6).

The world’s peace depends on circumstances: when the bills are paid, when the test result is good. His peace is different. It can sit beside you in the storm before the storm ends.

Today, instead of chasing a feeling of calm, turn towards Jesus. Sit with Him for a few minutes in quiet. Let Him be your peace.', 'Lord Jesus, You are the Prince of Peace. I don’t need to understand everything to trust You. Give me Your peace, not as the world gives. Let not my heart be troubled. Amen.' WHERE EXISTS (SELECT 1 FROM topic_plans WHERE id = 'starter-anxiety');
INSERT OR IGNORE INTO topic_plan_days (plan_id, day, title, scripture, body, prayer)
  SELECT 'starter-anxiety', 3, 'Pray instead of panic', 'Phil 4:6-7', 'Paul wrote from prison: “Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God” (Phil 4:6). “Careful” here means anxious.

Notice the exchange. We give God our requests, with thanks, and He gives us a peace that “passeth all understanding”, which keeps our hearts and minds (Phil 4:7). It doesn’t say every problem disappears. It says your heart is guarded.

Today, every time a worry comes, turn it into a short prayer, and add one thing you are thankful for.', 'Father, instead of worrying, I bring You my requests: [name them]. Thank You for [something you’re grateful for]. Guard my heart and my mind with Your peace today. In Jesus’ name, amen.' WHERE EXISTS (SELECT 1 FROM topic_plans WHERE id = 'starter-anxiety');
INSERT OR IGNORE INTO topic_plan_days (plan_id, day, title, scripture, body, prayer)
  SELECT 'starter-anxiety', 4, 'One day at a time', 'Matt 6:25-34', 'Much of our anxiety lives in tomorrow: what might happen, what could go wrong. Jesus pointed to the birds and the lilies. They don’t store up or toil, and yet the Father feeds them and clothes them.

Then He gave us a gentle boundary: “Take therefore no thought for the morrow: for the morrow shall take thought for the things of itself” (Matt 6:34). God gives grace for today, not for imaginary tomorrows.

Today, ask: what is mine to do today? Do that, and leave tomorrow with Him.', 'Lord, You know what I need before I ask. Help me seek Your kingdom first and trust You with tomorrow. Give me grace for today, and the strength to do what is mine to do. Amen.' WHERE EXISTS (SELECT 1 FROM topic_plans WHERE id = 'starter-anxiety');
INSERT OR IGNORE INTO topic_plan_days (plan_id, day, title, scripture, body, prayer)
  SELECT 'starter-anxiety', 5, 'Take your thoughts captive', '2 Cor 10:5, Phil 4:8', 'Anxious thoughts often run in circles: what if, what if, what if. Scripture says we can bring “into captivity every thought to the obedience of Christ” (2 Cor 10:5). You don’t have to believe every thought that passes through your mind.

Paul gives us a better place for our minds to rest: whatever is true, honest, just, pure, lovely and of good report, “think on these things” (Phil 4:8).

Today, when a fearful thought comes, ask: is this true? Then replace it with something God says is true.', 'Lord, I bring my racing thoughts to You. Help me notice the lies and hold them up to Your truth. Fill my mind with what is true, pure and lovely. Renew my mind today. Amen.' WHERE EXISTS (SELECT 1 FROM topic_plans WHERE id = 'starter-anxiety');
INSERT OR IGNORE INTO topic_plan_days (plan_id, day, title, scripture, body, prayer)
  SELECT 'starter-anxiety', 6, 'Rest for your body', 'Ps 4:8, Ps 127:2, Mark 6:31', 'Anxiety is not only in the mind; it lives in the body too. God cares about your sleep: “I will both lay me down in peace, and sleep: for thou, LORD, only makest me dwell in safety” (Ps 4:8). “He giveth his beloved sleep” (Ps 127:2).

Even Jesus told His tired disciples, “Come ye yourselves apart into a desert place, and rest a while” (Mk 6:31). Rest is not laziness. It is trust.

Today, care for your body: drink water, take a short walk, breathe slowly, and go to bed a little earlier. If anxiety is heavy or won’t lift, talking to a doctor or counsellor is wise and good.', 'Father, I lay down in peace tonight, because You keep me safe. Calm my body and my breathing. Thank You for the gift of rest. Help me care for the body You gave me. Amen.' WHERE EXISTS (SELECT 1 FROM topic_plans WHERE id = 'starter-anxiety');
INSERT OR IGNORE INTO topic_plan_days (plan_id, day, title, scripture, body, prayer)
  SELECT 'starter-anxiety', 7, 'He is with you in the storm', 'Mark 4:35-41, Isa 43:2', 'The disciples were in a terrible storm, and Jesus was asleep in the boat. They cried, “Master, carest thou not that we perish?” He rose, rebuked the wind, and said to the sea, “Peace, be still” (Mk 4:39).

He was in the boat the whole time. God promises, “When thou passest through the waters, I will be with thee” (Isa 43:2). Not if, but when, and He is with you.

As this plan ends, look back over the week. Where did you see God carry you? Write it down, and come back to it next time the storm rises.', 'Lord Jesus, You are in the boat with me. Speak Your “Peace, be still” over my heart. Thank You for this week. Keep teaching me to bring my worries to You every day. Amen.' WHERE EXISTS (SELECT 1 FROM topic_plans WHERE id = 'starter-anxiety');
INSERT OR IGNORE INTO topic_plans (id, author_id, title, topic, summary, author_name, author_bio, cover_key, days, status, submitted_at, approved_at)
  SELECT 'starter-hope', id, 'When Hope Feels Far', 'Hope', 'Five days for the hard seasons, when prayers seem unanswered and the future feels dark. Through the Psalms and God’s promises, find a hope that holds.', 'TheRenewGym', 'Written by the TheRenewGym team.', NULL, 5, 'approved', datetime('now'), datetime('now')
  FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1;
INSERT OR IGNORE INTO topic_plan_days (plan_id, day, title, scripture, body, prayer)
  SELECT 'starter-hope', 1, 'It’s okay to be honest', 'Ps 42, Ps 13', '“How long wilt thou forget me, O LORD? for ever?” (Ps 13:1). Some of the Bible’s prayers are raw and honest. God put them there so we know we can bring Him our real hearts, not a polished version.

In Psalm 42 the writer is downcast, yet he speaks to his own soul: “Hope thou in God: for I shall yet praise him.” Honest lament and stubborn hope can live together.

Today, tell God how you really feel. Then add one line: “Yet I will hope in You.”', 'Lord, I feel [say it honestly]. Some days hope feels far away. Yet I choose to hope in You, because You have not forgotten me. Hold on to me when I can’t hold on. Amen.' WHERE EXISTS (SELECT 1 FROM topic_plans WHERE id = 'starter-hope');
INSERT OR IGNORE INTO topic_plan_days (plan_id, day, title, scripture, body, prayer)
  SELECT 'starter-hope', 2, 'His mercies are new', 'Lam 3:19-26', 'Lamentations was written after Jerusalem was destroyed. In the middle of grief, Jeremiah remembered something: “It is of the LORD’s mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness” (Lam 3:22-23).

He didn’t deny the pain. He called something else to mind. Hope often starts with remembering who God is.

Today, write down three times God was faithful to you in the past.', 'Great is Your faithfulness, Lord. Your mercies are new this morning. Remind me of every time You have carried me, so I can trust You with today. Amen.' WHERE EXISTS (SELECT 1 FROM topic_plans WHERE id = 'starter-hope');
INSERT OR IGNORE INTO topic_plan_days (plan_id, day, title, scripture, body, prayer)
  SELECT 'starter-hope', 3, 'Hope with an anchor', 'Heb 6:18-19, Rom 15:13', 'Hebrews calls our hope “an anchor of the soul, both sure and stedfast” (Heb 6:19). An anchor doesn’t stop the waves. It stops the boat from drifting away.

Our hope is not wishful thinking. It is anchored in God’s promises and in Jesus, who has gone before us. Paul prays that “the God of hope” would fill us “with all joy and peace in believing” (Rom 15:13).

Today, choose one promise of God and hold on to it all day.', 'God of hope, fill me with joy and peace as I trust in You. Anchor my soul in Your promises. When the waves are high, keep me from drifting. Amen.' WHERE EXISTS (SELECT 1 FROM topic_plans WHERE id = 'starter-hope');
INSERT OR IGNORE INTO topic_plan_days (plan_id, day, title, scripture, body, prayer)
  SELECT 'starter-hope', 4, 'God is working, even now', 'Rom 8:28, Gen 50:20', 'Joseph was betrayed, sold and forgotten in prison. Years later he could say to his brothers, “Ye thought evil against me; but God meant it unto good” (Gen 50:20).

We may not see it yet, but “all things work together for good to them that love God” (Rom 8:28). Not that everything is good, but that God is at work in everything.

Today, if you can, thank God for one thing He may be doing in your waiting.', 'Father, I don’t see the whole story, but You do. Work all things together for good in my life. Help me trust You in the waiting. Amen.' WHERE EXISTS (SELECT 1 FROM topic_plans WHERE id = 'starter-hope');
INSERT OR IGNORE INTO topic_plan_days (plan_id, day, title, scripture, body, prayer)
  SELECT 'starter-hope', 5, 'A future and a hope', 'Jer 29:11-13, Rev 21:4', 'To exiles far from home, God said: “I know the thoughts that I think toward you… thoughts of peace, and not of evil, to give you an expected end” (Jer 29:11). And He added, “Ye shall seek me, and find me, when ye shall search for me with all your heart.”

Our final hope is certain: a day when God “shall wipe away all tears from their eyes” (Rev 21:4).

As this plan ends, write a short prayer of hope for the next season, and keep it where you will see it.', 'Lord, thank You that Your thoughts towards me are peace and not evil. I seek You with all my heart. Give me hope for tomorrow and for eternity. Amen.' WHERE EXISTS (SELECT 1 FROM topic_plans WHERE id = 'starter-hope');
INSERT OR IGNORE INTO topic_plans (id, author_id, title, topic, summary, author_name, author_bio, cover_key, days, status, submitted_at, approved_at)
  SELECT 'starter-fear', id, 'Fear Not', 'Fear', 'Five days on facing fear with faith. God says “fear not” again and again, and He always gives a reason: because He is with you.', 'TheRenewGym', 'Written by the TheRenewGym team.', NULL, 5, 'approved', datetime('now'), datetime('now')
  FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1;
INSERT OR IGNORE INTO topic_plan_days (plan_id, day, title, scripture, body, prayer)
  SELECT 'starter-fear', 1, 'Fear not, for I am with you', 'Isa 41:10', '“Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee” (Isa 41:10).

God never says “fear not” and leaves us there. He gives a reason: I am with you, I am your God, I will strengthen you, I will help you, I will uphold you.

Today, name the fear you are facing. Then read Isaiah 41:10 out loud, putting your name in it.', 'Lord, I am afraid of [name it]. But You say, “Fear not, for I am with thee.” Strengthen me, help me, and hold me up with Your hand. Amen.' WHERE EXISTS (SELECT 1 FROM topic_plans WHERE id = 'starter-fear');
INSERT OR IGNORE INTO topic_plan_days (plan_id, day, title, scripture, body, prayer)
  SELECT 'starter-fear', 2, 'A spirit of power', '2 Tim 1:7, Rom 8:15', 'Paul reminded young Timothy: “God hath not given us the spirit of fear; but of power, and of love, and of a sound mind” (2 Tim 1:7).

Fear is not your identity. As God’s child, you have received “the Spirit of adoption, whereby we cry, Abba, Father” (Rom 8:15). Children who know they are loved can face hard things.

Today, do one small thing you have been avoiding because of fear.', 'Father, thank You that I am Your child. Fear is not from You. Fill me with Your Spirit of power, love and a sound mind as I take a brave step today. Amen.' WHERE EXISTS (SELECT 1 FROM topic_plans WHERE id = 'starter-fear');
INSERT OR IGNORE INTO topic_plan_days (plan_id, day, title, scripture, body, prayer)
  SELECT 'starter-fear', 3, 'The Lord is my light', 'Ps 27:1-5', '“The LORD is my light and my salvation; whom shall I fear?” (Ps 27:1). David wrote this while enemies surrounded him. His courage came from where he looked.

He had one desire: to dwell in the house of the Lord and behold His beauty. When God fills our view, our fears shrink to their true size.

Today, spend five minutes simply worshipping God for who He is.', 'Lord, You are my light and my salvation. Whom shall I fear? Be the One I look at today, and let my fears shrink in Your presence. Amen.' WHERE EXISTS (SELECT 1 FROM topic_plans WHERE id = 'starter-fear');
INSERT OR IGNORE INTO topic_plan_days (plan_id, day, title, scripture, body, prayer)
  SELECT 'starter-fear', 4, 'Perfect love casts out fear', '1 John 4:16-18', '“There is no fear in love; but perfect love casteth out fear” (1 Jn 4:18). Many fears grow from the worry that we are not loved, not enough, or will be rejected.

God’s love for you is perfect. It doesn’t depend on your performance. The more we know and believe the love God has for us, the less room fear has.

Today, write: “God loves me.” Under it, list three ways He has shown it.', 'Father, I believe the love You have for me. Let Your perfect love drive out every fear in my heart. Help me rest in being Your beloved child. Amen.' WHERE EXISTS (SELECT 1 FROM topic_plans WHERE id = 'starter-fear');
INSERT OR IGNORE INTO topic_plan_days (plan_id, day, title, scripture, body, prayer)
  SELECT 'starter-fear', 5, 'Courage for the road ahead', 'Josh 1:9, Ps 23:4', 'Joshua faced a huge task after Moses died. God said: “Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest” (Josh 1:9).

Courage is not the absence of fear. It is moving forward because God goes with you, even through the valley of the shadow of death (Ps 23:4).

As this plan ends, write down the next brave step God is asking you to take.', 'Lord, You are with me wherever I go. Make me strong and of good courage. I will take the next step, trusting You to walk it with me. Amen.' WHERE EXISTS (SELECT 1 FROM topic_plans WHERE id = 'starter-fear');
INSERT OR IGNORE INTO topic_plans (id, author_id, title, topic, summary, author_name, author_bio, cover_key, days, status, submitted_at, approved_at)
  SELECT 'starter-marriage', id, 'Stronger Together', 'Marriage', 'Five days for couples, or for anyone praying for their marriage. Read together if you can, and grow in love, patience and prayer.', 'TheRenewGym', 'Written by the TheRenewGym team.', NULL, 5, 'approved', datetime('now'), datetime('now')
  FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1;
INSERT OR IGNORE INTO topic_plan_days (plan_id, day, title, scripture, body, prayer)
  SELECT 'starter-marriage', 1, 'Love is patient', '1 Cor 13:4-7', '“Charity suffereth long, and is kind; charity envieth not… seeketh not her own, is not easily provoked, thinketh no evil” (1 Cor 13:4-5). This is love in everyday life: in tired evenings, small irritations and misunderstandings.

Read the passage slowly and notice which line is hardest for you right now. That is your invitation to grow, by God’s grace, not by willpower alone.

Today, show your spouse one kind act they don’t expect.', 'Lord, You are love. Teach me to love my spouse with patience and kindness. Where I am easily provoked, soften my heart. Help us love each other the way You love us. Amen.' WHERE EXISTS (SELECT 1 FROM topic_plans WHERE id = 'starter-marriage');
INSERT OR IGNORE INTO topic_plan_days (plan_id, day, title, scripture, body, prayer)
  SELECT 'starter-marriage', 2, 'Two are better than one', 'Eccl 4:9-12', '“Two are better than one… For if they fall, the one will lift up his fellow” (Eccl 4:9-10). And “a threefold cord is not quickly broken” (Eccl 4:12).

A strong marriage has three strands: husband, wife and God at the centre. When you are both drawing close to God, you also draw closer to each other.

Today, pray together for five minutes, even if it feels awkward at first. If your spouse isn’t ready, pray for them by name.', 'Father, be the third strand in our marriage. When one of us falls, help the other lift them up. Hold us together, and keep You at the centre of our home. Amen.' WHERE EXISTS (SELECT 1 FROM topic_plans WHERE id = 'starter-marriage');
INSERT OR IGNORE INTO topic_plan_days (plan_id, day, title, scripture, body, prayer)
  SELECT 'starter-marriage', 3, 'Speak life', 'Eph 4:29-32, Prov 15:1', '“A soft answer turneth away wrath: but grievous words stir up anger” (Prov 15:1). Words can build a home or tear it down.

Paul says to let no corrupt communication come from our mouths, but what builds up and gives grace to the hearer, and to be kind, tenderhearted and forgiving (Eph 4:29, 32).

Today, tell your spouse three specific things you appreciate about them.', 'Lord, set a guard over my mouth. Help me speak words that build my spouse up. Where I have hurt them with my words, help me ask for forgiveness. Amen.' WHERE EXISTS (SELECT 1 FROM topic_plans WHERE id = 'starter-marriage');
INSERT OR IGNORE INTO topic_plan_days (plan_id, day, title, scripture, body, prayer)
  SELECT 'starter-marriage', 4, 'Forgive as Christ forgave', 'Col 3:12-14', 'Every marriage joins two imperfect people. Paul says to put on mercy, kindness, humbleness, meekness and longsuffering, “forbearing one another, and forgiving one another” (Col 3:13), “even as Christ forgave you”.

Forgiveness doesn’t pretend nothing happened. It chooses not to keep holding the debt. And above everything, “put on charity, which is the bond of perfectness” (Col 3:14).

Today, if there is something unresolved, gently talk about it, and offer or ask for forgiveness.', 'Lord Jesus, You forgave me completely. Help me forgive my spouse in the same way. Clothe our home with mercy, kindness and love. Amen.' WHERE EXISTS (SELECT 1 FROM topic_plans WHERE id = 'starter-marriage');
INSERT OR IGNORE INTO topic_plan_days (plan_id, day, title, scripture, body, prayer)
  SELECT 'starter-marriage', 5, 'Building on the rock', 'Matt 7:24-27, Josh 24:15', 'Every home faces storms. Jesus said the house built on the rock stood, because it was founded on hearing and doing His words (Matt 7:24-25).

Joshua declared, “As for me and my house, we will serve the LORD” (Josh 24:15). That is a decision you can make together.

As this plan ends, choose one simple habit for your home: praying before sleep, reading a verse at breakfast, or a weekly time together.', 'Father, as for me and my house, we will serve You. Build our marriage on the rock of Your Word. Protect our home in every storm. Amen.' WHERE EXISTS (SELECT 1 FROM topic_plans WHERE id = 'starter-marriage');
INSERT OR IGNORE INTO topic_plans (id, author_id, title, topic, summary, author_name, author_bio, cover_key, days, status, submitted_at, approved_at)
  SELECT 'starter-forgiveness', id, 'Set Free by Forgiving', 'Forgiveness', 'Five days on receiving God’s forgiveness and learning to forgive others. Forgiveness doesn’t excuse the wrong. It sets your own heart free.', 'TheRenewGym', 'Written by the TheRenewGym team.', NULL, 5, 'approved', datetime('now'), datetime('now')
  FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1;
INSERT OR IGNORE INTO topic_plan_days (plan_id, day, title, scripture, body, prayer)
  SELECT 'starter-forgiveness', 1, 'Forgiven first', 'Ps 103:8-12, 1 John 1:9', 'Forgiving others starts with knowing how much we have been forgiven. “As far as the east is from the west, so far hath he removed our transgressions from us” (Ps 103:12).

“If we confess our sins, he is faithful and just to forgive us our sins” (1 Jn 1:9). Not reluctantly, but faithfully.

Today, bring God anything you are carrying guilt for, and receive His forgiveness.', 'Father, thank You that You are merciful and gracious. I confess [name it]. Thank You for forgiving me and removing my sin as far as the east is from the west. Amen.' WHERE EXISTS (SELECT 1 FROM topic_plans WHERE id = 'starter-forgiveness');
INSERT OR IGNORE INTO topic_plan_days (plan_id, day, title, scripture, body, prayer)
  SELECT 'starter-forgiveness', 2, 'Seventy times seven', 'Matt 18:21-35', 'Peter asked how many times he should forgive, perhaps seven? Jesus answered, “Until seventy times seven” (Matt 18:22), and told a story about a servant forgiven a huge debt who wouldn’t forgive a small one.

Forgiveness isn’t a feeling we wait for. It is a choice we make, sometimes many times for the same hurt.

Today, ask God to show you whom you need to forgive.', 'Lord, You forgave me a debt I could never pay. Show me who I need to forgive. Give me the grace to choose forgiveness, even when it is hard. Amen.' WHERE EXISTS (SELECT 1 FROM topic_plans WHERE id = 'starter-forgiveness');
INSERT OR IGNORE INTO topic_plan_days (plan_id, day, title, scripture, body, prayer)
  SELECT 'starter-forgiveness', 3, 'What forgiveness is and isn’t', 'Rom 12:17-21, Eph 4:31-32', 'Forgiveness doesn’t mean what happened was okay, and it doesn’t always mean trusting again straight away. It means handing the right to repay over to God: “Vengeance is mine; I will repay, saith the Lord” (Rom 12:19).

It does mean putting away bitterness, wrath and anger, and being kind and tenderhearted (Eph 4:31-32). Where there has been abuse or danger, forgiveness and safety can go together; seek wise help.

Today, write the person’s name and “I release you to God.”', 'Lord, I hand this hurt to You. I give up my right to get even. Heal my heart, and help me let go of bitterness. Protect me and give me wisdom. Amen.' WHERE EXISTS (SELECT 1 FROM topic_plans WHERE id = 'starter-forgiveness');
INSERT OR IGNORE INTO topic_plan_days (plan_id, day, title, scripture, body, prayer)
  SELECT 'starter-forgiveness', 4, 'Bless and pray', 'Luke 6:27-28, Luke 23:34', 'Jesus asked us to do something hard: “Bless them that curse you, and pray for them which despitefully use you” (Lk 6:28). He did it Himself on the cross: “Father, forgive them; for they know not what they do” (Lk 23:34).

Praying for someone who hurt you slowly changes your own heart towards them.

Today, pray a simple blessing for the person you are forgiving.', 'Father, I pray for [name]. Bless them, and draw them to You. As Jesus forgave from the cross, help me forgive from my heart. Amen.' WHERE EXISTS (SELECT 1 FROM topic_plans WHERE id = 'starter-forgiveness');
INSERT OR IGNORE INTO topic_plan_days (plan_id, day, title, scripture, body, prayer)
  SELECT 'starter-forgiveness', 5, 'Free indeed', 'John 8:36, Gal 5:1', '“If the Son therefore shall make you free, ye shall be free indeed” (Jn 8:36). Unforgiveness keeps us tied to the past. Forgiveness opens the door to freedom.

You may need to forgive again when the memory returns. That’s normal. Each time, hand it to God again.

As this plan ends, thank God for the freedom He is working in you, and consider whether there is a conversation God is asking you to have.', 'Lord Jesus, thank You for setting me free. Whenever the hurt returns, help me forgive again. Let my heart stay free and open to Your love. Amen.' WHERE EXISTS (SELECT 1 FROM topic_plans WHERE id = 'starter-forgiveness');
INSERT OR IGNORE INTO topic_plans (id, author_id, title, topic, summary, author_name, author_bio, cover_key, days, status, submitted_at, approved_at)
  SELECT 'starter-purpose', id, 'Made on Purpose', 'Purpose', 'Five days on why you are here. You are not an accident. God made you, knows you, and has good works prepared for you.', 'TheRenewGym', 'Written by the TheRenewGym team.', NULL, 5, 'approved', datetime('now'), datetime('now')
  FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1;
INSERT OR IGNORE INTO topic_plan_days (plan_id, day, title, scripture, body, prayer)
  SELECT 'starter-purpose', 1, 'Fearfully and wonderfully made', 'Ps 139:13-16', '“I will praise thee; for I am fearfully and wonderfully made” (Ps 139:14). Before anyone else knew you, God did. He formed you and wrote your days in His book.

Your worth doesn’t come from your job, your achievements or what others think. It comes from the One who made you on purpose.

Today, thank God for three things about how He made you.', 'Father, I praise You, for I am fearfully and wonderfully made. Thank You for forming me and knowing me. Help me see myself the way You see me. Amen.' WHERE EXISTS (SELECT 1 FROM topic_plans WHERE id = 'starter-purpose');
INSERT OR IGNORE INTO topic_plan_days (plan_id, day, title, scripture, body, prayer)
  SELECT 'starter-purpose', 2, 'His workmanship', 'Eph 2:8-10', '“For we are his workmanship, created in Christ Jesus unto good works, which God hath before ordained that we should walk in them” (Eph 2:10).

We are saved by grace, not by our works (Eph 2:8-9). But saved people are given good works to walk in, ones God prepared ahead of time.

Today, ask God: “What good work have You placed in front of me today?” and do it.', 'Lord, thank You that I am Your workmanship. Show me the good works You have prepared for me, and give me the joy of walking in them. Amen.' WHERE EXISTS (SELECT 1 FROM topic_plans WHERE id = 'starter-purpose');
INSERT OR IGNORE INTO topic_plan_days (plan_id, day, title, scripture, body, prayer)
  SELECT 'starter-purpose', 3, 'Love God, love people', 'Matt 22:36-40', 'When asked about the greatest commandment, Jesus answered: love God with all your heart, soul and mind, and love your neighbour as yourself. “On these two commandments hang all the law and the prophets” (Matt 22:40).

Whatever your calling, it will grow out of these two. Purpose is not only one big assignment; it is daily love.

Today, show love to one person in a practical way.', 'Father, I want to love You with all my heart, soul and mind. Open my eyes to the people around me, and help me love them well today. Amen.' WHERE EXISTS (SELECT 1 FROM topic_plans WHERE id = 'starter-purpose');
INSERT OR IGNORE INTO topic_plan_days (plan_id, day, title, scripture, body, prayer)
  SELECT 'starter-purpose', 4, 'Your gifts matter', '1 Pet 4:10-11, Rom 12:4-8', '“As every man hath received the gift, even so minister the same one to another” (1 Pet 4:10). God has given you gifts, not to keep but to serve others with.

The body of Christ has many members with different gifts: serving, teaching, encouraging, giving, leading, showing mercy (Rom 12:6-8). None of them is unimportant.

Today, write down what you enjoy and what others say you are good at. Ask God how to use it.', 'Lord, thank You for the gifts You have given me. Show me how to use them to serve others and bring You glory. Amen.' WHERE EXISTS (SELECT 1 FROM topic_plans WHERE id = 'starter-purpose');
INSERT OR IGNORE INTO topic_plan_days (plan_id, day, title, scripture, body, prayer)
  SELECT 'starter-purpose', 5, 'Faithful in small things', 'Luke 16:10, Col 3:23-24', '“He that is faithful in that which is least is faithful also in much” (Lk 16:10). Purpose is often discovered on the way, by being faithful where you are.

“Whatsoever ye do, do it heartily, as to the Lord, and not unto men” (Col 3:23). Your work, your studies, your family: all of it can be worship.

As this plan ends, write a short sentence about what you believe God has made you for, and ask Him to lead your next step.', 'Father, help me be faithful in the small things. Whatever I do, let me do it for You. Lead me step by step into all You have made me for. Amen.' WHERE EXISTS (SELECT 1 FROM topic_plans WHERE id = 'starter-purpose');
