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

CREATE TABLE IF NOT EXISTS alertmaintenance(
	alertid TEXT NOT NULL,
	messageid TEXT PRIMARY KEY NOT NULL,
	channelid TEXT NOT NULL,
	goneprime BOOLEAN DEFAULT FALSE,
	error BOOLEAN DEFAULT FALSE
);