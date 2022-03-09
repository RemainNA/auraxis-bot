// This file implements the main event listener of the bot, which picks up messages, parses them for commands, and calls the appropriate functions.

// Import the discord.js module
const Discord = require('discord.js');

//PostgreSQL connection
const pg = require('pg');

// Internationalization
const i18n = require('i18n');
i18n.configure({
	directory: './locales',
	defaultLocale: 'en-us',
	updateFiles: false,
	objectNotation: true
})

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
const dashboard = require('./dashboard.js');
const trackers = require('./trackers.js');
const openContinents = require('./openContinents.js');
const auraxiums = require('./auraxiums.js');
const leaderboard = require('./leaderboard.js');
const directives = require('./directives.js');
const vehicles = require('./vehicles.js');
const {badQuery} = require('./utils.js');
const outfitMaintenance = require('./outfitMaintenance.js');
const character = require('./character.js');

require('dotenv').config();

let runningOnline = false;
let twitterAvail = false;

if(typeof(process.env.DATABASE_URL) !== 'undefined'){
	runningOnline = true;
}

if(typeof(process.env.TWITTER_CONSUMER_KEY) !== 'undefined'){
	twitterAvail = true;
}

const intentsList = [
	Discord.Intents.FLAGS.GUILD_MESSAGES,
	Discord.Intents.FLAGS.DIRECT_MESSAGES,
	Discord.Intents.FLAGS.GUILDS
]

const client = new Discord.Client({intents: intentsList, allowedMentions: {parse: ['roles']}, partials: ['CHANNEL']});

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
		outfitMaintenance.update(SQLclient);
		alertMaintenance.update(SQLclient, client);
		deleteMessages.run(SQLclient, client);
		openContinents.check(SQLclient, client);
		trackers.update(SQLclient, client);
		dashboard.update(SQLclient, client);
		setInterval(function () { 
			deleteMessages.run(SQLclient, client);
			openContinents.check(SQLclient, client);
		}, 60000); //Update alerts every minute
		setInterval(function() {
			alertMaintenance.update(SQLclient, client);
			dashboard.update(SQLclient, client);
		}, 300000) //Update dashboards every 5 minutes
		setInterval(function() {
			trackers.update(SQLclient, client);
		}, 600000) //Update trackers every 10 minutes
	}

	client.user.setActivity('/help')
});

const listOfCommands = 
"/help\n\
\n\
/character [name] <platform>\n\
/stats [name] <weapon name/id> <platform>\n\
/asp [name] <platform>\n\
/auraxiums [name] <platform>\n\
/directives [name] <platform>\n\
/vehicle [name] [vehicle] <platform>\n\
/outfit [tag] <platform>\n\
/online [tag] <platform>\n\
/population [server]\n\
/territory [server]\n\
/alerts [server]\n\
/leaderboard [type] [period] <server>\n\
/status\n\
/weapon [weapon name/id]\n\
/weaponSearch [name]\n\
/implant [implant name]"

const commandsManageChannels = 
"/(un)subscribe alerts [server]\n\
/(un)subscribe activity [tag] <platform>\n\
/(un)subscribe captures [tag] <platform>\n\
/(un)subscribe unlocks [server]\n\
/(un)subscribe twitter [wrel/planetside]\n\
/unsubscribe all\n\
/config view\n\
/config audit\n\
/config continent [continent] [enable/disable]\n\
/config autodelete [enable/disable]\n\
/tracker server [server] [Population/Continents]\n\
/tracker outfit [tag] <platform>\n\
/dashboard server [server]\n\
/dashboard outfit [tag] <platform>"

const links = '\n\
[GitHub page & FAQ](https://github.com/RemainNA/auraxis-bot)\n\
[Support server](https://discord.gg/Kf5P6Ut)\n\
[Invite bot](https://discord.com/api/oauth2/authorize?client_id=437756856774033408&permissions=1330192&scope=bot%20applications.commands)\n\
[Donate on Ko-fi](https://ko-fi.com/remainna)'

const deprecationNotice = 'Exclamation commands will be disabled at the end of April, please switch over to slash commands.  View the FAQ in !help for more info.';

const checkPermissions = async function(channel, user){
	if(channel.type == 'DM'){
		return true;
	}
	else if(channel.type == 'GUILD_TEXT' || channel.type == 'GUILD_NEWS'){
		return (await channel.permissionsFor(channel.guild.members.cache.get(user.id)).has(Discord.Permissions.FLAGS.MANAGE_CHANNELS));
	}
	else{
		return false;
	}
}

