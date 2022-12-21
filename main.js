/**
 * This file implements the main event listener of the bot, which picks up messages, parses them for commands, and calls the appropriate functions.
 * @module main
 */

// Load environment variables
 require('dotenv').config();

// Import the discord.js module
const Discord = require('discord.js');

//PostgreSQL connection
const pg = require('pg');

// Internationalization
const i18n = require('i18n');
i18n.configure({
	directory: './locales/responses',
	defaultLocale: 'en-US',
	retryInDefaultLocale: true,
	updateFiles: false,
	objectNotation: true,
	missingKeyFn: function (locale, value) {
		return value
	  },
})

// commands
const char = require('./character.js');
const stats = require('./stats.js');
const online = require('./online.js');
const listener = require('./unifiedWSListener.js');
const subscriptionConfig = require('./subscriptionConfig.js');
const subscription = require('./subscriptions.js');
const population = require('./population.js');
const asp = require('./asp.js');
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
const outfitMaintenance = require('./outfitMaintenance.js');
const character = require('./character.js');

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

let SQLclient = undefined;

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
			twitterListener.init();
			twitterListener.connect(SQLclient, client.channels);
			twitterListener.latestTweet(SQLclient, client.channels);
		}
		/** The bot cycles every 24 hours, so these will be called every 24 hours */
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

	client.user.setActivity('/help');
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
/implant [implant name]\n\
/(un)subscribe alerts [server]\n\
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

