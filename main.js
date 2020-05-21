// This file implements the main event listener of the bot, which picks up messages, parses them for commands, and calls the appropriate functions.

// Import the discord.js module
const Discord = require('discord.js');

//PostgreSQL connection
const { Client } = require('pg');

// auth file
var runningOnline = false; //The assumption is an auth file will be present iff running offline
try{
	var auth = require('./auth.json');
	process.env.serviceID = auth.serviceID;
	process.env.token = auth.token;
	if(typeof(auth.DATABASE_URL) !== 'undefined'){
		process.env.DATABASE_URL = auth.DATABASE_URL;
		runningOnline = true;
	}
}
catch(e){
	console.log('No auth file found');
	runningOnline = true;
}

// commands
var char = require('./character.js');
var online = require('./onlineAsync.js');
var listener = require('./unifiedWSListener.js');
var subscription = require('./subscriptions.js');
var population = require('./serverPopulation.js');
var prePrestige = require('./prePrestige.js');
var initialize = require('./initializeSQL.js');
var territory = require('./territory.js');
var messageHandler = require('./messageHandler.js');
var outfit = require('./outfit.js');

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

const client = new Discord.Client();

// https://discordapp.com/developers/applications/me
const token = process.env.token;

client.on('ready', () => {
	console.log('Running on '+client.guilds.size+' servers!');
	if(runningOnline){
		const SQLclient = new Client({
			connectionString: process.env.DATABASE_URL,
			ssl: true,
		});

		SQLclient.connect();

		initialize.start(SQLclient);
		listener.start(SQLclient, client);
	}

	client.user.setActivity('!help')
});

var listOfCommands = [
"!help",
" ",
"!<ps4us/ps4eu> character [name]",
"!<ps4us/ps4eu> outfit [tag]",
"!<ps4us/ps4eu> online [tag]",
"!subscribe alerts [server]",
"!unsubscribe alerts [server]",
"!<ps4us/ps4eu> subscribe activity [tag]",
"!<ps4us/ps4eu> unsubscribe activity [tag]",
"!unsubscribe all",
"!population [server]",
"!territory [server]",
"!asp [name]"
]

var links = [
	"[GitHub page](https://github.com/ultimastormGH/auraxis-bot)",
	"[Support server](https://discord.gg/Kf5P6Ut)",
	"[Invite bot](https://discordapp.com/oauth2/authorize?client_id=437756856774033408&scope=bot&permissions=19456)",
	"[Support on Ko-fi](https://ko-fi.com/remainna)"
]

