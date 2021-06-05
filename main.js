// This file implements the main event listener of the bot, which picks up messages, parses them for commands, and calls the appropriate functions.

// Import the discord.js module
const Discord = require('discord.js');

//PostgreSQL connection
const pg = require('pg');

// commands
const char = require('./character.js');
const stats = require('./stats.js');
const online = require('./online.js');
const listener = require('./unifiedWSListener.js');
const subscriptionConfig = require('./subscriptionConfig.js');
const subscription = require('./subscriptions.js');
const population = require('./population.js');
const asp = require('./preASP.js');
const territory = require('./territory.js');
const alerts = require('./alerts.js');
const messageHandler = require('./messageHandler.js');
const outfit = require('./outfit.js');
const status = require('./status.js');
const weapon = require('./weapon.js');
const weaponSearch = require('./weaponSearch.js');
const implant = require('./implant.js');
const twitterListener = require('./twitterListener.js');
const alertMaintenance = require('./alertMaintenance.js');
const deleteMessages = require('./deleteMessages.js');

require('dotenv').config();

let runningOnline = false;
let twitterAvail = false;

if(typeof(process.env.DATABASE_URL) !== 'undefined'){
	runningOnline = true;
}

if(typeof(process.env.TWITTER_CONSUMER_KEY) !== 'undefined'){
	twitterAvail = true;
}

const client = new Discord.Client();

// https://discordapp.com/developers/applications/me
const token = process.env.token;

client.on('ready', async () => {
	console.log('Running on '+client.guilds.cache.size+' servers!');
	if(runningOnline){
		SQLclient = new pg.Client({
			connectionString: process.env.DATABASE_URL,
			ssl: {rejectUnauthorized: false}
		});

		await SQLclient.connect();

		listener.start(SQLclient, client);
		if(twitterAvail){
			twitterListener.start(SQLclient, client);
		}
		alertMaintenance.update(SQLclient, client);
		deleteMessages.run(SQLclient, client);
		setInterval(function () { 
			alertMaintenance.update(SQLclient, client);
			deleteMessages.run(SQLclient, client);
		}, 60000); //Update alerts every minute
	}

	client.user.setActivity('!help')
});

const listOfCommands = [
"!help",
" ",
"!<ps4us/ps4eu> character [name]",
"!<ps4us/ps4eu> stats [name] <weapon name/id>",
"!<ps4us/ps4eu> outfit [tag]",
"!<ps4us/ps4eu> online [tag]",
"!subscribe alerts [server]",
"!unsubscribe alerts [server]",
"!<ps4us/ps4eu> subscribe activity [tag]",
"!<ps4us/ps4eu> unsubscribe activity [tag]",
"!<ps4us/ps4eu> subscribe captures [tag]",
"!<ps4us/ps4eu> unsubscribe captures [tag]",
"!subscribe twitter [wrel/planetside]",
"!unsubscribe twitter [wrel/planetside]",
"!unsubscribe all",
"!config",
"!config audit",
"!config alerts [continent] [enable/disable]",
"!config autodelete [enable/disable]",
"!population [server]",
"!territory [server]",
"!alerts [server]",
"!status",
"!weapon [weapon name/id]",
"!weaponSearch [name]",
"!implant [implant name]",
"!<ps4us/ps4eu> asp [name]"
]

const links = [
	"[GitHub page & FAQ](https://github.com/RemainNA/auraxis-bot)",
	"[Support server](https://discord.gg/Kf5P6Ut)",
	"[Invite bot](https://discord.com/oauth2/authorize?client_id=437756856774033408&scope=bot&permissions=281600)",
	"[Donate on Ko-fi](https://ko-fi.com/remainna)"
]