client.on('interactionCreate', async interaction => {
	if(interaction.isCommand()){
		const options = interaction.options;
		try{
			let res = "";
			let manageChannel = false;
			let errorList = [];
			switch(interaction.commandName){
			case 'ping':
				await interaction.reply(`Bot's ping to Discord is ${client.ws.ping}ms`);
				break;

			case 'help':
				let helpEmbed = new Discord.MessageEmbed();
				helpEmbed.setTitle("Auraxis bot");
				helpEmbed.setColor("BLUE");
				helpEmbed.addField("Commands", listOfCommands);
				helpEmbed.addField("Requires Manage Channel permission", commandsManageChannels);
				helpEmbed.addField("Links", links);
				helpEmbed.setFooter({text: "<> = Optional, [] = Required"});
				await interaction.reply({embeds: [helpEmbed]});
				break;

			case 'character':
				if(options.getString('name').split(' ').length > 10){
					await interaction.reply({content: "This command supports a maximum of 10 characters per query", ephemeral: true});
				}
				else if(options.getString('name').split(' ').length > 1){
					res = [];
					await interaction.deferReply(); //Give the bot time to look up the results
					for(const c of options.getString('name').toLowerCase().replace(/\s\s+/g, ' ').split(' ')){
						try{
							const cRes = await char.character(c, options.getString('platform') || 'ps2:v2');
							res.push(cRes[0]);
						}
						catch(err){
							errorList.push(c);
						}
					}
					if(errorList.length > 0){
						await interaction.editReply({content: `Error with ${errorList}`, embeds:res});
					}
					else{
						await interaction.editReply({embeds:res});
					}
				}
				else{
					await interaction.deferReply(); //Give the bot time to look up the results
					res = await char.character(options.getString('name').toLowerCase(), options.getString('platform') || 'ps2:v2', interaction.locale);
					await interaction.editReply({embeds:[res[0]], components: res[1]});
				}
				break;			

			case 'stats':
				await interaction.deferReply(); //Give the bot time to look up the results
				if(interaction.options.get('weapon')){
					res = await stats.lookup(options.getString('name').toLowerCase(), options.getString('weapon').toLowerCase(), options.getString('platform') || 'ps2:v2');
					await interaction.editReply({embeds:[res]});
				}
				else{ //character lookup
					res = await char.character(interaction.options.getString('name').toLowerCase(), interaction.options.getString('platform') || 'ps2:v2', interaction.locale);
					await interaction.editReply({embeds:[res[0]], components: res[1]});
				}
				break;

			case 'outfit':
				if(options.getString('tag').split(' ').length > 10){
					await interaction.reply({content: "This command supports a maximum of 10 outfits per query", ephemeral: true});
				}
				else if(options.getString('tag').split(' ').length > 1){
					res = [];
					await interaction.deferReply(); //Give the bot time to look up the results
					for(const t of options.getString('tag').toLowerCase().replace(/\s\s+/g, ' ').split(' ')){
						if(t.length > 4){
							errorList.push(t);
							continue;
						}
						try{
							const outfitRes = await outfit.outfit(t, options.getString('platform') || 'ps2:v2', SQLclient);
							res.push(outfitRes[0]);
						}
						catch(err){
							errorList.push(t);
						}
					}
					if(errorList.length > 0){
						await interaction.editReply({content: `Error with ${errorList}`, embeds:res});
					}
					else{
						await interaction.editReply({embeds:res});
					}
				}
				else{
					if(options.getString('tag').length > 4){
						await interaction.reply({content: `${options.getString('tag')} is longer than 4 letters, please enter a tag.`, ephemeral: true});
						return;
					}
					await interaction.deferReply(); //Give the bot time to look up the results
					res = await outfit.outfit(options.getString('tag').toLowerCase(), options.getString('platform') || 'ps2:v2', SQLclient);
					await interaction.editReply({embeds:[res[0]], components: res[1]});
				}
				break;

			case 'online':
				if(options.getString('tag').split(' ').length > 10){
					await interaction.reply({content: "This command supports a maximum of 10 outfits per query", ephemeral: true});
				}
				else if(options.getString('tag').split(' ').length > 1){
					res = [];
					await interaction.deferReply(); //Give the bot time to look up the results
					for(const t of options.getString('tag').toLowerCase().replace(/\s\s+/g, ' ').split(' ')){
						if(t.length > 4){
							errorList.push(t);
							continue;
						}
						try{
							res.push(await online.online(t, options.getString('platform') || 'ps2:v2'));
						}
						catch(err){
							errorList.push(t);
						}
					}
					if(errorList.length > 0){
						await interaction.editReply({content: `Error with ${errorList}`, embeds:res});
					}
					else{
						await interaction.editReply({embeds:res});
					}
				}
				else{
					if(options.getString('tag').length > 4){
						await interaction.reply({content: `${options.getString('tag')} is longer than 4 letters, please enter a tag.`, ephemeral: true});
						return;
					}
					await interaction.deferReply(); //Give the bot time to look up the results
					res = await online.online(options.getString('tag').toLowerCase(), options.getString('platform') || 'ps2:v2');
					await interaction.editReply({embeds:[res]});
				}
				break;

			case 'config':
				manageChannel = await checkPermissions(interaction.channel, interaction.user);
				if(!manageChannel){
					await interaction.reply({content: "Managing subscriptions is only available to users with the Manage Channel permission", ephemeral: true})
					return;
				}
				await interaction.deferReply();
				switch(options.getSubcommand()){
				case 'view':
					res = await subscriptionConfig.displayConfig(interaction.channelId, SQLclient);
					if(typeof(res) === 'string'){
						await interaction.editReply(res);
					}
					else{
						await interaction.editReply({embeds: [res]});
					}
					break;

				case 'audit':
					res = await subscriptionConfig.audit(interaction.channelId, SQLclient);
					await interaction.editReply(res);
					break;

				case 'continent':
					res = await subscriptionConfig.setContinent(options.getString("continent"), options.getString("setting"), interaction.channelId, SQLclient);
					await interaction.editReply(res);
					break;
				
				case 'autodelete':
					res = await subscriptionConfig.setAutoDelete(options.getString("setting"), interaction.channelId, SQLclient);
					await interaction.editReply(res);
					break;
				
				default:
					interaction.editReply("Unknown command error");
				}
				
				break;

			case 'subscribe':
				manageChannel = await checkPermissions(interaction.channel, interaction.user);
				if(!manageChannel){
					await interaction.reply({content: "Managing subscriptions is only available to users with the Manage Channel permission", ephemeral: true})
					return;
				}
				await interaction.deferReply();
				switch(options.getSubcommand()){
				case 'alerts':
					res = await subscription.subscribeAlert(SQLclient, interaction.channelId, options.getString('server'));
					await interaction.editReply(res);
					break;

				case 'activity':
					res = await subscription.subscribeActivity(SQLclient, interaction.channelId, options.getString('tag'), options.getString('platform') || 'ps2:v2');
					await interaction.editReply(res);
					break;

				case 'captures':
					res = await subscription.subscribeCaptures(SQLclient, interaction.channelId, options.getString('tag'), options.getString('platform') || 'ps2:v2');
					await interaction.editReply(res);
					break;

				case 'twitter':
					res = await subscription.subscribeTwitter(SQLclient, interaction.channelId, options.getString('user'));
					await interaction.editReply(res);
					break;

				case 'unlocks':
					res = await subscription.subscribeUnlocks(SQLclient, interaction.channelId, options.getString('server'));
					await interaction.editReply(res);
					break;

				default:
					interaction.editReply("Unknown command error");
				}
				
				break;

			case 'unsubscribe':
				manageChannel = await checkPermissions(interaction.channel, interaction.user);
				if(!manageChannel){
					await interaction.reply({content: "Managing subscriptions is only available to users with the Manage Channel permission", ephemeral: true})
					return;
				}
				await interaction.deferReply();
				switch(options.getSubcommand()){
				case 'alerts':
					res = await subscription.unsubscribeAlert(SQLclient, interaction.channelId, options.getString("server"));
					await interaction.editReply(res);
					break;

				case 'activity':
					res = await subscription.unsubscribeActivity(SQLclient, interaction.channelId, options.getString("tag"), options.getString("platform") || 'ps2:v2');
					await interaction.editReply(res);
					break;

				case 'captures':
					res = await subscription.unsubscribeCaptures(SQLclient, interaction.channelId, options.getString("tag"), options.getString("platform") || 'ps2:v2');
					await interaction.editReply(res);
					break;

				case 'twitter':
					res = await subscription.unsubscribeTwitter(SQLclient, interaction.channelId, options.getString("user"));
					await interaction.editReply(res);
					break;

				case 'unlocks':
					res = await subscription.unsubscribeUnlocks(SQLclient, interaction.channelId, options.getString("server"));
					await interaction.editReply(res);
					break;

				case 'all':
					res = await subscription.unsubscribeAll(SQLclient, interaction.channelId);
					await interaction.editReply(res);
					break;

				default:
					interaction.editReply("Unknown command error");
				}
				
				break;

			case 'population':
				await interaction.deferReply();
				res = await population.lookup(options.getString("server"), interaction.locale);
				await interaction.editReply({embeds: [res]});
				break;

			case 'territory':
				await interaction.deferReply();
				res = await territory.territory(options.getString("server"), interaction.locale);
				await interaction.editReply({embeds: [res]});
				break;

			case 'alerts':
				await interaction.deferReply();
				res = await alerts.activeAlerts(options.getString("server"));
				await interaction.editReply({embeds: [res]});
				break;

			case 'status':
				await interaction.deferReply();
				res = await status.servers();
				await interaction.editReply({embeds: [res]});
				break;

			case 'weapon':
				res = await weapon.lookup(options.getString("query"));
				await interaction.reply({embeds: [res]});
				break;

			case 'weaponsearch':
				res = await weaponSearch.lookup(options.getString("query"));
				await interaction.reply({embeds: [res], ephemeral: true});
				break;

			case 'implant':
				res = await implant.lookup(options.getString("query"));
				await interaction.reply({embeds: [res]});
				break;

			case 'asp':
				await interaction.deferReply();
				res = await asp.originalBR(options.getString('name').toLowerCase(), options.getString('platform') || 'ps2:v2');
				await interaction.editReply({embeds: [res]});
				break;

			case 'dashboard':
				manageChannel = await checkPermissions(interaction.channel, interaction.user);
				if(!manageChannel){
					await interaction.reply({content: "Only users with the Manage Channel permission can create dashboards", ephemeral: true})
					return;
				}
				await interaction.deferReply();
				switch(options.getSubcommand()){
				case 'server':
					res = await dashboard.createServer(interaction.channel, options.getString("server"), SQLclient);
					await interaction.editReply(res);
					break;

				case 'outfit':
					res = await dashboard.createOutfit(interaction.channel, options.getString("tag").toLowerCase(), options.getString('platform') || 'ps2:v2', SQLclient);
					await interaction.editReply(res);
					break;

				default: 
					interaction.editReply("Unknown command error");
				}
				
				break;

			case 'tracker':
				if(interaction.channel.type == 'DM'){
					await interaction.reply({content: "Cannot create trackers in DMs", ephemeral: true})
				}
				manageChannel = await checkPermissions(interaction.channel, interaction.user);
				if(!manageChannel){
					await interaction.reply({content: "Only users with the Manage Channel permission can create dashboards", ephemeral: true})
					return;
				}
				await interaction.deferReply();
				switch(options.getSubcommand()){
					case 'server':
						res = await trackers.create(options.getString('type'), options.getString('server'), interaction.guild, client, SQLclient);
						await interaction.editReply(res);
						break;
	
					case 'outfit':
						res = await trackers.createOutfit(options.getString('tag').toLowerCase(), options.getString('platform') || 'ps2:v2', interaction.guild, client, SQLclient);
						await interaction.editReply(res);
						break;
	
					default: 
						interaction.editReply("Unknown command error");
					}
				
				break;

			case 'auraxiums':
				await interaction.deferReply();
				res = await auraxiums.medals(options.getString("name"), options.getString("platform") || "ps2:v2");
				await interaction.editReply({embeds: [res[0]], components: res[1]});
				break;

			case 'leaderboard':
				await interaction.deferReply();
				res = await leaderboard.lookup(options.getString("type"), options.getString("period"), options.getString("server"), 20);
				await interaction.editReply({embeds: [res]});
				break;

			case 'directives':
				await interaction.deferReply();
				res = await directives.directives(options.getString("name"), options.getString("platform") || "ps2:v2");
				await interaction.editReply({embeds: [res[0]], components: res[1]});
				break;
			
			case 'vehicle':
				await interaction.deferReply();
				res = await vehicles.vehicle(options.getString("name"), options.getString("vehicle"), options.getString("platform") || "ps2:v2");
				await interaction.editReply({embeds: [res]});
				break;
			
			}
			
		}
		catch(err){
			if(typeof(err) !== 'string'){
				console.log(`Error in ${interaction.commandName}`);
				if(err.code == 10062){ //"Unknown interaction"
					console.log("Unknown interaction");
					console.log(interaction.options);
					return;
				}
				else if(err.code == 10008){ //"Unknown Message"
					console.log("Unknown Message");
					console.log(interaction.options);
					return;
				}
				console.log(err);
				if(interaction.deferred){
					await interaction.editReply("Error occurred when handling command");
				}
				else{
					await interaction.reply("Error occurred when handling command");
				}
			}
			else{
				if(interaction.deferred){
					await interaction.editReply(err);
				}
				else{
					await interaction.reply(err);
				}
			}
		}
	}
	else if(interaction.isButton()){
		try{
			const options = interaction.customId.split('%');
			switch(options[0]){
				case 'auraxiums':
					await interaction.deferReply({ephemeral: true});
					const aurax = await auraxiums.medals(options[1], options[2], true);
					await interaction.editReply({embeds: [aurax[0]]});
					break;

				case 'directives':
					await interaction.deferReply({ephemeral: true});
					const direc = await directives.directives(options[1], options[2], true);
					await interaction.editReply({embeds: [direc[0]]});
					break;

				case 'recentStats':
					await interaction.deferReply({ephemeral: false});
					const recentStats = await character.recentStats(options[2], options[3], options[1], interaction.locale);
					await interaction.editReply({embeds: [recentStats]});
					break;

				case 'outfit':
					await interaction.deferReply({ephemeral: false});
					const outfitRes = await outfit.outfit("", options[2], SQLclient, options[1]);
					await interaction.editReply({embeds: [outfitRes[0]], components: outfitRes[1]});
					break;

				case 'online':
					await interaction.deferReply({ephemeral: false});
					const onlineRes = await online.online("", options[2], options[1]);
					await interaction.editReply({embeds: [onlineRes]});
					break;
			}
		}
		catch(err){
			if(typeof(err) !== 'string'){
				console.log(`Error in ${interaction.customId} button`);
				if(err.code == 10062){ //"Unknown interaction"
					console.log("Unknown interaction");
					return;
				}
				else if(err.code == 10008){ //"Unknown Message"
					console.log("Unknown Message");
					return;
				}
				console.log(err);
				if(interaction.deferred){
					await interaction.editReply("Error occurred when handling command");
				}
				else{
					await interaction.reply({content: "Error occurred when handling command", ephemeral: true});
				}
			}
			else{
				if(interaction.deferred){
					await interaction.editReply(err);
				}
				else{
					await interaction.reply({content: err, ephemeral: true});
				}
			}
		}
	}
	else if(interaction.isAutocomplete()){
		try{
			if(interaction.commandName == 'stats'){
				const weaponsList = await stats.partialMatches(interaction.options.getString('weapon'));
				await interaction.respond(weaponsList);
			}
			else if(interaction.commandName == 'weapon'){
				const weaponsList = await weapon.partialMatches(interaction.options.getString('query'));
				await interaction.respond(weaponsList);
			}
			else if(interaction.commandName == 'implant'){
				const implantList = await implant.partialMatches(interaction.options.getString('query'));
				await interaction.respond(implantList);
			}
			else if(interaction.commandName == 'vehicle'){
				const vehicleList = await vehicles.partialMatches(interaction.options.getString('vehicle'));
				await interaction.respond(vehicleList);
			}
		}
		catch(err){
			if(err.code == 10062){
				return;
			}
			console.log("Autocomplete error");
			console.log(err);
		}
	}
})

