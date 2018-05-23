// Import the discord.js module
const Discord = require('discord.js');

// Import request for API access
var request = require('request');

// import async
var async = require('async');

// auth file
var auth = require('./auth.json');

// commands
var character = require('./character.js');
var outfit = require('./outfit.js');
var online = require('./online.js');
var alerts = require('./subscribeAlert.js');
var population = require('./serverPopulation.js');

// Create an instance of a Discord client
const client = new Discord.Client();

// The token of your bot - https://discordapp.com/developers/applications/me
const token = auth.token;

// The ready event is vital, it means that your bot will only start reacting to information
// from Discord _after_ ready is emitted
client.on('ready', () => {
  console.log('I am ready!');
  alerts.subscribe(client);
});

var archive = []; //list of bot messages and commands
var listOfCommands = [
"!help",
"!character [name]",
"!outfit [tag]",
"!online [tag]",
"!(un)subscribe alerts [server]",
"!population [server]",
"!clean"
]
// Create an event listener for messages
client.on('message', message => {
	//console.log(client.user);
	// If the message is "!ping"
	if (message.content == '!ping') {
		// Send "pong" to the same channel
		archive.push(message);
		message.channel.send('pong!');
	}
	if (message.content == '!help'){
		message.channel.send(listOfCommands);
	}
	if (message.content.substring(0,10) == '!character') {
		// Look up character
		archive.push(message);
		var cName = message.content.substring(11).toLowerCase();
		character.characterLookup(cName, message.channel);
	}
	if (message.content.substring(0,7) == '!outfit'){
		//look up outfit
		archive.push(message);
		var oName = message.content.substring(8).toLowerCase();
		if (oName.length > 4)
		{
			message.channel.send('Outfit tag too long');
		}
		else{
			outfit.outfitLookup(oName, message.channel);
		}
	}
	if (message.content.substring(0,7) == '!online'){
		//return online outfit members
		archive.push(message);
		var oName = message.content.substring(8).toLowerCase();
		if (oName.length > 4)
		{
			message.channel.send('Outfit tag too long');
		}
		else{
			online.outfitLookup(oName, message.channel);
		}
	}
	if (message.content.substring(0,11) == '!population'){
		//server population
		archive.push(message);
		var servers = message.content.substring(12);
		population.check(servers, message.channel);
	}
	if (message.content == '!clean') {
		//delete bot messages
		archive.push(message);
		newArchive = [];
		while (archive.length > 0){
			msg = archive.shift();
			if (msg.channel == message.channel && msg.pinned == false) {
				msg.delete();
			}
			else{
				newArchive.push(msg);
			}
		}
		archive = newArchive;
		delete newArchive;
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
	if (message.content.substring(0,17) == '!subscribe alerts' || message.content.substring(0,19) == '!unsubscribe alerts'){
		//command is handled in a separate file, this is just for !clean
		archive.push(message);
	}
});

// Log our bot in
client.login(token);