// This file defines functions which establish a connection to the Twitter API and listen for tweets from certain accounts.

const needle = require('needle');
var messageHandler = require('./messageHandler.js');
var subscriptions = require('./subscriptions.js');

const token = process.env.TWITTER_BEARER_TOKEN;  

const rulesURL = 'https://api.twitter.com/2/tweets/search/stream/rules'
const streamURL = 'https://api.twitter.com/2/tweets/search/stream?expansions=referenced_tweets.id';

var timeout = 0;
var firstRun = true;

// Edit rules as desired here below
const rules = [
	{ 'value': 'from:822515900', 'tag': 'Remain_NA' },
	{ 'value': 'from:829358606', 'tag': 'WrelPlays' },
	{ 'value': 'from:247430686', 'tag': 'planetside2' },
	{ 'value': 'from:353166375', 'tag': 'AndySites' },
  ];

async function getAllRules() {

    const response = await needle('get', rulesURL, { headers: {
        "authorization": `Bearer ${token}`
    }})

    if (response.statusCode !== 200) {
        return new Promise(function(resolve, reject){
            reject(response.body);
        })
    }

    return (response.body);
}

async function deleteAllRules(rules) {

    if (!Array.isArray(rules.data)) {
        return null;
      }

    const ids = rules.data.map(rule => rule.id);

    const data = {
        "delete": {
            "ids": ids
        }
    }

    const response = await needle('post', rulesURL, data, {headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${token}`
    }}) 

    if (response.statusCode !== 200) {
        throw new Error(response.body);
        return null;
    }
    
    return (response.body);

}

async function setRules() {

    const data = {
        "add": rules
      }

    const response = await needle('post', rulesURL, data, {headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${token}`
    }}) 

    if (response.statusCode !== 201) {
        throw new Error(response.body);
        return null;
    }
    
    return (response.body);

}

function streamConnect(token, SQLclient, discordClient) {
    const stream = needle.get(streamURL, {
        headers: { 
            Authorization: `Bearer ${token}`
        },
        timeout: 20000
	});
	

    stream.on('data', data => {
    try {
		const jsonObj = JSON.parse(data);
		let type = "tweet";
		if(typeof(jsonObj.data.referenced_tweets)!== 'undefined'){
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
		postMessage(SQLclient, discordClient, jsonObj.matching_rules[0].tag, jsonObj.data.id, type)
			.catch(err => console.log(err));

		
    } catch (e) {
        // Keep alive signal received. Do nothing.
    }
    }).on('error', error => {
        if (error.code === 'ETIMEDOUT') {
            stream.emit('timeout');
		}
		else{
			console.log(error);
		}
	}).on('done', () => {
		console.log('Twitter done');
		stream.emit('streamDone');
	});
	
	console.log("Connected to Twitter Stream");

    return stream;
    
}

async function postMessage(SQLclient, discordClient, tag, id, type){
	let queryText = "SELECT * FROM news WHERE source = $1";
	let queryValues = [tag+"-twitter"];
	let url = "https://twitter.com/"+tag+"/status/"+id;
	let baseText = "**New Tweet from "+tag+"**\n";
	switch(type){
		case "reply":
			return;
		case "qrt":
			baseText = "**New Quote Tweet from "+tag+"**\n";
			break;
		case "rt":
			baseText = "**New Retweet from "+tag+"**\n";
			break;
	}
	try{
		let result = await SQLclient.query(queryText, queryValues);
		for(let row of result.rows){
			discordClient.channels.fetch(row.channel).then(resChann => {
				if(typeof(resChann.guild) !== 'undefined'){
					if(resChann.permissionsFor(resChann.guild.me).has(['SEND_MESSAGES','VIEW_CHANNEL'])){
						messageHandler.send(resChann, baseText+url, "Twitter message");
					}
					else{
						subscriptions.unsubscribeAll(pgClient, row.channel);
						console.log('Unsubscribed from '+row.channel);
					} 
				}
				else{ // DM
					messageHandler.send(resChann, url, "Twitter message");
				}
			})
		}
	}
	catch(error){
        return new Promise(function(resolve, reject){
            reject(error);
        })
    }
}

module.exports = {
	start: async function (SQLclient, discordClient) {
		if(firstRun){
			// Only set rules the first run, ignore reconnects
			let currentRules;
  
			try {
				// Gets the complete list of rules currently applied to the stream
				currentRules = await getAllRules();
				
				// Delete all rules. Comment the line below if you want to keep your existing rules.
				await deleteAllRules(currentRules);
			
				// Add rules to the stream. Comment the line below if you don't want to add new rules.
				await setRules();
			
			} 
			catch (e) {
				console.log("Twitter init issue");
				console.log(e);
			}

			firstRun = false;
		}
		
		// Listen to the stream.
		// This reconnection logic will attempt to reconnect when a disconnection is detected.
		// To avoid rate limits, this logic implements exponential backoff, so the wait time
		// will increase if the client cannot reconnect to the stream.
	
		const filteredStream = streamConnect(token, SQLclient, discordClient)
		filteredStream.on('timeout', () => {
			// Reconnect on error
			console.log('A twitter connection error occurred. Reconnecting…');
			setTimeout(() => {
				timeout++;
				this.start(SQLclient, discordClient);
			}, 1000 * (2 ** timeout));
		}).on('streamDone', () => {
			setTimeout(() => {
				timeout++;
				this.start(SQLclient, discordClient);
			},1000 * (2 ** timeout));
		})
	}
}