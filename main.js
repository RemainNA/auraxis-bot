// Import the discord.js module
const Discord = require('discord.js');

// Import request for API access
var request = require('request');

// import async
var async = require('async');

// auth file
try{
	var auth = require('./auth.json');
	process.env.serviceID = auth.serviceID;
	process.env.token = auth.token;
}
catch(e){
	console.log('no auth file found');
}

// commands
var character = require('./character.js');
var outfit = require('./outfit.js');
var online = require('./online.js');
var wsListen = require('./websocketListener.js');
var population = require('./serverPopulation.js');
var prePrestige = require('./prePrestige.js');

//PostgreSQL connection
const { Client } = require('pg');

const SQLclient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});

SQLclient.connect();

SQLclient.query("SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'", (err, res) => {
  if (err) throw err;
  for (let row of res.rows) {
    //console.log(JSON.stringify(row));
  }
  SQLclient.end();
});

// Create an instance of a Discord client
const client = new Discord.Client();

// The token of your bot - https://discordapp.com/developers/applications/me
const token = process.env.token;

// The ready event is vital, it means that your bot will only start reacting to information
// from Discord _after_ ready is emitted
client.on('ready', () => {
  console.log('I am ready!');
  wsListen.subscribe(client);
  client.user.setActivity('!help')
});

var archive = []; //list of bot messages and commands
var listOfCommands = [
"!help",
"!character [name]",
"!outfit [tag]",
"!online [tag]",
"!(un)subscribe alerts [server]",
"!(un)subscribe activity [outfit]",
"!population [server]",
"!asp [name]",
"!clean"
]
// Create an event listener for messages
client.on('message', message => {
	//console.log(client.user);
	// If the message is "!ping"
	if (message.content.toLowerCase() == '!ping') {
		// Send "pong" to the same channel
		archive.push(message);
		message.channel.send('pong!');
	}
	if (message.content.toLowerCase() == '!help'){
		//show list of all commands (stored in listOfCommands)
		archive.push(message);
		message.channel.send(listOfCommands);
	}
	if (message.content.substring(0,10).toLowerCase() == '!character') {
		// Look up character
		archive.push(message);
		var cName = message.content.substring(11).toLowerCase();
		//calls character.js
		character.characterLookup(cName, message.channel);
	}
	if (message.content.substring(0,7).toLowerCase() == '!outfit'){
		//look up outfit
		archive.push(message);
		var oName = message.content.substring(8).toLowerCase();
		if (oName.length > 4)
		{
			message.channel.send('Outfit tag too long');
		}
		else{
			//calls outfit.js
			outfit.outfitLookup(oName, message.channel);
		}
	}
	if (message.content.substring(0,7).toLowerCase() == '!online'){
		//return online outfit members
		archive.push(message);
		var oName = message.content.substring(8).toLowerCase();
		//calls online.js
		online.outfitLookup(oName, message.channel);
	}
	if (message.content.substring(0,11).toLowerCase() == '!population'){
		//server population
		archive.push(message);
		var servers = message.content.substring(12);
		//calls serverPopulation.js
		population.check(servers, message.channel);
	}
	if (message.content.substring(0,4).toLowerCase() == '!asp'){
		//BR before beginning ASP
		archive.push(message);
		var characterName = message.content.substring(5);
		//calls prePrestige.js
		prePrestige.lookup(characterName, message);
		
	}
	if (message.content.toLowerCase() == '!clean') {
		//delete bot messages
		//stores clean message to be removed at end of cleanup
		archive.push(message);
		newArchive = [];
		while (archive.length > 0){
			msg = archive.shift();
			//if message is in the same channel as !clean and is not pinned
			if (msg.channel == message.channel && msg.pinned == false) {
				msg.delete()
					.then(console.log('Deleted message'))
					.catch(console.error); //logs issues with deleting messages (such as permission mismatches)
			}
			else{
				//re-archives message in same order if not in the same channel
				newArchive.push(msg);
			}
		}
		archive = newArchive;
		//delete newArchive;
	}
	if (message.author.id == client.user.id) {
		//adds bot messages to array, utilized in clean
		archive.push(message);		
		console.log('added');
		while(archive.length > 1000){
			//avoid array becoming too long
			archive.shift();
		}
	}
	if (message.content.substring(0,10).toLowerCase() == '!subscribe' || message.content.substring(0,12).toLowerCase() == '!unsubscribe'){
		//command is handled in a separate file, this is just for !clean
		archive.push(message);
	}
});

// Log bot in
client.login(token);