// Create an event listener for messages
client.on('messageCreate', async message => {
	if(message.author == client.user || !message.content.startsWith("!")){
		return;
	}
	messageLower = message.content.toLowerCase();
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
		helpEmbed.addField("Requires Manage Channel permission", commandsManageChannels);
		helpEmbed.addField("Links", links);
		helpEmbed.setFooter({text: "<> = Optional, [] = Required"});
		messageHandler.send(message.channel, {content: deprecationNotice, embeds: [helpEmbed]}, 'help', true);
	}
	else if (message.content.substring(0,11).toLowerCase() == '!character '){
		let chars = message.content.substring(11).toLowerCase().split(" ");
		for(const x in chars){
			if(chars[x] != ""){
				char.character(chars[x], 'ps2:v2')
					.then(res => messageHandler.send(message.channel, {content: deprecationNotice, embeds: [res[0]], components: res[1]}, "PC Character", true))
					.catch(err => messageHandler.handleError(message.channel, err, "PC Character"))
			}
		}
	}
	else if (message.content.substring(0,17).toLowerCase() == '!ps4us character '){
		let chars = message.content.substring(17).toLowerCase().split(" ");
		for(const x in chars){
			if(chars[x] != ""){
				char.character(chars[x], 'ps2ps4us:v2')
					.then(res => messageHandler.send(message.channel, {content: deprecationNotice, embeds: [res[0]], components: res[1]}, "PS4US Character", true))
					.catch(err => messageHandler.handleError(message.channel, err, "PS4US Character"))
			}
		}
	}
	else if (message.content.substring(0,17).toLowerCase() == '!ps4eu character '){
		let chars = message.content.substring(17).toLowerCase().split(" ");
		for(const x in chars){
			if(chars[x] != ""){
				char.character(chars[x], 'ps2ps4eu:v2')
					.then(res => messageHandler.send(message.channel, {content: deprecationNotice, embeds: [res[0]], components: res[1]}, "PS4EU Character", true))
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
				.then(res => messageHandler.send(message.channel, {content: deprecationNotice, embeds: [res[0]], components: res[1]}, "PC Character by stats", true))
				.catch(err => messageHandler.handleError(message.channel, err, "PC Character by stats"))
		}
		else{
			stats.lookup(cName, wName, 'ps2:v2')
				.then(res => messageHandler.send(message.channel, {content: deprecationNotice, embeds: [res]}, "PC Stats", true))
				.catch(err => messageHandler.handleError(message.channel, err, "PC Stats"))	
		}
	}
	else if (message.content.substring(0,13).toLowerCase() == '!ps4us stats '){
		let parts = message.content.toLowerCase().split(" ");
		let cName = parts[2];
		let wName = message.content.substring((13+cName.length+1));
		if(wName == ""){
			char.character(cName, 'ps2ps4us:v2')
				.then(res => messageHandler.send(message.channel, {content: deprecationNotice, embeds: [res[0]], components: res[1]}, "PS4US Character by stats", true))
				.catch(err => messageHandler.handleError(message.channel, err, "PS4US Character by stats"))
		}
		else{
			stats.lookup(cName, wName, 'ps2ps4us:v2')
				.then(res => messageHandler.send(message.channel, {content: deprecationNotice, embeds: [res]}, "PS4US Stats", true))
				.catch(err => messageHandler.handleError(message.channel, err, "PS4US Stats"))	
		}
	}
	else if (message.content.substring(0,13).toLowerCase() == '!ps4eu stats '){
		let parts = message.content.toLowerCase().split(" ");
		let cName = parts[2];
		let wName = message.content.substring((13+cName.length+1));
		if(wName == ""){
			char.character(cName, 'ps2ps4eu:v2')
				.then(res => messageHandler.send(message.channel, {content: deprecationNotice, embeds: [res[0]], components: res[1]}, "PS4EU Character by stats", true))
				.catch(err => messageHandler.handleError(message.channel, err, "PS4EU Character by stats"))
		}
		else{
			stats.lookup(cName, wName, 'ps2ps4eu:v2')
				.then(res => messageHandler.send(message.channel, {content: deprecationNotice, embeds: [res]}, "PS4EU Stats", true))
				.catch(err => messageHandler.handleError(message.channel, err, "PS4EU Stats"))	
		}
		
	}
	else if (message.content.substring(0,8).toLowerCase() == '!outfit '){
		let tags = message.content.substring(8).toLowerCase().split(" ");
		for(const x in tags){
			if(tags[x] != ""){
				if(tags[x].length > 4 && !badQuery(tags[x])){
					messageHandler.send(message.channel, tags[x]+" is longer than 4 letters, please enter a tag.", "PC tag too long");
					continue;
				}
				outfit.outfit(tags[x], 'ps2:v2', SQLclient)
					.then(res => messageHandler.send(message.channel, {content: deprecationNotice, embeds: [res[0]], components: res[1]}, "PC Outfit", true))
					.catch(err => messageHandler.handleError(message.channel, err, "PC Outfit"))
			}
		}
	}
	else if (message.content.substring(0,14).toLowerCase() == '!ps4us outfit '){
		let tags = message.content.substring(14).toLowerCase().split(" ");
		for(const x in tags){
			if(tags[x] != ""){
				if(tags[x].length > 4 && !badQuery(tags[x])){
					messageHandler.send(message.channel, tags[x]+" is longer than 4 letters, please enter a tag.", "PS4US tag too long");
					continue;
				}
				outfit.outfit(tags[x], 'ps2ps4us:v2', SQLclient)
					.then(res => messageHandler.send(message.channel, {content: deprecationNotice, embeds: [res[0]], components: res[1]}, "PS4US Outfit", true))
					.catch(err => messageHandler.handleError(message.channel, err, "PS4US Outfit"))
			}
		}
	}
	else if (message.content.substring(0,14).toLowerCase() == '!ps4eu outfit '){
		let tags = message.content.substring(14).toLowerCase().split(" ");
		for(const x in tags){
			if(tags[x] != ""){
				if(tags[x].length > 4 && !badQuery(tags[x])){
					messageHandler.send(message.channel, tags[x]+" is longer than 4 letters, please enter a tag.", "PS4EU tag too long");
					continue;
				}
				outfit.outfit(tags[x], 'ps2ps4eu:v2', SQLclient)
					.then(res => messageHandler.send(message.channel, {content: deprecationNotice, embeds: [res[0]], components: res[1]}, "PS4EU Outfit", true))
					.catch(err => messageHandler.handleError(message.channel, err, "PS4EU Outfit"))
			}
		}
	}
	else if (message.content.substring(0,8).toLowerCase() == '!online '){
		let tags = message.content.substring(8).toLowerCase().split(" ");
		for(const x in tags){
			if(tags[x] != ""){
				if(tags[x].length > 4 && !badQuery(tags[x])){
					messageHandler.send(message.channel, tags[x]+" is longer than 4 letters, please enter a tag.", "PC tag too long");
					continue;
				}
				online.online(tags[x], 'ps2:v2')
					.then(res => messageHandler.send(message.channel, {content: deprecationNotice, embeds: [res]}, "PC Online", true))
					.catch(err => messageHandler.handleError(message.channel, err, "PC Online"))
			}
		}
	}
	else if (message.content.substring(0,14).toLowerCase() == '!ps4us online '){
		let tags = message.content.substring(14).toLowerCase().split(" ");
		for(const x in tags){
			if(tags[x] != ""){
				if(tags[x].length > 4 && !badQuery(tags[x])){
					messageHandler.send(message.channel, tags[x]+" is longer than 4 letters, please enter a tag.", "PC tag too long");
					continue;
				}
				online.online(tags[x], 'ps2ps4us:v2')
					.then(res => messageHandler.send(message.channel, {content: deprecationNotice, embeds: [res]}, "PS4US Online", true))
					.catch(err => messageHandler.handleError(message.channel, err, "PS4US Online"))
			}
		}
	}
	else if (message.content.substring(0,14).toLowerCase() == '!ps4eu online '){
		let tags = message.content.substring(14).toLowerCase().split(" ");
		for(const x in tags){
			if(tags[x] != ""){
				if(tags[x].length > 4 && !badQuery(tags[x])){
					messageHandler.send(message.channel, tags[x]+" is longer than 4 letters, please enter a tag.", "PC tag too long");
					continue;
				}
				online.online(tags[x], 'ps2ps4eu:v2')
					.then(res => messageHandler.send(message.channel, {content: deprecationNotice, embeds: [res]}, "PS4EU Online", true))
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
					.then(res => messageHandler.send(message.channel, {content: deprecationNotice, embeds: [res]}, "Population", true))
					.catch(err => messageHandler.handleError(message.channel, err, "Population"))
			}
		}
	}
	else if (message.content.substring(0,5).toLowerCase() == '!asp '){
		let chars = message.content.substring(5).toLowerCase().split(" ");
		for(const x in chars){
			if(chars[x] != ""){
				asp.originalBR(chars[x], "ps2:v2")
					.then(res => messageHandler.send(message.channel, {content: deprecationNotice, embeds: [res]}, "PC ASP", true))
					.catch(err => messageHandler.handleError(message.channel, err, "PC ASP"))
			}
		}
	}
	else if (message.content.substring(0,11).toLowerCase() == '!ps4us asp '){
		let chars = message.content.substring(11).toLowerCase().split(" ");
		for(const x in chars){
			if(chars[x] != ""){
				asp.originalBR(chars[x], "ps2ps4us:v2")
					.then(res => messageHandler.send(message.channel, {content: deprecationNotice, embeds: [res]}, "PS4US ASP", true))
					.catch(err => messageHandler.handleError(message.channel, err, "PC ASP"))
			}
		}
	}
	else if (message.content.substring(0,11).toLowerCase() == '!ps4eu asp '){
		let chars = message.content.substring(11).toLowerCase().split(" ");
		for(const x in chars){
			if(chars[x] != ""){
				asp.originalBR(chars[x], "ps2ps4eu:v2")
					.then(res => messageHandler.send(message.channel, {content: deprecationNotice, embeds: [res]}, "PS4EU ASP", true))
					.catch(err => messageHandler.handleError(message.channel, err, "PC ASP"))
			}
		}
	}
	else if (message.content.substring(0,11).toLowerCase() == '!territory '){
		let servers = message.content.substring(11).toLowerCase().split(" ");
		for(const x in servers){
			if(servers[x] != ""){
				territory.territory(servers[x])
					.then(res => messageHandler.send(message.channel, {content: deprecationNotice, embeds: [res]}, "Territory", true))
					.catch(err => messageHandler.handleError(message.channel, err, "Territory"))
			}
		}
	}
	else if (message.content.substring(0,8).toLowerCase() == '!alerts '){
		let servers = message.content.substring(8).toLowerCase().split(" ");
		for(const x in servers){
			if(servers[x] != ""){
				alerts.activeAlerts(servers[x])
					.then(res => messageHandler.send(message.channel, {content: deprecationNotice, embeds: [res]}, "Alerts", true))
					.catch(err => messageHandler.handleError(message.channel, err, "Alerts"))
			}
		}
	}
	else if (message.content.toLowerCase() == '!status') {
		status.servers()
			.then(res => messageHandler.send(message.channel, {content: deprecationNotice, embeds: [res]}, "Server status", true))
			.catch(err => messageHandler.handleError(message.channel, err, "Server status"))
	}
	else if (message.content.substring(0,8).toLowerCase() == '!weapon ') {
		weapon.lookup(message.content.substring(8))
			.then(res => messageHandler.send(message.channel, {content: deprecationNotice, embeds: [res]}, "Weapon", true))
			.catch(err => messageHandler.handleError(message.channel, err, "Weapon"))
	}
	else if (message.content.substring(0,14).toLowerCase() == '!weaponsearch ') {
		weaponSearch.lookup(message.content.substring(14))
			.then(res => messageHandler.send(message.channel, {content: deprecationNotice, embeds: [res]}, "Weapon search", true))
			.catch(err => messageHandler.handleError(message.channel, err, "Weapon search"))
	}
	else if (message.content.substring(0,9).toLowerCase() == '!implant ') {
		implant.lookup(message.content.substring(9))
			.then(res => messageHandler.send(message.channel, {content: deprecationNotice, embeds: [res]}, "Implant", true))
			.catch(err => messageHandler.handleError(message.channel, err, "Implant"))
	}
	else if(messageLower.startsWith("!config")){
		let manageChannel = await checkPermissions(message.channel, message.author);
		if(!manageChannel){
			messageHandler.send(message.channel, "Managing subscriptions is only available to users with the Manage Channel permission", "Manage channel permissions error");
		}
		else if(!runningOnline){
			messageHandler.send(message.channel, "Subscription functionality currently disabled", "Running offline error");
		}
		else if (messageLower == '!config view'){
			subscriptionConfig.displayConfig(message.channel.id, SQLclient)
				.then(res => messageHandler.send(message.channel, {content: deprecationNotice, embeds: [res]}, "Display subscription config", true))
				.catch(err => messageHandler.handleError(message.channel, err, "Display subscription config"))
		}
		else if (message.content.toLowerCase() == '!config audit'){
			subscriptionConfig.audit(message.channel.id, SQLclient)
				.then(res => messageHandler.send(message.channel, res, "Config audit", true))
				.catch(err => messageHandler.handleError(message.channel, err, "Config audit"))
		}
		else if (message.content.substring(0,18).toLowerCase() == '!config continent '){
			const configOptions = message.content.toLowerCase().split(" ");
			subscriptionConfig.setContinent(configOptions[2], configOptions[3], message.channel.id, SQLclient)
				.then(res => messageHandler.send(message.channel, res, "Alert config", true))
				.catch(err => messageHandler.handleError(message.channel, err, "Alert config"))
		}
		else if (message.content.substring(0,19).toLowerCase() == '!config autodelete '){
			subscriptionConfig.setAutoDelete(message.content.substring(19), message.channel.id, SQLclient)
				.then(res => messageHandler.send(message.channel, res, "AutoDelete config", true))
				.catch(err => messageHandler.handleError(message.channel, err, "AutoDelete config"))
		}
	}
	else if(messageLower.startsWith("!subscribe") || messageLower.startsWith("!ps4us subscribe") || messageLower.startsWith("!ps4eu subscribe")){
		let manageChannel = await checkPermissions(message.channel, message.author);
		if(!manageChannel){
			messageHandler.send(message.channel, "Managing subscriptions is only available to users with the Manage Channel permission", "Manage channel permissions error");
		}
		else if(!runningOnline){
			messageHandler.send(message.channel, "Subscription functionality currently disabled", "Running offline error");
		}
		else if (message.content.substring(0,20).toLowerCase() == '!subscribe activity '){
			let outfits = message.content.substring(20).toLowerCase().split(" ");
			for(const x in outfits){
				if(outfits[x] != ""){
					subscription.subscribeActivity(SQLclient, message.channel.id, outfits[x], 'ps2:v2')
						.then(res => messageHandler.send(message.channel, res, "Subscribe activity", true))
						.catch(err => messageHandler.handleError(message.channel, err, "Subscribe activity"))
				}
			}
		}
		else if (message.content.substring(0,26).toLowerCase() == '!ps4us subscribe activity '){
			let outfits = message.content.substring(26).toLowerCase().split(" ");
			for(const x in outfits){
				if(outfits[x] != ""){
					subscription.subscribeActivity(SQLclient, message.channel.id, outfits[x], 'ps2ps4us:v2')
						.then(res => messageHandler.send(message.channel, res, "PS4US Subscribe activity", true))
						.catch(err => messageHandler.handleError(message.channel, err, "PS4US Subscribe activity"))
				}
			}
		}
		else if (message.content.substring(0,26).toLowerCase() == '!ps4eu subscribe activity '){
			let outfits = message.content.substring(26).toLowerCase().split(" ");
			for(const x in outfits){
				if(outfits[x] != ""){
					subscription.subscribeActivity(SQLclient, message.channel.id, outfits[x], 'ps2ps4eu:v2')
					.then(res => messageHandler.send(message.channel, res, "PS4EU Subscribe activity", true))
					.catch(err => messageHandler.handleError(message.channel, err, "PS4EU Subscribe Activity"))
				}
			}
		}
		else if (message.content.substring(0,20).toLowerCase() == '!subscribe captures '){
			let outfits = message.content.substring(20).toLowerCase().split(" ");
			for(const x in outfits){
				if(outfits[x] != ""){
					subscription.subscribeCaptures(SQLclient, message.channel.id, outfits[x], 'ps2:v2')
						.then(res => messageHandler.send(message.channel, res, "Subscribe captures", true))
						.catch(err => messageHandler.handleError(message.channel, err, "Subscribe captures"))
				}
			}
		}
		else if (message.content.substring(0,26).toLowerCase() == '!ps4us subscribe captures '){
			let outfits = message.content.substring(26).toLowerCase().split(" ");
			for(const x in outfits){
				if(outfits[x] != ""){
					subscription.subscribeCaptures(SQLclient, message.channel.id, outfits[x], 'ps2ps4us:v2')
						.then(res => messageHandler.send(message.channel, res, "PS4US Subscribe captures", true))
						.catch(err => messageHandler.handleError(message.channel, err, "PS4US Subscribe captures"))
				}
			}
		}
		else if (message.content.substring(0,26).toLowerCase() == '!ps4eu subscribe captures '){
			let outfits = message.content.substring(26).toLowerCase().split(" ");
			for(const x in outfits){
				if(outfits[x] != ""){
					subscription.subscribeCaptures(SQLclient, message.channel.id, outfits[x], 'ps2ps4eu:v2')
						.then(res => messageHandler.send(message.channel, res, "PS4EU Subscribe captures", true))
						.catch(err => messageHandler.handleError(message.channel, err, "PS4EU Subscribe captures"))
				}
			}
		}
		else if (message.content.substring(0,18).toLowerCase() == '!subscribe alerts '){
			let servers = message.content.substring(18).toLowerCase().split(" ");
			for(const x in servers){
				if(servers[x] != ""){
					subscription.subscribeAlert(SQLclient, message.channel.id, servers[x])
						.then(res => messageHandler.send(message.channel, res, "Subscribe alerts", true))
						.catch(err => messageHandler.handleError(message.channel, err, "Subscribe alerts"))
				}
			}
		}
		else if (message.content.substring(0,19).toLowerCase() == '!subscribe twitter '){
			let users = message.content.substring(19).toLowerCase().split(" ");
			for(const x in users){
				if(users[x] != ""){
					subscription.subscribeTwitter(SQLclient, message.channel.id, users[x])
						.then(res => messageHandler.send(message.channel, res, "Subscribe twitter", true))
						.catch(err => messageHandler.handleError(message.channel, err, "Subscribe twitter"))
				}
			}
		}
	}
	else if(messageLower.startsWith("!unsubscribe") || messageLower.startsWith("!ps4us unsubscribe") || messageLower.startsWith("!ps4eu unsubscribe")){
		let manageChannel = await checkPermissions(message.channel, message.author);
		if(!manageChannel){
			messageHandler.send(message.channel, "Managing subscriptions is only available to users with the Manage Channel permission", "Manage channel permissions error");
		}
		else if(!runningOnline){
			messageHandler.send(message.channel, "Subscription functionality currently disabled", "Running offline error");
		}
		else if (message.content.substring(0,22).toLowerCase() == '!unsubscribe activity '){
			let outfits = message.content.substring(22).toLowerCase().split(" ");
			for(const x in outfits){
				if(outfits[x] != ""){
					subscription.unsubscribeActivity(SQLclient, message.channel.id, outfits[x], 'ps2:v2')
						.then(res => messageHandler.send(message.channel, res, "Unsubscribe activity"))
						.catch(err => messageHandler.handleError(message.channel, err, "Unsubscribe activity"))
				}
			}
		}
		else if (message.content.substring(0,28).toLowerCase() == '!ps4us unsubscribe activity '){
			let outfits = message.content.substring(28).toLowerCase().split(" ");
			for(const x in outfits){
				if(outfits[x] != ""){
					subscription.unsubscribeActivity(SQLclient, message.channel.id, outfits[x], 'ps2ps4us:v2')
						.then(res => messageHandler.send(message.channel, res, "PS4US Unsubscribe activity"))
						.catch(err => messageHandler.handleError(message.channel, err, "PS4US Unsubscribe activity"))
				}
			}
		}
		else if (message.content.substring(0,28).toLowerCase() == '!ps4eu unsubscribe activity '){
			let outfits = message.content.substring(28).toLowerCase().split(" ");
			for(const x in outfits){
				if(outfits[x] != ""){
					subscription.unsubscribeActivity(SQLclient, message.channel.id, outfits[x], 'ps2ps4eu:v2')
						.then(res => messageHandler.send(message.channel, res, "PS4EU Unsubscribe activity"))
						.catch(err => messageHandler.handleError(message.channel, err, "PS4EU Unsubscribe activity"))
				}
			}
		}
		else if (message.content.substring(0,22).toLowerCase() == '!unsubscribe captures '){
			let outfits = message.content.substring(22).toLowerCase().split(" ");
			for(const x in outfits){
				if(outfits[x] != ""){
					subscription.unsubscribeCaptures(SQLclient, message.channel.id, outfits[x], 'ps2:v2')
						.then(res => messageHandler.send(message.channel, res, "Unsubscribe captures"))
						.catch(err => messageHandler.handleError(message.channel, err, "Unsubscribe captures"))
				}
			}
		}
		else if (message.content.substring(0,28).toLowerCase() == '!ps4us unsubscribe captures '){
			let outfits = message.content.substring(28).toLowerCase().split(" ");
			for(const x in outfits){
				if(outfits[x] != ""){
					subscription.unsubscribeCaptures(SQLclient, message.channel.id, outfits[x], 'ps2ps4us:v2')
						.then(res => messageHandler.send(message.channel, res, "PS4US Unsubscribe captures"))
						.catch(err => messageHandler.handleError(message.channel, err, "PS4US Unsubscribe captures"))
				}
			}
		}
		else if (message.content.substring(0,28).toLowerCase() == '!ps4eu unsubscribe captures '){
			let outfits = message.content.substring(28).toLowerCase().split(" ");
			for(const x in outfits){
				if(outfits[x] != ""){
					subscription.unsubscribeCaptures(SQLclient, message.channel.id, outfits[x], 'ps2ps4eu:v2')
						.then(res => messageHandler.send(message.channel, res, "PS4EU Unsubscribe captures"))
						.catch(err => messageHandler.handleError(message.channel, err, "PS4EU Unsubscribe captures"))
				}
			}
		}
		else if (message.content.substring(0,20).toLowerCase() == '!unsubscribe alerts '){
			let servers = message.content.substring(20).toLowerCase().split(" ");
			for(const x in servers){
				if(servers[x] != ""){
					subscription.unsubscribeAlert(SQLclient, message.channel.id, servers[x])
						.then(res => messageHandler.send(message.channel, res, "Unsubscribe alerts"))
						.catch(err => messageHandler.handleError(message.channel, err, "Unsubscribe alerts"))
				}
			}
		}
		else if (message.content.substring(0,21).toLowerCase() == '!unsubscribe twitter '){
			let users = message.content.substring(21).toLowerCase().split(" ");
			for(const x in users){
				if(users[x] != ""){
					subscription.unsubscribeTwitter(SQLclient, message.channel.id, users[x])
						.then(res => messageHandler.send(message.channel, res, "Unsubscribe twitter"))
						.catch(err => messageHandler.handleError(message.channel, err, "Unsubscribe twitter"))
				}
			}
		}
		else if (message.content.toLowerCase() == "!unsubscribe all"){
			subscription.unsubscribeAll(SQLclient, message.channel.id)
				.then(res => messageHandler.send(message.channel, res, "Unsubscribe all"))
				.catch(err => messageHandler.handleError(message.channel, err, "Unsubscribe all"))
		}
	}
});

// Log bot in
client.login(token);