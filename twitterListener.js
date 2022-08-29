/**
 * This file defines functions which establish a connection to the Twitter API and listen for tweets from certain accounts.
 * Most of the code for this file came from
 * https://github.com/twitterdev/Twitter-API-v2-sample-code/blob/main/Filtered-Stream/filtered_stream.js
 * @module twitterListener
 */
/**
 * @typedef {import('pg').Client} pg.Client
 * @typedef {import('discord.js').ChannelManager} discord.channels
 * @typedef {import('got').GotReturn} Request
 */

const {default: got} = require('got');
const messageHandler = require('./messageHandler.js');
const subscriptions = require('./subscriptions.js');

const token = process.env.TWITTER_BEARER_TOKEN;

const rulesURL = 'https://api.twitter.com/2/tweets/search/stream/rules';


/**
 * Get the rules currently set in the Twitter stream API.
 * @returns {Promise<any>} An array of objects containing the rules that are currently set
 */
async function getAllRules() {
	const response = await got(rulesURL, { headers: {
		"authorization": `Bearer ${token}`
    }});
	
    if (response.statusCode !== 200) {
		throw response.body;
    }
	
    return response.body;
}

/**
 * Delete currently set rules in Twitter stream API.
 * @param {{data: any[], id: string}} rules - An array of objects containing the rules that are currently set
 */
async function deleteAllRules(rules) {
	
	if (!Array.isArray(rules.data)) {
		return;
    }
	
    const ids = rules.data.map(rule => rule.id);
	
    const data = {
		"delete": {
			"ids": ids
        }
    };
	
    const response = await got(rulesURL, {json: data, headers: {
		"content-type": "application/json",
        "authorization": `Bearer ${token}`
    }});
	
    if (response.statusCode !== 200) {
		throw new Error(response.body);
    }
}

/**
 * Set the rules for the Twitter stream API.
 */
async function setRules() {
	// Edit rules as desired here below
	const rules = [
		{ 'value': 'from:822515900', 'tag': 'Remain_NA' },
		{ 'value': 'from:829358606', 'tag': 'WrelPlays' },
		{ 'value': 'from:247430686', 'tag': 'planetside2' },
	];
	
	const data = {
		"add": rules
	};
	
	const response = await got.post( rulesURL, {json: data, headers: {
		"content-type": "application/json",
        "authorization": `Bearer ${token}`
    }});
	
    if (response.statusCode !== 201) {
		throw new Error(response.body);
    }
}


/**
 * Send new twitter messages to subscribed discord channels, on each new sent tweet  it is stord as the latest tweet for the user
 * @param {pg.Client} SQLclient - Used to query the DB to find the discord channels to send messages to
 * @param {discord.channels} channels - channel manager used to fetch discord channel object based on their ids stored in the DB
 * @param jsonObj - the JSON object from the Twitter API
 */
async function postMessage(SQLclient, channels, jsonObj){
	if(jsonObj.data == undefined){
		return;
	}
	SQLclient.query('UPDATE latestTweets SET tweetid = $1 WHERE userid = $2', [jsonObj.data.id, jsonObj.data.author_id]);
	const tag = jsonObj.includes.users[0].username;
	let baseText = `**New Tweet from ${tag}**\n`;
	const type = jsonObj.data.referenced_tweets?.[0].type;
	if (type === 'quoted') {
		baseText = `**New Quote Tweet from ${tag}**\n`;
	}
	else if (type === 'retweeted') {
		baseText = `**New Retweet from ${tag}**\n`;
	}
	else if (jsonObj.data.author_id === jsonObj.data.in_reply_to_user_id) {
		baseText = `**New Self-Reply from ${tag}**\n`;
	}
	else if (type === 'replied_to'){
		return;
	}
	
	const url = `https://twitter.com/${tag}/status/${jsonObj.data.id}`;
	const result = await SQLclient.query('SELECT * FROM news WHERE source = $1', [`${tag}-twitter`]);
	result.rows.forEach(async (row) => {
		try {
			const resChann = await channels.fetch(row.channel);
			if (resChann.type === 'DM'){
				messageHandler.send(resChann, url, "Twitter message");
			}
			else if(resChann.permissionsFor(resChann.guild.me).has(['SEND_MESSAGES','VIEW_CHANNEL'])){
				messageHandler.send(resChann, `${baseText}${url}`, "Twitter message");
			}
			else{
				subscriptions.unsubscribeAll(SQLclient, row.channel);
				console.log(`Unsubscribed from ${row.channel}`);
			}
		} 
		catch (error) {
			if(error?.code == 10003){ //Unknown channel error, thrown when the channel is deleted
				subscriptions.unsubscribeAll(SQLclient, row.channel);
				console.log(`Unsubscribed from ${row.channel}`);
			}
			else if(error?.code == 50013 || error?.code == 50001){ //Missing access/permissions error
				//Ignore in case permissions are fixed
			}
			else{
				console.log(error);
			}
		}
	});
}

