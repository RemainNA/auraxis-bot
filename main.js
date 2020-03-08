// Import the discord.js module
const Discord = require('discord.js');

// Import request for API access
var request = require('request');

// import async
var async = require('async');

//PostgreSQL connection
const { Client } = require('pg');

// auth file
var runningOnline = false; //The assumption is an auth file will be present iff running offline
try{
	var auth = require('./auth.json');
	process.env.serviceID = auth.serviceID;
	process.env.token = auth.token;
}
catch(e){
	console.log('no auth file found');
	runningOnline = true;
}

// commands
var char = require('./character.js');
var outfit = require('./outfit.js');
var ps4usOutfit = require('./PS4US/outfit.js');
var ps4euOutfit = require('./PS4EU/outfit.js');
var online = require('./online.js');
var ps4usOnline = require('./PS4US/online.js');
var ps4euOnline = require('./PS4EU/online.js');
// var wsListen = require('./websocketListener.js');
// var ps4usListen = require('./PS4US/websocketListener.js');
// var ps4euListen = require('./PS4EU/websocketListener.js');
var listener = require('./unifiedWSListener.js');
var population = require('./serverPopulation.js');
var prePrestige = require('./prePrestige.js');
var initialize = require('./initializeSQL.js');

//Online components
if(runningOnline){
	SQLclient = new Client({
	connectionString: process.env.DATABASE_URL,
	ssl: true,
	});

	SQLclient.connect();

	SQLclient.query("SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'", (err, res) => {
	if (err) throw err;
	for (let row of res.rows) {
		//console.log(JSON.stringify(row));
	}
	});

	initialize.start(SQLclient);
}


// Create an instance of a Discord client
const client = new Discord.Client();

// The token of your bot - https://discordapp.com/developers/applications/me
const token = process.env.token;

// The ready event is vital, it means that your bot will only start reacting to information
// from Discord _after_ ready is emitted
client.on('ready', () => {
	console.log('I am ready!');
	if(runningOnline){
		const SQLclient = new Client({
			connectionString: process.env.DATABASE_URL,
			ssl: true,
		});

		SQLclient.connect();

		initialize.start(SQLclient);
		listener.start(SQLclient, client);
		// wsListen.subscribe(client, SQLclient);
		// ps4usListen.subscribe(client, SQLclient);
		// ps4euListen.subscribe(client, SQLclient);
	}

	client.user.setActivity('!help')
});

