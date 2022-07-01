/**
 * This file defines functions which establish a connection to the Twitter API and listen for tweets from certain accounts.
 * Most of the code for this file came from
 * https://github.com/twitterdev/Twitter-API-v2-sample-code/blob/main/Filtered-Stream/filtered_stream.js
 * @module twitterListener
 */

const got = require('got');
const messageHandler = require('./messageHandler.js');
const subscriptions = require('./subscriptions.js');

const token = process.env.TWITTER_BEARER_TOKEN;  

const rulesURL = 'https://api.twitter.com/2/tweets/search/stream/rules'
const streamURL = 'https://api.twitter.com/2/tweets/search/stream?expansions=referenced_tweets.id';

let timeout = 0;

// Edit rules as desired here below
const rules = [
	{ 'value': 'from:822515900', 'tag': 'Remain_NA' },
	{ 'value': 'from:829358606', 'tag': 'WrelPlays' },
	{ 'value': 'from:247430686', 'tag': 'planetside2' },
  ];

/**
 * Get the rules currently set in the Twitter API.
 * @returns An array of objects containing the rules that are currently set
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
 * Delete currently set rules.
 * @param rules - An array of objects containing the rules that are currently set
 * @returns the response from the Twitter API
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
    }

    const response = await got(rulesURL, {json: data, headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${token}`
    }});

    if (response.statusCode !== 200) {
        throw new Error(response.body);
    }
    
    return (response.body);
}

/**
 * set the rules in the Twitter API.
 * @returns The response from the Twitter API
 */
async function setRules() {

    const data = {
        "add": rules
      }

	const response = await got.post( rulesURL, {json: data, headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${token}`
    }});

    if (response.statusCode !== 201) {
        throw new Error(response.body);
    }
    
    return (response.body);
}

/**
 * 
 * @param {string} token - The bearer token for the Twitter API
 * @param {pg.Client} SQLclient - the PostgreSQL client to use
 * @param {discord.client.channels} channels - the discord channels to send messages to
 * @returns {Stream} A stream of tweets from the Twitter API
 */
function streamConnect(token, SQLclient, channels) {
	const stream = got.stream(streamURL, {
		headers: {
			Authorization: `Bearer ${token}`
		},
		timeout: {
			response: 20000
		}
	});

    stream.on('data', data => {
		try {
			const jsonObj = JSON.parse(data);
			let type = "tweet";
			if(jsonObj.data.referenced_tweets !== undefined){
				switch(jsonObj.data.referenced_tweets[0].type){
					case "replied_to":
						type = "reply";
						break;
					case "quoted":
						type = "qrt";
						break;
					case "retweeted":
						type = "rt";
						break;
				}
			}
			postMessage(SQLclient, channels, jsonObj.matching_rules[0].tag, jsonObj.data.id, type)
				.catch(err => console.log(err));
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
			stream.emit('timeout');
		}
	}).on('end', () => {
		console.log('Twitter Stream End');
		stream.emit('streamEnd');
	});
	
	console.log("Connected to Twitter Stream");

    return stream;
}

/**
 * Send new twitter messages to subscribed discord channels
 * @param {pg.Client} SQLclient - the PostgreSQL client to use
 * @param {discord.client.channels} channels - the discord channels to send messages to
 * @param {string} tag - the tag of the tweet
 * @param {string} id - the id of the tweet
 * @param {string} type - the type of the tweet
 */
async function postMessage(SQLclient, channels, tag, id, type){
	const queryText = "SELECT * FROM news WHERE source = $1";
	const queryValues = [`${tag}-twitter`];
	const url = `https://twitter.com/${tag}/status/${id}`;
	let baseText = `**New Tweet from ${tag}**\n`;
	switch(type){
		case "reply":
			return;
		case "qrt":
			baseText = `**New Quote Tweet from ${tag}**\n`;
			break;
		case "rt":
			baseText = `**New Retweet from ${tag}**\n`;
			break;
	}

	const result = await SQLclient.query(queryText, queryValues);
	for(const row of result.rows){
		channels.fetch(row.channel).then(resChann => {
			if(resChann.guild !== undefined){
				if(resChann.permissionsFor(resChann.guild.me).has(['SEND_MESSAGES','VIEW_CHANNEL'])){
					messageHandler.send(resChann, `${baseText}${url}`, "Twitter message");
				}
				else{
					subscriptions.unsubscribeAll(SQLclient, row.channel);
					console.log(`Unsubscribed from ${row.channel}`);
				}
			}
			else{ // DM
				messageHandler.send(resChann, url, "Twitter message");
			}
		})
		.catch(error => {
			if(error.code !== undefined){
				if(error.code == 10003){ //Unknown channel error, thrown when the channel is deleted
					subscriptions.unsubscribeAll(SQLclient, row.channel);
					console.log(`Unsubscribed from ${row.channel}`);
				}
				else{
					console.log(error);
				}
			}
			else{
				console.log(error);
			}
		})
	}
}

module.exports = {
	/**
	 * initialize the Twitter API rules
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
	 * @param {pg.Client} SQLclient - the PostgreSQL client to use
	 * @param {discord.client.channels} channels - the discord channels to send messages to
	 */
	connect: async function (SQLclient, channels) {
		// Listen to the stream.
		// This reconnection logic will attempt to reconnect when a disconnection is detected.
		// To avoid rate limits, this logic implements exponential backoff, so the wait time
		// will increase if the client cannot reconnect to the stream.
	
		const filteredStream = streamConnect(token, SQLclient, channels)
		filteredStream.on('timeout', () => {
			// Reconnect on error
			console.log('A twitter connection error occurred. Reconnecting…');
			setTimeout(() => {
				timeout++;
				this.connect(SQLclient, channels);
			}, 1000 * (2 ** timeout));
		}).on('streamEnd', () => {
			setTimeout(() => {
				timeout++;
				this.connect(SQLclient, channels);
			},1000 * (2 ** timeout));
		})
	}
}