module.exports = {
	/**
	 * Initialize the Twitter API rules to use for the stream
	 */
	init: async function () {
		try {
			// Gets the complete list of rules currently applied to the stream
			const currentRules = await getAllRules();
			
			// Delete all rules. Comment the line below if you want to keep your existing rules.
			await deleteAllRules(currentRules);
			
			// Add rules to the stream. Comment the line below if you don't want to add new rules.
			await setRules();
			
		} 
		catch (e) {
			console.log("Twitter init issue");
			console.log(e);
		}
	},
	/**
	 * Connect to the Twitter API stream and send new tweets to subscribed discord channels
	 * @param {pg.Client} SQLclient - Used to query the DB to find the discord channels to send messages to
	 * @param {discord.channels} channels - channel manager used to fetch discord channel object based on their ids stored in the DB
	 * @param {number} timeout - the growth factor for the reconnection logic when the stream times out
	 */
	 connect: async function (SQLclient, channels, timeout=0) {
		const streamURL = 'https://api.twitter.com/2/tweets/search/stream?&user.fields=username&tweet.fields=in_reply_to_user_id&expansions=referenced_tweets.id,author_id';
		const stream = got.stream(streamURL, {
			headers: {
				Authorization: `Bearer ${token}`
			},
			timeout: {
				response: 20000
			}
		});
		// Listen to the stream.
		stream.on('data', data => {
			try {
				const jsonObj = JSON.parse(data);
				postMessage(SQLclient, channels, jsonObj);
			} catch (e) {
				if (data.detail === 'This stream is currently at the maximum allowed connection limit.') {
					console.log(data.detail);
				}
			}
		}).on('error', error => {
			if (error.code !== 'ETIMEDOUT') {
				console.log(error.code);
			}
			else {
				// This reconnection logic will attempt to reconnect when a disconnection is detected.
				// To avoid rate limits, this logic implements exponential backoff, so the wait time
				// will increase if the client cannot reconnect to the stream.
				console.log('A twitter connection error occurred. Reconnecting…');
				setTimeout(() => {
					timeout++;
					this.connect(SQLclient, channels, timeout);
				}, 1000 * (2 ** timeout));
			}
		}).on('end', () => {
			console.log('Twitter Stream End');
			setTimeout(() => {
				timeout++;
				this.connect(SQLclient, channels, timeout);
			},1000 * (2 ** timeout));
		});
		
		console.log("Connected to Twitter Stream");
	},
	/**
	 * Update the latest tweets in the database and post missed tweets to subscribed discord channels
	 * @param {pg.Client} SQLclient - Used to query the DB to update the latest tweetID and post missed tweets to subscribed discord channels
	 * @param {discord.channels} channels - channel manager used to fetch discord channel object based on their ids stored in the DB
	 */
	latestTweet: async function(SQLclient, channels) {
		const res = await SQLclient.query('SELECT userid, tweetid FROM latestTweets');
		for (const user of res.rows) {
			const response = await got(`https://api.twitter.com/2/users/${user.userid}/tweets?&since_id=${user.tweetid}&user.fields=username&tweet.fields=in_reply_to_user_id&expansions=referenced_tweets.id,author_id`, 
			{
				headers: {
					"authorization": `Bearer ${token}`
				}
			});
			const json = JSON.parse(response.body);
			const tweets = json.data?.reverse();
			tweets?.forEach(tweet => {
				postMessage(SQLclient, channels, {includes: json.includes, data: tweet});
			});
		}
		setTimeout(() => this.latestTweet(SQLclient, channels), 600000);
	}
}