// Create an event listener for messages
client.on('message', message => {
	if (message.content.toLowerCase() == '!ping') {
		// ping function to check if bot is up
		messageHandler.send(message.channel, "Bot's ping to Discord is "+client.ping+'ms', 'ping');
	}
	if (message.content.toLowerCase() == '!help' || message.content.toLowerCase() == '!about'){
		//show list of commands and relevant links
		let helpEmbed = new Discord.RichEmbed();
		helpEmbed.setTitle("Auraxis bot");
		helpEmbed.setColor("BLUE");
		helpEmbed.addField("Commands", listOfCommands);
		helpEmbed.addField("Links", links);
		helpEmbed.setFooter("<> = Optional, [] = Required");
		messageHandler.send(message.channel, helpEmbed, 'help');
	}
	if (message.content.substring(0,11).toLowerCase() == '!character '){
		let chars = message.content.substring(11).toLowerCase().split(" ");
		for(x in chars){
			if(chars[x] != ""){
				char.character(chars[x], 'ps2:v2')
					.then(res => messageHandler.send(message.channel, res, "PC Character"))
					.catch(err => messageHandler.handleError(message.channel, err, "PC Character"))
			}
		}
	}
	if (message.content.substring(0,17).toLowerCase() == '!ps4us character '){
		let chars = message.content.substring(17).toLowerCase().split(" ");
		for(x in chars){
			if(chars[x] != ""){
				char.character(chars[x], 'ps2ps4us:v2')
					.then(res => messageHandler.send(message.channel, res, "PS4US Character"))
					.catch(err => messageHandler.handleError(message.channel, err, "PS4US Character"))
			}
		}
	}
	if (message.content.substring(0,17).toLowerCase() == '!ps4eu character '){
		let chars = message.content.substring(17).toLowerCase().split(" ");
		for(x in chars){
			if(chars[x] != ""){
				char.character(chars[x], 'ps2ps4eu:v2')
					.then(res => messageHandler.send(message.channel, res, "PS4EU Character"))
					.catch(err => messageHandler.handleError(message.channel, err, "PS4EU Character"))
			}
		}
	}
	if (message.content.substring(0,8).toLowerCase() == '!outfit '){
		let tags = message.content.substring(8).toLowerCase().split(" ");
		for(x in tags){
			if(tags[x] != ""){
				if(tags[x].length > 4){
					messageHandler.send(message.channel, tags[x]+" is longer than 4 letters, please enter a tag.", "PC tag too long");
					continue;
				}
				outfit.outfit(tags[x], 'ps2:v2')
					.then(res => messageHandler.send(message.channel, res, "PC Outfit"))
					.catch(err => messageHandler.handleError(message.channel, err, "PC Outfit"))
			}
		}
	}
	if (message.content.substring(0,14).toLowerCase() == '!ps4us outfit '){
		let tags = message.content.substring(14).toLowerCase().split(" ");
		for(x in tags){
			if(tags[x] != ""){
				if(tags[x].length > 4){
					messageHandler.send(message.channel, tags[x]+" is longer than 4 letters, please enter a tag.", "PC tag too long");
					continue;
				}
				outfit.outfit(tags[x], 'ps2ps4us:v2')
					.then(res => messageHandler.send(message.channel, res, "PC Outfit"))
					.catch(err => messageHandler.handleError(message.channel, err, "PC Outfit"))
			}
		}
	}
	if (message.content.substring(0,14).toLowerCase() == '!ps4eu outfit '){
		let tags = message.content.substring(14).toLowerCase().split(" ");
		for(x in tags){
			if(tags[x] != ""){
				if(tags[x].length > 4){
					messageHandler.send(message.channel, tags[x]+" is longer than 4 letters, please enter a tag.", "PC tag too long");
					continue;
				}
				outfit.outfit(tags[x], 'ps2ps4eu:v2')
					.then(res => messageHandler.send(message.channel, res, "PC Outfit"))
					.catch(err => messageHandler.handleError(message.channel, err, "PC Outfit"))
			}
		}
	}
	if (message.content.substring(0,8).toLowerCase() == '!online '){
		let tags = message.content.substring(8).toLowerCase().split(" ");
		for(x in tags){
			if(tags[x] != ""){
				if(tags[x].length > 4){
					messageHandler.send(message.channel, tags[x]+" is longer than 4 letters, please enter a tag.", "PC tag too long");
					continue;
				}
				online.online(tags[x], 'ps2:v2')
					.then(res => messageHandler.send(message.channel, res, "PC Outfit"))
					.catch(err => messageHandler.handleError(message.channel, err, "PC Outfit"))
			}
		}
	}
	if (message.content.substring(0,14).toLowerCase() == '!ps4us online '){
		let tags = message.content.substring(14).toLowerCase().split(" ");
		for(x in tags){
			if(tags[x] != ""){
				if(tags[x].length > 4){
					messageHandler.send(message.channel, tags[x]+" is longer than 4 letters, please enter a tag.", "PC tag too long");
					continue;
				}
				online.online(tags[x], 'ps2ps4us:v2')
					.then(res => messageHandler.send(message.channel, res, "PC Outfit"))
					.catch(err => messageHandler.handleError(message.channel, err, "PC Outfit"))
			}
		}
	}
	if (message.content.substring(0,14).toLowerCase() == '!ps4eu online '){
		let tags = message.content.substring(14).toLowerCase().split(" ");
		for(x in tags){
			if(tags[x] != ""){
				if(tags[x].length > 4){
					messageHandler.send(message.channel, tags[x]+" is longer than 4 letters, please enter a tag.", "PC tag too long");
					continue;
				}
				online.online(tags[x], 'ps2ps4eu:v2')
					.then(res => messageHandler.send(message.channel, res, "PC Outfit"))
					.catch(err => messageHandler.handleError(message.channel, err, "PC Outfit"))
			}
		}
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
	if (message.content.substring(0,11).toLowerCase() == '!territory '){
		let servers = message.content.substring(11).toLowerCase().split(" ");
		for(x in servers){
			if(servers[x] != ""){
				territory.territory(servers[x])
					.then(res => messageHandler.send(message.channel, res, "Territory"))
					.catch(err => messageHandler.handleError(message.channel, err, "Territory"))
			}
		}
	}
	if (message.content.substring(0,20).toLowerCase() == '!subscribe activity ' && runningOnline){
		let outfits = message.content.substring(20).toLowerCase().split(" ");
		for(x in outfits){
			if(outfits[x] != ""){
				subscription.subscribeActivity(SQLclient, message.channel.id, outfits[x], 'ps2:v2')
					.then(res => messageHandler.send(message.channel, res, "Subscribe activity"))
					.catch(err => messageHandler.handleError(message.channel, err, "Subscribe activity"))
			}
		}
	}
	if (message.content.substring(0,22).toLowerCase() == '!unsubscribe activity ' && runningOnline){
		let outfits = message.content.substring(22).toLowerCase().split(" ");
		for(x in outfits){
			if(outfits[x] != ""){
				subscription.unsubscribeActivity(SQLclient, message.channel.id, outfits[x], 'ps2:v2')
					.then(res => messageHandler.send(message.channel, res, "Unsubscribe activity"))
					.catch(err => messageHandler.handleError(message.channel, err, "Unsubscribe activity"))
			}
		}
	}
	if (message.content.substring(0,26).toLowerCase() == '!ps4us subscribe activity ' && runningOnline){
		let outfits = message.content.substring(26).toLowerCase().split(" ");
		for(x in outfits){
			if(outfits[x] != ""){
				subscription.subscribeActivity(SQLclient, message.channel.id, outfits[x], 'ps2ps4us:v2')
					.then(res => messageHandler.send(message.channel, res, "PS4US Subscribe activity"))
					.catch(err => messageHandler.handleError(message.channel, err, "PS4US Subscribe activity"))
			}
		}
	}
	if (message.content.substring(0,28).toLowerCase() == '!ps4us unsubscribe activity ' && runningOnline){
		let outfits = message.content.substring(28).toLowerCase().split(" ");
		for(x in outfits){
			if(outfits[x] != ""){
				subscription.unsubscribeActivity(SQLclient, message.channel.id, outfits[x], 'ps2ps4us:v2')
					.then(res => messageHandler.send(message.channel, res, "PS4US Unsubscribe activity"))
					.catch(err => messageHandler.handleError(message.channel, err, "PS4US Unsubscribe activity"))
			}
		}
	}
	if (message.content.substring(0,26).toLowerCase() == '!ps4eu subscribe activity ' && runningOnline){
		let outfits = message.content.substring(26).toLowerCase().split(" ");
		for(x in outfits){
			if(outfits[x] != ""){
				subscription.subscribeActivity(SQLclient, message.channel.id, outfits[x], 'ps2ps4eu:v2')
				.then(res => messageHandler.send(message.channel, res, "PS4EU Subscribe activity"))
				.catch(err => messageHandler.handleError(message.channel, err, "PS4EU Subscribe Activity"))
			}
		}
	}
	if (message.content.substring(0,28).toLowerCase() == '!ps4eu unsubscribe activity ' && runningOnline){
		let outfits = message.content.substring(28).toLowerCase().split(" ");
		for(x in outfits){
			if(outfits[x] != ""){
				subscription.unsubscribeActivity(SQLclient, message.channel.id, outfits[x], 'ps2ps4eu:v2')
					.then(res => messageHandler.send(message.channel, res, "PS4EU Unsubscribe activity"))
					.catch(err => messageHandler.handleError(message.channel, err, "PS4EU Unsubscribe activity"))
			}
		}
	}
	if (message.content.substring(0,18).toLowerCase() == '!subscribe alerts ' && runningOnline){
		let servers = message.content.substring(18).toLowerCase().split(" ");
		for(x in servers){
			if(servers[x] != ""){
				subscription.subscribeAlert(SQLclient, message.channel.id, servers[x])
					.then(res => messageHandler.send(message.channel, res, "Subscribe alerts"))
					.catch(err => messageHandler.handleError(message.channel, err, "Subscribe alerts"))
			}
		}
	}
	if (message.content.substring(0,20).toLowerCase() == '!unsubscribe alerts ' && runningOnline){
		let servers = message.content.substring(20).toLowerCase().split(" ");
		for(x in servers){
			if(servers[x] != ""){
				subscription.unsubscribeAlert(SQLclient, message.channel.id, servers[x])
					.then(res => messageHandler.send(message.channel, res, "Unsubscribe alerts"))
					.catch(err => messageHandler.handleError(message.channel, err, "Unsubscribe alerts"))
			}
		}
	}
	if (message.content.toLowerCase() == "!unsubscribe all" && runningOnline){
		subscription.unsubscribeAll(SQLclient, message.channel.id)
			.then(res => messageHandler.send(message.channel, res, "Unsubscribe all"))
			.catch(err => messageHandler.handleError(message.channel, err, "Unsubscribe all"))

	}
	if (message.content.substring(0,1) == '!' && message.content.toLowerCase().indexOf('subscribe') != -1 && !runningOnline){
		messageHandler.send(message.channel, 'Subscription functionality currently unavailable', "Subscriptions unabailable");
	}
});

// Log bot in
client.login(token);