// Create an event listener for messages
client.on('message', message => {
	if(message.author == client.user || !message.content.startsWith("!")){
		return;
	}
	if (message.content.toLowerCase() == '!ping') {
		// ping function to check if bot is up
		messageHandler.send(message.channel, "Bot's ping to Discord is "+client.ws.ping+'ms', 'ping');
	}
	else if (message.content.toLowerCase() == '!help' || message.content.toLowerCase() == '!about'){
		//show list of commands and relevant links
		let helpEmbed = new Discord.MessageEmbed();
		helpEmbed.setTitle("Auraxis bot");
		helpEmbed.setColor("BLUE");
		helpEmbed.addField("Commands", listOfCommands);
		helpEmbed.addField("Links", links);
		helpEmbed.setFooter("<> = Optional, [] = Required");
		messageHandler.send(message.channel, helpEmbed, 'help', true);
	}
	else if (message.content.substring(0,11).toLowerCase() == '!character '){
		let chars = message.content.substring(11).toLowerCase().split(" ");
		for(const x in chars){
			if(chars[x] != ""){
				char.character(chars[x], 'ps2:v2')
					.then(res => messageHandler.send(message.channel, res, "PC Character", true))
					.catch(err => messageHandler.handleError(message.channel, err, "PC Character"))
			}
		}
	}
	else if (message.content.substring(0,17).toLowerCase() == '!ps4us character '){
		let chars = message.content.substring(17).toLowerCase().split(" ");
		for(const x in chars){
			if(chars[x] != ""){
				char.character(chars[x], 'ps2ps4us:v2')
					.then(res => messageHandler.send(message.channel, res, "PS4US Character", true))
					.catch(err => messageHandler.handleError(message.channel, err, "PS4US Character"))
			}
		}
	}
	else if (message.content.substring(0,17).toLowerCase() == '!ps4eu character '){
		let chars = message.content.substring(17).toLowerCase().split(" ");
		for(const x in chars){
			if(chars[x] != ""){
				char.character(chars[x], 'ps2ps4eu:v2')
					.then(res => messageHandler.send(message.channel, res, "PS4EU Character", true))
					.catch(err => messageHandler.handleError(message.channel, err, "PS4EU Character"))
			}
		}
	}
	else if (message.content.substring(0,7).toLowerCase() == '!stats '){
		let parts = message.content.toLowerCase().split(" ");
		let cName = parts[1];
		let wName = message.content.substring((7+cName.length+1)).trim();
		if(wName == ""){
			char.character(cName, 'ps2:v2')
				.then(res => messageHandler.send(message.channel, res, "PC Character by stats", true))
				.catch(err => messageHandler.handleError(message.channel, err, "PC Character by stats"))
		}
		else{
			stats.lookup(cName, wName, 'ps2:v2')
				.then(res => messageHandler.send(message.channel, res, "PC Stats", true))
				.catch(err => messageHandler.handleError(message.channel, err, "PC Stats"))	
		}
	}
	else if (message.content.substring(0,13).toLowerCase() == '!ps4us stats '){
		let parts = message.content.toLowerCase().split(" ");
		let cName = parts[2];
		let wName = message.content.substring((13+cName.length+1));
		if(wName == ""){
			char.character(cName, 'ps2ps4us:v2')
				.then(res => messageHandler.send(message.channel, res, "PS4US Character by stats", true))
				.catch(err => messageHandler.handleError(message.channel, err, "PS4US Character by stats"))
		}
		else{
			stats.lookup(cName, wName, 'ps2ps4us:v2')
				.then(res => messageHandler.send(message.channel, res, "PS4US Stats", true))
				.catch(err => messageHandler.handleError(message.channel, err, "PS4US Stats"))	
		}
	}
	else if (message.content.substring(0,13).toLowerCase() == '!ps4eu stats '){
		let parts = message.content.toLowerCase().split(" ");
		let cName = parts[2];
		let wName = message.content.substring((13+cName.length+1));
		if(wName == ""){
			char.character(cName, 'ps2ps4eu:v2')
				.then(res => messageHandler.send(message.channel, res, "PS4EU Character by stats", true))
				.catch(err => messageHandler.handleError(message.channel, err, "PS4EU Character by stats"))
		}
		else{
			stats.lookup(cName, wName, 'ps2ps4eu:v2')
				.then(res => messageHandler.send(message.channel, res, "PS4EU Stats", true))
				.catch(err => messageHandler.handleError(message.channel, err, "PS4EU Stats"))	
		}
		
	}
	else if (message.content.substring(0,8).toLowerCase() == '!outfit '){
		let tags = message.content.substring(8).toLowerCase().split(" ");
		for(const x in tags){
			if(tags[x] != ""){
				if(tags[x].length > 4 && !messageHandler.badQuery(tags[x])){
					messageHandler.send(message.channel, tags[x]+" is longer than 4 letters, please enter a tag.", "PC tag too long");
					continue;
				}
				outfit.outfit(tags[x], 'ps2:v2')
					.then(res => messageHandler.send(message.channel, res, "PC Outfit", true))
					.catch(err => messageHandler.handleError(message.channel, err, "PC Outfit"))
			}
		}
	}
	else if (message.content.substring(0,14).toLowerCase() == '!ps4us outfit '){
		let tags = message.content.substring(14).toLowerCase().split(" ");
		for(const x in tags){
			if(tags[x] != ""){
				if(tags[x].length > 4 && !messageHandler.badQuery(tags[x])){
					messageHandler.send(message.channel, tags[x]+" is longer than 4 letters, please enter a tag.", "PS4US tag too long");
					continue;
				}
				outfit.outfit(tags[x], 'ps2ps4us:v2')
					.then(res => messageHandler.send(message.channel, res, "PS4US Outfit", true))
					.catch(err => messageHandler.handleError(message.channel, err, "PS4US Outfit"))
			}
		}
	}
	else if (message.content.substring(0,14).toLowerCase() == '!ps4eu outfit '){
		let tags = message.content.substring(14).toLowerCase().split(" ");
		for(const x in tags){
			if(tags[x] != ""){
				if(tags[x].length > 4 && !messageHandler.badQuery(tags[x])){
					messageHandler.send(message.channel, tags[x]+" is longer than 4 letters, please enter a tag.", "PS4EU tag too long");
					continue;
				}
				outfit.outfit(tags[x], 'ps2ps4eu:v2')
					.then(res => messageHandler.send(message.channel, res, "PS4EU Outfit", true))
					.catch(err => messageHandler.handleError(message.channel, err, "PS4EU Outfit"))
			}
		}
	}
	else if (message.content.substring(0,8).toLowerCase() == '!online '){
		let tags = message.content.substring(8).toLowerCase().split(" ");
		for(const x in tags){
			if(tags[x] != ""){
				if(tags[x].length > 4 && !messageHandler.badQuery(tags[x])){
					messageHandler.send(message.channel, tags[x]+" is longer than 4 letters, please enter a tag.", "PC tag too long");
					continue;
				}
				online.online(tags[x], 'ps2:v2')
					.then(res => messageHandler.send(message.channel, res, "PC Online", true))
					.catch(err => messageHandler.handleError(message.channel, err, "PC Online"))
			}
		}
	}
	else if (message.content.substring(0,14).toLowerCase() == '!ps4us online '){
		let tags = message.content.substring(14).toLowerCase().split(" ");
		for(const x in tags){
			if(tags[x] != ""){
				if(tags[x].length > 4 && !messageHandler.badQuery(tags[x])){
					messageHandler.send(message.channel, tags[x]+" is longer than 4 letters, please enter a tag.", "PC tag too long");
					continue;
				}
				online.online(tags[x], 'ps2ps4us:v2')
					.then(res => messageHandler.send(message.channel, res, "PS4US Online", true))
					.catch(err => messageHandler.handleError(message.channel, err, "PS4US Online"))
			}
		}
	}
	else if (message.content.substring(0,14).toLowerCase() == '!ps4eu online '){
		let tags = message.content.substring(14).toLowerCase().split(" ");
		for(const x in tags){
			if(tags[x] != ""){
				if(tags[x].length > 4 && !messageHandler.badQuery(tags[x])){
					messageHandler.send(message.channel, tags[x]+" is longer than 4 letters, please enter a tag.", "PC tag too long");
					continue;
				}
				online.online(tags[x], 'ps2ps4eu:v2')
					.then(res => messageHandler.send(message.channel, res, "PS4EU Online", true))
					.catch(err => messageHandler.handleError(message.channel, err, "PS4EU Online"))
			}
		}
	}
	else if (message.content.substring(0,12).toLowerCase() == '!population '){
		//server population
		let servers = message.content.substring(12).toLowerCase().split(" ");
		for(const x in servers){
			if(servers[x] != ""){
				population.lookup(servers[x])
					.then(res => messageHandler.send(message.channel, res, "Population", true))
					.catch(err => messageHandler.handleError(message.channel, err, "Population"))
			}
		}
	}
	else if (message.content.substring(0,5).toLowerCase() == '!asp '){
		let chars = message.content.substring(5).toLowerCase().split(" ");
		for(const x in chars){
			if(chars[x] != ""){
				asp.originalBR(chars[x], "ps2:v2")
					.then(res => messageHandler.send(message.channel, res, "PC ASP", true))
					.catch(err => messageHandler.handleError(message.channel, err, "PC ASP"))
			}
		}
	}
	else if (message.content.substring(0,11).toLowerCase() == '!ps4us asp '){
		let chars = message.content.substring(11).toLowerCase().split(" ");
		for(const x in chars){
			if(chars[x] != ""){
				asp.originalBR(chars[x], "ps2ps4us:v2")
					.then(res => messageHandler.send(message.channel, res, "PS4US ASP", true))
					.catch(err => messageHandler.handleError(message.channel, err, "PC ASP"))
			}
		}
	}
	else if (message.content.substring(0,11).toLowerCase() == '!ps4eu asp '){
		let chars = message.content.substring(11).toLowerCase().split(" ");
		for(const x in chars){
			if(chars[x] != ""){
				asp.originalBR(chars[x], "ps2ps4eu:v2")
					.then(res => messageHandler.send(message.channel, res, "PS4EU ASP", true))
					.catch(err => messageHandler.handleError(message.channel, err, "PC ASP"))
			}
		}
	}
	else if (message.content.substring(0,11).toLowerCase() == '!territory '){
		let servers = message.content.substring(11).toLowerCase().split(" ");
		for(const x in servers){
			if(servers[x] != ""){
				territory.territory(servers[x])
					.then(res => messageHandler.send(message.channel, res, "Territory", true))
					.catch(err => messageHandler.handleError(message.channel, err, "Territory"))
			}
		}
	}
	else if (message.content.substring(0,8).toLowerCase() == '!alerts '){
		let servers = message.content.substring(8).toLowerCase().split(" ");
		for(const x in servers){
			if(servers[x] != ""){
				alerts.activeAlerts(servers[x])
					.then(res => messageHandler.send(message.channel, res, "Alerts", true))
					.catch(err => messageHandler.handleError(message.channel, err, "Alerts"))
			}
		}
	}
	else if (message.content.toLowerCase() == '!status') {
		status.servers()
			.then(res => messageHandler.send(message.channel, res, "Server status", true))
			.catch(err => messageHandler.handleError(message.channel, err, "Server status"))
	}
	else if (message.content.substring(0,8).toLowerCase() == '!weapon ') {
		weapon.lookup(message.content.substring(8))
			.then(res => messageHandler.send(message.channel, res, "Weapon", true))
			.catch(err => messageHandler.handleError(message.channel, err, "Weapon"))
	}
	else if (message.content.substring(0,14).toLowerCase() == '!weaponsearch ') {
		weaponSearch.lookup(message.content.substring(14))
			.then(res => messageHandler.send(message.channel, res, "Weapon search", true))
			.catch(err => messageHandler.handleError(message.channel, err, "Weapon search"))
	}
	else if (message.content.substring(0,9).toLowerCase() == '!implant ') {
		implant.lookup(message.content.substring(9))
			.then(res => messageHandler.send(message.channel, res, "Implant", true))
			.catch(err => messageHandler.handleError(message.channel, err, "Implant"))
	}
	else if (message.content.toLowerCase() == '!config' && runningOnline){
		subscriptionConfig.displayConfig(message.channel.id, SQLclient)
			.then(res => messageHandler.send(message.channel, res, "Display subscription config", true))
			.catch(err => messageHandler.handleError(message.channel, err, "Display subscription config"))
	}
	else if (message.content.toLowerCase() == '!config audit' && runningOnline){
		subscriptionConfig.audit(message.channel.id, SQLclient)
			.then(res => messageHandler.send(message.channel, res, "Config audit", true))
			.catch(err => messageHandler.handleError(message.channel, err, "Config audit"))
	}
	else if (message.content.substring(0,15).toLowerCase() == '!config alerts ' && runningOnline){
		subscriptionConfig.setAlert(message.content.substring(15), message.channel.id, SQLclient)
			.then(res => messageHandler.send(message.channel, res, "Alert config", true))
			.catch(err => messageHandler.handleError(message.channel, err, "Alert config"))
	}
	else if (message.content.substring(0,19).toLowerCase() == '!config autodelete ' && runningOnline){
		subscriptionConfig.setAutoDelete(message.content.substring(19), message.channel.id, SQLclient)
			.then(res => messageHandler.send(message.channel, res, "AutoDelete config", true))
			.catch(err => messageHandler.handleError(message.channel, err, "AutoDelete config"))
	}
	else if (message.content.substring(0,20).toLowerCase() == '!subscribe activity ' && runningOnline){
		let outfits = message.content.substring(20).toLowerCase().split(" ");
		for(const x in outfits){
			if(outfits[x] != ""){
				subscription.subscribeActivity(SQLclient, message.channel.id, outfits[x], 'ps2:v2')
					.then(res => messageHandler.send(message.channel, res, "Subscribe activity", true))
					.catch(err => messageHandler.handleError(message.channel, err, "Subscribe activity"))
			}
		}
	}
	else if (message.content.substring(0,22).toLowerCase() == '!unsubscribe activity ' && runningOnline){
		let outfits = message.content.substring(22).toLowerCase().split(" ");
		for(const x in outfits){
			if(outfits[x] != ""){
				subscription.unsubscribeActivity(SQLclient, message.channel.id, outfits[x], 'ps2:v2')
					.then(res => messageHandler.send(message.channel, res, "Unsubscribe activity"))
					.catch(err => messageHandler.handleError(message.channel, err, "Unsubscribe activity"))
			}
		}
	}
	else if (message.content.substring(0,26).toLowerCase() == '!ps4us subscribe activity ' && runningOnline){
		let outfits = message.content.substring(26).toLowerCase().split(" ");
		for(const x in outfits){
			if(outfits[x] != ""){
				subscription.subscribeActivity(SQLclient, message.channel.id, outfits[x], 'ps2ps4us:v2')
					.then(res => messageHandler.send(message.channel, res, "PS4US Subscribe activity", true))
					.catch(err => messageHandler.handleError(message.channel, err, "PS4US Subscribe activity"))
			}
		}
	}
	else if (message.content.substring(0,28).toLowerCase() == '!ps4us unsubscribe activity ' && runningOnline){
		let outfits = message.content.substring(28).toLowerCase().split(" ");
		for(const x in outfits){
			if(outfits[x] != ""){
				subscription.unsubscribeActivity(SQLclient, message.channel.id, outfits[x], 'ps2ps4us:v2')
					.then(res => messageHandler.send(message.channel, res, "PS4US Unsubscribe activity"))
					.catch(err => messageHandler.handleError(message.channel, err, "PS4US Unsubscribe activity"))
			}
		}
	}
	else if (message.content.substring(0,26).toLowerCase() == '!ps4eu subscribe activity ' && runningOnline){
		let outfits = message.content.substring(26).toLowerCase().split(" ");
		for(const x in outfits){
			if(outfits[x] != ""){
				subscription.subscribeActivity(SQLclient, message.channel.id, outfits[x], 'ps2ps4eu:v2')
				.then(res => messageHandler.send(message.channel, res, "PS4EU Subscribe activity", true))
				.catch(err => messageHandler.handleError(message.channel, err, "PS4EU Subscribe Activity"))
			}
		}
	}
	else if (message.content.substring(0,28).toLowerCase() == '!ps4eu unsubscribe activity ' && runningOnline){
		let outfits = message.content.substring(28).toLowerCase().split(" ");
		for(const x in outfits){
			if(outfits[x] != ""){
				subscription.unsubscribeActivity(SQLclient, message.channel.id, outfits[x], 'ps2ps4eu:v2')
					.then(res => messageHandler.send(message.channel, res, "PS4EU Unsubscribe activity"))
					.catch(err => messageHandler.handleError(message.channel, err, "PS4EU Unsubscribe activity"))
			}
		}
	}
	else if (message.content.substring(0,20).toLowerCase() == '!subscribe captures ' && runningOnline){
		let outfits = message.content.substring(20).toLowerCase().split(" ");
		for(const x in outfits){
			if(outfits[x] != ""){
				subscription.subscribeCaptures(SQLclient, message.channel.id, outfits[x], 'ps2:v2')
					.then(res => messageHandler.send(message.channel, res, "Subscribe captures", true))
					.catch(err => messageHandler.handleError(message.channel, err, "Subscribe captures"))
			}
		}
	}
	else if (message.content.substring(0,22).toLowerCase() == '!unsubscribe captures ' && runningOnline){
		let outfits = message.content.substring(22).toLowerCase().split(" ");
		for(const x in outfits){
			if(outfits[x] != ""){
				subscription.unsubscribeCaptures(SQLclient, message.channel.id, outfits[x], 'ps2:v2')
					.then(res => messageHandler.send(message.channel, res, "Unsubscribe captures"))
					.catch(err => messageHandler.handleError(message.channel, err, "Unsubscribe captures"))
			}
		}
	}
	else if (message.content.substring(0,26).toLowerCase() == '!ps4us subscribe captures ' && runningOnline){
		let outfits = message.content.substring(26).toLowerCase().split(" ");
		for(const x in outfits){
			if(outfits[x] != ""){
				subscription.subscribeCaptures(SQLclient, message.channel.id, outfits[x], 'ps2ps4us:v2')
					.then(res => messageHandler.send(message.channel, res, "PS4US Subscribe captures", true))
					.catch(err => messageHandler.handleError(message.channel, err, "PS4US Subscribe captures"))
			}
		}
	}
	else if (message.content.substring(0,28).toLowerCase() == '!ps4us unsubscribe captures ' && runningOnline){
		let outfits = message.content.substring(28).toLowerCase().split(" ");
		for(const x in outfits){
			if(outfits[x] != ""){
				subscription.unsubscribeCaptures(SQLclient, message.channel.id, outfits[x], 'ps2ps4us:v2')
					.then(res => messageHandler.send(message.channel, res, "PS4US Unsubscribe captures"))
					.catch(err => messageHandler.handleError(message.channel, err, "PS4US Unsubscribe captures"))
			}
		}
	}
	else if (message.content.substring(0,26).toLowerCase() == '!ps4eu subscribe captures ' && runningOnline){
		let outfits = message.content.substring(26).toLowerCase().split(" ");
		for(const x in outfits){
			if(outfits[x] != ""){
				subscription.subscribeCaptures(SQLclient, message.channel.id, outfits[x], 'ps2ps4eu:v2')
					.then(res => messageHandler.send(message.channel, res, "PS4EU Subscribe captures", true))
					.catch(err => messageHandler.handleError(message.channel, err, "PS4EU Subscribe captures"))
			}
		}
	}
	else if (message.content.substring(0,28).toLowerCase() == '!ps4eu unsubscribe captures ' && runningOnline){
		let outfits = message.content.substring(28).toLowerCase().split(" ");
		for(const x in outfits){
			if(outfits[x] != ""){
				subscription.unsubscribeCaptures(SQLclient, message.channel.id, outfits[x], 'ps2ps4eu:v2')
					.then(res => messageHandler.send(message.channel, res, "PS4EU Unsubscribe captures"))
					.catch(err => messageHandler.handleError(message.channel, err, "PS4EU Unsubscribe captures"))
			}
		}
	}
	else if (message.content.substring(0,18).toLowerCase() == '!subscribe alerts ' && runningOnline){
		let servers = message.content.substring(18).toLowerCase().split(" ");
		for(const x in servers){
			if(servers[x] != ""){
				subscription.subscribeAlert(SQLclient, message.channel.id, servers[x])
					.then(res => messageHandler.send(message.channel, res, "Subscribe alerts", true))
					.catch(err => messageHandler.handleError(message.channel, err, "Subscribe alerts"))
			}
		}
	}
	else if (message.content.substring(0,20).toLowerCase() == '!unsubscribe alerts ' && runningOnline){
		let servers = message.content.substring(20).toLowerCase().split(" ");
		for(const x in servers){
			if(servers[x] != ""){
				subscription.unsubscribeAlert(SQLclient, message.channel.id, servers[x])
					.then(res => messageHandler.send(message.channel, res, "Unsubscribe alerts"))
					.catch(err => messageHandler.handleError(message.channel, err, "Unsubscribe alerts"))
			}
		}
	}
	else if (message.content.substring(0,19).toLowerCase() == '!subscribe twitter ' && runningOnline){
		let users = message.content.substring(19).toLowerCase().split(" ");
		for(const x in users){
			if(users[x] != ""){
				subscription.subscribeTwitter(SQLclient, message.channel.id, users[x])
					.then(res => messageHandler.send(message.channel, res, "Subscribe twitter", true))
					.catch(err => messageHandler.handleError(message.channel, err, "Subscribe twitter"))
			}
		}
	}
	else if (message.content.substring(0,21).toLowerCase() == '!unsubscribe twitter ' && runningOnline){
		let users = message.content.substring(21).toLowerCase().split(" ");
		for(const x in users){
			if(users[x] != ""){
				subscription.unsubscribeTwitter(SQLclient, message.channel.id, users[x])
					.then(res => messageHandler.send(message.channel, res, "Unsubscribe twitter"))
					.catch(err => messageHandler.handleError(message.channel, err, "Unsubscribe twitter"))
			}
		}
	}
	else if (message.content.toLowerCase() == "!unsubscribe all" && runningOnline){
		subscription.unsubscribeAll(SQLclient, message.channel.id)
			.then(res => messageHandler.send(message.channel, res, "Unsubscribe all"))
			.catch(err => messageHandler.handleError(message.channel, err, "Unsubscribe all"))

	}
	else if (message.content.substring(0,1) == '!' && message.content.toLowerCase().indexOf('subscribe') != -1 && !runningOnline){
		messageHandler.send(message.channel, 'Subscription functionality currently unavailable', "Subscriptions unabailable");
	}
});

// Log bot in
client.login(token);