client.on('interactionCreate', async interaction => {
	if(interaction.isCommand()){
		const options = interaction.options;
		try{
			let res = {};
			let errorList = [];
			switch(interaction.commandName){
			case 'ping':
				await interaction.reply(`Bot's ping to Discord is ${client.ws.ping}ms`);
				break;

			case 'help':
				const locale = interaction.locale;
				let helpEmbed = new Discord.MessageEmbed();
				helpEmbed.setTitle("Auraxis bot");
				helpEmbed.setColor("BLUE");
				helpEmbed.addField(i18n.__({phrase: "Commands", locale: locale}), listOfCommands);
				const links = `\
				\n[${i18n.__({phrase: "GitHub page & FAQ", locale: locale})}](https://github.com/RemainNA/auraxis-bot)\
				\n[${i18n.__({phrase: "Support server", locale: locale})}](https://discord.gg/Kf5P6Ut)\
				\n[${i18n.__({phrase: "Invite bot", locale: locale})}](https://discord.com/api/oauth2/authorize?client_id=437756856774033408&permissions=1330192&scope=bot%20applications.commands)\
				\n[${i18n.__({phrase: "Donate on Ko-fi", locale: locale})}](https://ko-fi.com/remainna)\
				\n[${i18n.__({phrase: "Translate on Crowdin", locale: locale})}](https://crowdin.com/project/auraxis-bot)`
				helpEmbed.addField(i18n.__({phrase: "Links", locale: locale}), links);
				helpEmbed.setFooter({text: i18n.__({phrase: "<> = Optional, [] = Required", locale: locale})});
				await interaction.reply({embeds: [helpEmbed]});
				break;

			case 'character':
				let firstCharacter = true;
				const characterNames = options.getString('name').toLowerCase().replace(/\s\s+/g, ' ').split(' ');
				if(characterNames.length > 10){
					await interaction.reply({
						content: i18n.__({phrase: "This commands supports a maximum of 10 characters per query", locale: interaction.locale}),
						ephemeral: true
					});
					break;
				}
				await interaction.deferReply();
				const characterLookups = await Promise.allSettled(Array.from(characterNames, x => 
					char.character(x, options.getString('platform') || 'ps2:v2', interaction.locale)));
				for(const res of characterLookups){
					let toSend = {};
					if(res.status == "rejected"){
						if(typeof(res.reason) == 'string'){
							toSend = res.reason;
						}
						else{
							toSend = i18n.__({phrase: "Error occurred when handling command", locale: interaction.locale});
							console.log(`Character error ${interaction.locale}`);
							console.log(res.reason);
						}
					}
					else{
						toSend = {embeds: [res.value[0]], components: res.value[1]};
					}
					if(firstCharacter){
						await interaction.editReply(toSend);
						firstCharacter = false;
					}
					else{
						await interaction.followUp(toSend);
					}
				}
				break;			

			case 'stats':
				await interaction.deferReply(); //Give the bot time to look up the results
				if(interaction.options.get('weapon')){
					res = await stats.lookup(options.getString('name').toLowerCase(), options.getString('weapon').toLowerCase(), options.getString('platform') || 'ps2:v2', interaction.locale);
					await interaction.editReply({embeds:[res]});
				}
				else{ //character lookup
					res = await char.character(interaction.options.getString('name').toLowerCase(), interaction.options.getString('platform') || 'ps2:v2', interaction.locale);
					await interaction.editReply({embeds:[res[0]], components: res[1]});
				}
				break;

			case 'outfit':
				let firstOutfit = true;
				const outfitTags = options.getString('tag').toLowerCase().replace(/\s\s+/g, ' ').split(' ');
				if(outfitTags.length > 10){
					await interaction.reply({
						content: i18n.__({phrase: "This commands supports a maximum of 10 outfits per query", locale: interaction.locale}),
						ephemeral: true
					});
					break;
				}
				await interaction.deferReply();
				const outfitLookups = await Promise.allSettled(Array.from(outfitTags, x => 
					outfit.outfit(x, options.getString('platform') || 'ps2:v2', SQLclient, null, interaction.locale)));
				for(const res of outfitLookups){
					let toSend = "";
					if(res.status == "rejected"){
						if(typeof(res.reason) == 'string'){
							toSend = res.reason;
						}
						else{
							toSend = i18n.__({phrase: "Error occurred when handling command", locale: interaction.locale});
							console.log(`Outfit error ${interaction.locale}`);
							console.log(res.reason);
						}
					}
					else{
						toSend = {embeds: [res.value[0]], components: res.value[1]};
					}
					if(firstOutfit){
						await interaction.editReply(toSend);
						firstOutfit = false;
					}
					else{
						await interaction.followUp(toSend);
					}
				}
				break;

			case 'online':
				await online.execute(interaction, interaction.locale);
				break;

			case 'config':
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

				case 'alert-types':
					res = await subscriptionConfig.setAlertTypes(options.getString("type"), options.getBoolean("setting"), interaction.channelId, SQLclient);
					await interaction.editReply(res);
					break;
				
				default:
					interaction.editReply("Unknown command error");
				}
				
				break;

			case 'subscribe':
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
				if(interaction.replied){
					await subscription.permissionCheck(interaction, client.user.id, interaction.locale);
				}
				
				break;

			case 'unsubscribe':
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
				res = await territory.territory(options.getString("server"), SQLclient, interaction.locale);
				await interaction.editReply({embeds: [res]});
				break;

			case 'alerts':
				await interaction.deferReply();
				res = await alerts.activeAlerts(options.getString("server"));
				await interaction.editReply({embeds: [res]});
				break;

			case 'status':
				await interaction.deferReply();
				res = await status.servers(interaction.locale);
				await interaction.editReply({embeds: [res]});
				break;

			case 'weapon':
				res = await weapon.lookup(options.getString("query"), interaction.locale);
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
				res = await asp.originalBR(options.getString('name').toLowerCase(), options.getString('platform') || 'ps2:v2', interaction.locale);
				await interaction.editReply({embeds: [res]});
				break;

			case 'dashboard':
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
				await interaction.deferReply();
				switch(options.getSubcommand()){
					case 'server':
						res = await trackers.create(options.getString('type'), options.getString('server'), interaction.guild, client, SQLclient);
						await interaction.editReply(res);
						break;
	
					case 'outfit':
						res = await trackers.createOutfit(options.getString('tag').toLowerCase(), options.getString('platform') || 'ps2:v2', options.getBoolean('show-faction'), interaction.guild, client, SQLclient);
						await interaction.editReply(res);
						break;
	
					default: 
						interaction.editReply("Unknown command error");
					}
				
				break;

			case 'auraxiums':
				await interaction.deferReply();
				res = await auraxiums.medals(options.getString("name"), options.getString("platform") || "ps2:v2", false, interaction.locale);
				await interaction.editReply({embeds: [res[0]], components: res[1]});
				break;

			case 'leaderboard':
				await interaction.deferReply();
				res = await leaderboard.lookup(options.getString("type"), options.getString("period"), options.getString("server"), 20, interaction.locale);
				await interaction.editReply({embeds: [res]});
				break;

			case 'directives':
				await interaction.deferReply();
				res = await directives.directives(options.getString("name"), options.getString("platform") || "ps2:v2");
				await interaction.editReply({embeds: [res[0]], components: res[1]});
				break;
			
			case 'vehicle':
				await interaction.deferReply();
				res = await vehicles.vehicle(options.getString("name"), options.getString("vehicle"), options.getString("platform") || "ps2:v2", interaction.locale);
				await interaction.editReply({embeds: [res]});
				break;
			
			}
			
		}
		catch(err){
			try{
				if(typeof(err) !== 'string'){
					console.log(`Error in ${interaction.commandName} ${interaction.locale}`);
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
						await interaction.editReply(i18n.__({phrase: "Error occurred when handling command", locale: interaction.locale}));
					}
					else{
						await interaction.reply(i18n.__({phrase: "Error occurred when handling command", locale: interaction.locale}));
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
			catch(err){
				console.log("Error handling slash command error");
				console.log(err);
			}
		}
	}
	else if(interaction.isButton()){
		try{
			const options = interaction.customId.split('%');
			switch(options[0]){
				case 'auraxiums':
					await interaction.deferReply({ephemeral: true});
					const aurax = await auraxiums.medals(options[1], options[2], true, interaction.locale);
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
					const outfitRes = await outfit.outfit("", options[2], SQLclient, options[1], interaction.locale);
					await interaction.editReply({embeds: [outfitRes[0]], components: outfitRes[1]});
					break;

				case 'online':
					await interaction.deferReply({ephemeral: false});
					const onlineRes = await online.online("", options[2], options[1], interaction.locale);
					await interaction.editReply({embeds: [onlineRes]});
					break;
			}
		}
		catch(err){
			try{
				if(typeof(err) !== 'string'){
					console.log(`Error in ${interaction.customId} button ${interaction.locale}`);
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
						await interaction.editReply(i18n.__({phrase: "Error occurred when handling command", locale: interaction.locale}));
					}
					else{
						await interaction.reply({content: i18n.__({phrase: "Error occurred when handling command", locale: interaction.locale}), ephemeral: true});
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
			catch(err){
				console.log("Error handling button error");
				console.log(err);
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

// Log bot in
client.login(token);