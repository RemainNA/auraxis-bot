CREATE TABLE IF NOT EXISTS alerts(
	channel TEXT,
	world TEXT
);

CREATE TABLE IF NOT EXISTS outfitactivity(
	id BIGINT,
	color TEXT,
	alias TEXT,
	channel TEXT,
	platform TEXT
);

-- platform is pc, ps4us, or ps4eu

CREATE TABLE IF NOT EXISTS outfitcaptures(
	id BIGINT,
	name TEXT,
	alias TEXT,
	channel TEXT,
	platform TEXT
);

CREATE TABLE IF NOT EXISTS news(
	id SERIAL PRIMARY KEY,
	channel TEXT,
	source TEXT
);

CREATE TABLE IF NOT EXISTS latestTweets(
	userid TEXT,
	username TEXT,
	tweetid TEXT
);

CREATE TABLE IF NOT EXISTS alertmaintenance(
	alertid TEXT NOT NULL,
	messageid TEXT PRIMARY KEY NOT NULL,
	channelid TEXT NOT NULL,
	goneprime BOOLEAN DEFAULT FALSE,
	error BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS subscriptionConfig(
	channel TEXT PRIMARY KEY NOT NULL,
	koltyr BOOLEAN DEFAULT TRUE,
	indar BOOLEAN DEFAULT TRUE,
	hossin BOOLEAN DEFAULT TRUE,
	amerish BOOLEAN DEFAULT TRUE,
	esamir BOOLEAN DEFAULT TRUE,
	oshur BOOLEAN DEFAULT TRUE,
	other BOOLEAN DEFAULT TRUE,
	autoDelete BOOLEAN DEFAULT FALSE,
	territory BOOLEAN DEFAULT TRUE,
	nonTerritory BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS toDelete(
	channel TEXT NOT NULL,
	messageid TEXT PRIMARY KEY NOT NULL,
	timeToDelete TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS dashboard(
	concatKey TEXT NOT NULL UNIQUE,
	channel TEXT NOT NULL,
	messageid TEXT PRIMARY KEY NOT NULL,
	world TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outfitDashboard(
	concatKey TEXT NOT NULL UNIQUE,
	channel TEXT NOT NULL,
	messageid TEXT PRIMARY KEY NOT NULL,
	outfitid BIGINT NOT NULL,
	platform TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tracker(
	channel TEXT NOT NULL,
	trackerType TEXT NOT NULL,
	world TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outfitTracker(
	channel TEXT NOT NULL,
	outfitid TEXT NOT NULL,
	platform TEXT NOT NULL,
	showfaction BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS bases(
	concatKey TEXT PRIMARY KEY NOT NULL,
	continent INT NOT NULL,
	world TEXT NOT NULL,
	facility INT NOT NULL,
	outfit TEXT, --null if not owned
	faction INT
);

CREATE TABLE IF NOT EXISTS unlocks(
	channel TEXT,
	world TEXT
);

CREATE TABLE IF NOT EXISTS openContinents(
	world TEXT NOT NULL,
	indar BOOLEAN DEFAULT FALSE,
	hossin BOOLEAN DEFAULT FALSE,
	amerish BOOLEAN DEFAULT FALSE,
	esamir BOOLEAN DEFAULT FALSE,
	oshur BOOLEAN DEFAULT FALSE,
	koltyr BOOLEAN DEFAULT FALSE,
	indarchange TIMESTAMPTZ,
	hossinchange TIMESTAMPTZ,
	amerishchange TIMESTAMPTZ,
	esamirchange TIMESTAMPTZ,
	oshurchange TIMESTAMPTZ,
	koltyrchange TIMESTAMPTZ
);

INSERT INTO opencontinents (world) VALUES ('osprey');
INSERT INTO opencontinents (world) VALUES ('wainwright');
INSERT INTO opencontinents (world) VALUES ('jaeger');
INSERT INTO opencontinents (world) VALUES ('soltech');
INSERT INTO opencontinents (world) VALUES ('genudine');
INSERT INTO opencontinents (world) VALUES ('ceres');

-- Manually insert the latest tweetid from tracked users for latestTweets() in twitterListener.js
-- INSERT INTO latestTweets (userID, username) VALUES ('829358606', 'WrelPlays');
-- INSERT INTO latestTweets (userID, username) VALUES ('247430686', 'planetside2');