var listOfCommands = [
"!help",
"PC",
"------",
"!character [name]",
"!outfit [tag]",
"!online [tag]",
"!(un)subscribe alerts [server]",
"!(un)subscribe activity [outfit]",
"!population [server]",
"!asp [name]",
" ",
"PS4 US",
"------",
"!ps4us character [name]",
"!ps4us outfit [tag]",
"!ps4us online [tag]",
"!(un)subscribe alerts [server]",
"!ps4us (un)subscribe activity [outfit]",
"!population [server]",
" ",
"PS4 EU",
"------",
"!ps4eu character [name]",
"!ps4eu outfit [tag]",
"!ps4eu online [tag]",
"!(un)subscribe alerts [server]",
"!ps4eu (un)subscribe activity [outfit]",
"!population [server]"
]
// Create an event listener for messages
client.on('message', message => {
	//console.log(client.user);
	// If the message is "!ping"
	if (message.content.toLowerCase() == '!ping') {
		// Send "pong" to the same channel
		message.channel.send('pong!').then(function(result){
			
		}, function(err) {
			console.log("Insufficient permissions on !ping");
			console.log(message.guild.name);
		});
	}
	if (message.content.toLowerCase() == '!help'){
		//show list of all commands (stored in listOfCommands)
		message.channel.send(listOfCommands).then(function(result){
			
		}, function(err) {
			console.log("Insufficient permissions on !help");
			console.log(message.guild.name);
		});
	}
	if (message.content.substring(0,11).toLowerCase() == '!character '){
		chars = message.content.substring(11).toLowerCase().split(" ");
		for(x in chars){
			if(chars[x] != ""){
				char.character(chars[x], 'ps2:v2')
					.then(res => message.channel.send(res))
					.catch(err => {
						if(typeof(err) == "string"){
							message.channel.send(err);
						}
					})
			}
		}
	}
	if (message.content.substring(0,17).toLowerCase() == '!ps4us character '){
		chars = message.content.substring(17).toLowerCase().split(" ");
		for(x in chars){
			if(chars[x] != ""){
				char.character(chars[x], 'ps2ps4us:v2')
					.then(res => message.channel.send(res))
					.catch(err => {
						if(typeof(err) == "string"){
							message.channel.send(err);
						}
					})
			}
		}
	}
	if (message.content.substring(0,17).toLowerCase() == '!ps4eu character '){
		chars = message.content.substring(17).toLowerCase().split(" ");
		for(x in chars){
			if(chars[x] != ""){
				char.character(chars[x], 'ps2ps4eu:v2')
					.then(res => message.channel.send(res))
					.catch(err => {
						if(typeof(err) == "string"){
							message.channel.send(err);
						}
					})
			}
		}
	}
	if (message.content.substring(0,7).toLowerCase() == '!outfit'){
		//look up outfit
		var oName = message.content.substring(8).toLowerCase();
		if (oName.length > 4)
		{
			message.channel.send('Outfit tag too long').then(function(result){
			
			}, function(err) {
				console.log("Insufficient permissions on !outfit tag length");
				console.log(message.guild.name);
			});
		}
		else{
			//calls outfit.js
			outfit.outfitLookup(oName, message.channel);
		}
	}
	if (message.content.substring(0,13).toLowerCase() == '!ps4us outfit'){
		//look up outfit
		var oName = message.content.substring(14).toLowerCase();
		if (oName.length > 4)
		{
			message.channel.send('Outfit tag too long').then(function(result){
			
			}, function(err) {
				console.log("Insufficient permissions on !outfit tag length");
				console.log(message.guild.name);
			});
		}
		else{
			//calls outfit.js
			ps4usOutfit.outfitLookup(oName, message.channel);
		}
	}
	if (message.content.substring(0,13).toLowerCase() == '!ps4eu outfit'){
		//look up outfit
		var oName = message.content.substring(14).toLowerCase();
		if (oName.length > 4)
		{
			message.channel.send('Outfit tag too long').then(function(result){
			
			}, function(err) {
				console.log("Insufficient permissions on !outfit tag length");
				console.log(message.guild.name);
			});
		}
		else{
			//calls outfit.js
			ps4euOutfit.outfitLookup(oName, message.channel);
		}
	}
	if (message.content.substring(0,7).toLowerCase() == '!online'){
		//return online outfit members
		var oName = message.content.substring(8).toLowerCase();
		//calls online.js
		online.outfitLookup(oName, message.channel);
	}
	if (message.content.substring(0,13).toLowerCase() == '!ps4us online'){
		//return online outfit members
		var oName = message.content.substring(14).toLowerCase();
		//calls online.js
		ps4usOnline.outfitLookup(oName, message.channel);
	}
	if (message.content.substring(0,13).toLowerCase() == '!ps4eu online'){
		//return online outfit members
		var oName = message.content.substring(14).toLowerCase();
		//calls online.js
		ps4euOnline.outfitLookup(oName, message.channel);
	}
	if (message.content.substring(0,11).toLowerCase() == '!population'){
		//server population
		var servers = message.content.substring(12);
		//calls serverPopulation.js
		population.check(servers, message.channel);
	}
	if (message.content.substring(0,4).toLowerCase() == '!asp'){
		//BR before beginning ASP
		var characterName = message.content.substring(5).toLowerCase();
		//calls prePrestige.js
		prePrestige.lookup(characterName, message);
		
	}
	if (message.content.substring(0,1) == '!' && message.content.toLowerCase().indexOf('subscribe') != -1 && !runningOnline){
		message.channel.send('Subscription functionality currently unavailable').then(function(result){
			
		}, function(err) {
			console.log("Insufficient permissions on !subscribe unavailable");
			console.log(message.guild.name);
		});
	}
});

// Log bot in
client.login(token);