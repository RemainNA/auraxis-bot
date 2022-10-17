/**
 * This file defines functions which establish a connection to the Twitter API and listen for tweets from certain accounts.
 * Most of the code for this file came from
 * https://github.com/twitterdev/Twitter-API-v2-sample-code/blob/main/Filtered-Stream/filtered_stream.js
 * @module twitterListener
 * @typedef {import('discord.js').ChannelManager} discord.channels
 */
import { ChannelType, PermissionsBitField } from 'discord.js';
import { fetch } from 'undici';
import { send } from './messageHandler.js';
import { unsubscribeAll } from './subscriptions.js';
import query from './db/index.js';

const token = process.env.TWITTER_BEARER_TOKEN;

const rulesURL = 'https://api.twitter.com/2/tweets/search/stream/rules';


/**
 * Get the rules currently set in the Twitter stream API.
 * @returns {Promise<any>} An array of objects containing the rules that are currently set
 */
async function getAllRules() {
	const response = await fetch(rulesURL, { 
		method: 'GET',
		headers: {
			authorization: `Bearer ${token}`
		}
	});
	if (!response.ok) {
		throw await response.text();
	}
	return await response.text();
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
		delete: {
			ids: ids
		}
	};
	
	const response = await fetch(rulesURL, {
		method: 'POST',
		headers: {
			'content-type': "application/json",
			authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(data)
	});
	
	if (!response.ok) {
		throw new Error(await response.json());
	}
	response.body.cancel();
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
	
	const response = await fetch( rulesURL, {
		method: 'POST',
		headers: {
			"content-type": "application/json",
			"authorization": `Bearer ${token}`
		},
		body: JSON.stringify(data)
	});
	
	if (!response.ok) {
		throw new Error(await response.json());
	}
	response.body.cancel();
}


/**
 * Send new twitter messages to subscribed discord channels, on each new sent tweet  it is stord as the latest tweet for the user
 * @param {discord.channels} channels - channel manager used to fetch discord channel object based on their ids stored in the DB
 * @param jsonObj - the JSON object from the Twitter API
 */
async function postMessage(channels, jsonObj){
	if(jsonObj.data == undefined){
		return;
	}
	query('UPDATE latestTweets SET tweetid = $1 WHERE userid = $2', [jsonObj.data.id, jsonObj.data.author_id]);
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
	const result = await query('SELECT * FROM news WHERE source = $1', [`${tag}-twitter`]);
	result.rows.forEach(async (row) => {
		try {
			const resChann = await channels.fetch(row.channel);
			if (resChann.type === ChannelType.DM){
				send(resChann, url, "Twitter message");
			}
			else if(resChann.permissionsFor(resChann.guild.members.me).has([PermissionsBitField.Flags.SendMessages,PermissionsBitField.Flags.EmbedLinks])){
				send(resChann, `${baseText}${url}`, "Twitter message");
			}
			else{
				unsubscribeAll(row.channel);
				console.log(`Unsubscribed from ${row.channel}`);
			}
		} 
		catch (error) {
			if(error?.code == 10003){ //Unknown channel error, thrown when the channel is deleted
				unsubscribeAll(row.channel);
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

/**
 * Initialize the Twitter API rules to use for the stream
 */
export async function init() {
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
}

/**
 * Connect to the Twitter API stream and send new tweets to subscribed discord channels
 * @param {discord.channels} channels - channel manager used to fetch discord channel object based on their ids stored in the DB
 * @param {number} timeout - the growth factor for the reconnection logic when the stream times out
 */
export async function connect(channels, timeout=0) {
	const streamURL = 'https://api.twitter.com/2/tweets/search/stream?&user.fields=username&tweet.fields=in_reply_to_user_id&expansions=referenced_tweets.id,author_id';
	const response = await fetch(streamURL, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});
	const stream = response.body
	if (!response.ok) {
		// https://undici.nodejs.org/#/?id=garbage-collection
		await stream.cancel();
		// https://developer.twitter.com/en/support/twitter-api/error-troubleshooting
		console.log(`Twitter HTTP error: ${response.status}`);
		console.log('Reconnecting in 15 minutes');
		setTimeout(() => {
			connect(channels);
		}, 910000);
		return;
	}
	console.log("Connected to Twitter Stream.");
	try {
		/**
		 * Listen to the stream.
		 * request.body doesn't impelemnt async iterator in the fetch spec but Undici does,
		 * in future updates they might change that.
		 * https://undici.nodejs.org/#/?id=requestbody
		 */
		for await (const chunk of stream) {
			const data = Buffer.from(chunk).toString('utf8');
			try {
				const jsonObj = JSON.parse(data);
				postMessage(channels, jsonObj);
			} 
			catch (e) {/** heart beat do nothing */}
		}	
	} catch (error) {
		/**
		 * UND_ERR_BODY_TIMEOUT is a Undici error code when it takes
		 * too long for the body to recieve data, usually casued by 
		 * Twitter failing to send the heart beat.
		 * Twitter will send a rate limit error on reconnect even though we are no where near the limit.
		 * Trying to cancel the response body will result in the same UND_ERR_BODY_TIMEOUT error occuring.
		 */
		console.log(`Twitter Stream issue: ${error.cause.code}`);
		console.log('Twitter Stream ended. Reconnecting...');
		setTimeout(() => {
			connect(channels, timeout*2);
		}, timeout);
	}
}
/**
 * Update the latest tweets in the database and post missed tweets to subscribed discord channels
 * @param {discord.channels} channels - channel manager used to fetch discord channel object based on their ids stored in the DB
 */
export async function latestTweet(channels) {
	const res = await query('SELECT userid, tweetid FROM latestTweets');
	for (const user of res.rows) {
		const response = await fetch(`https://api.twitter.com/2/users/${user.userid}/tweets?&since_id=${user.tweetid}&user.fields=username&tweet.fields=in_reply_to_user_id&expansions=referenced_tweets.id,author_id`, 
		{
			headers: {
				"authorization": `Bearer ${token}`
			}
		});
		const json = await response.json()
		const tweets = json.data?.reverse();
		tweets?.forEach(tweet => {
			postMessage(channels, {includes: json.includes, data: tweet});
		});
	}
	setTimeout(() => latestTweet(channels), 600000);
}