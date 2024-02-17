/**
 * This file implements functions to create and update server dashboards, showing population, territory control, and active alerts
 * @module dashboard
 */
/**
 * @typedef {import('pg').Client} pg.Client
 * @typedef {import('discord.js').Client} discord.Client
 * @typedef {import('discord.js').MessageEmbed} discord.MessageEmbed
 * @typedef {import('discord.js').TextBasedChannel} discord.Channel
*/

const {MessageEmbed} = require('discord.js');
const messageHandler = require('./messageHandler.js');
const {getPopulation} = require('./population.js');
const {alertInfo, popLevels} = require('./alerts.js');
const {territoryInfo, continentBenefit} = require('./territory.js');
const {onlineInfo, totalLength} = require('./online.js');
const {ownedBases, centralBases} = require('./outfit.js');
const bases = require('./static/bases.json');
const {serverNames, serverIDs, servers, continents, continentNames, faction, localeNumber, outfitLink, discordEmoji} = require('./utils.js');

/**
 * Creates a server dashboard for the given serverID that keeps track of the population, territory control, and active alerts
 * @param {number} serverID - The server ID 
 * @param {pg.Client} pgClient - The postgres client 
 * @returns the server dashboard embed
 */
const serverStatus = async function(serverID, pgClient){
	let resEmbed = new MessageEmbed();
	resEmbed.setTitle(`${serverNames[serverID]} Dashboard`);

	// Population
	const population = await getPopulation(); 
	const pop = population[serverID];
	const vsPc = ((pop.global.vs/(pop.global.all||1))*100).toPrecision(3);
	const ncPc = ((pop.global.nc/(pop.global.all||1))*100).toPrecision(3);
	const trPc = ((pop.global.tr/(pop.global.all||1))*100).toPrecision(3);
	const nsPc = ((pop.global.unknown/(pop.global.all||1))*100).toPrecision(3);
	let populationField = `\
	\n${discordEmoji["VS"]} **VS**: ${pop.global.vs}  |  ${vsPc}%\
	\n${discordEmoji["NC"]} **NC**: ${pop.global.nc}  |  ${ncPc}%\
	\n${discordEmoji["TR"]} **TR**: ${pop.global.tr}  |  ${trPc}%\
	\n:question: **?**: ${pop.global.unknown}  |  ${nsPc}%`

	resEmbed.addFields({name: `Population - ${localeNumber(pop.global.all, "en-US")}`, value: populationField, inline: true});

	// Territory
	const territory = await territoryInfo(serverID);
	const recordedStatus = await pgClient.query("SELECT * FROM openContinents WHERE world = $1;", [serverNames[serverID].toLowerCase()]);
	let territoryField = "";
	let openContinents = 0;
	for (const continent of continents){
		if(territory[continent].locked == -1){
			openContinents += 1;
		}
	}

	for (const continent of continents){
		const totalTer = territory[continent].vs + territory[continent].nc + territory[continent].tr;
		if(totalTer == 0){
			continue; // This accounts for Esamir being disabled on PS4
		}
		const timestamp = Date.parse(recordedStatus.rows[0][`${continent.toLowerCase()}change`])/1000;
		const vsPc = ((territory[continent].vs/totalTer)*100).toPrecision(3);
		const ncPc = ((territory[continent].nc/totalTer)*100).toPrecision(3);
		const trPc = ((territory[continent].tr/totalTer)*100).toPrecision(3);
		const owningFaction = faction(territory[continent].locked);
		if(territory[continent].locked != -1){
			territoryField += `**${continent}** ${owningFaction.decal}\nLocked <t:${timestamp}:t> (<t:${timestamp}:R>)\n\n`;
		}
		else if (openContinents < 5 && territory[continent].unstable){
			territoryField += `**${continent}**  ${discordEmoji["Unstable"]}\
			\nUnlocked <t:${timestamp}:t> (<t:${timestamp}:R>)\
			\n*Currently unstable*\
			\n${discordEmoji["VS"]} **VS**: ${territory[continent].vs}  |  ${vsPc}%\
			\n${discordEmoji["NC"]} **NC**: ${territory[continent].nc}  |  ${ncPc}%\
			\n${discordEmoji["TR"]} **TR**: ${territory[continent].tr}  |  ${trPc}%\n\n`;
		}
		else if (openContinents < 5){
			territoryField += `**${continent}**\
			\nUnlocked <t:${timestamp}:t> (<t:${timestamp}:R>)\
			\n${discordEmoji["VS"]} **VS**: ${territory[continent].vs}  |  ${vsPc}%\
			\n${discordEmoji["NC"]} **NC**: ${territory[continent].nc}  |  ${ncPc}%\
			\n${discordEmoji["TR"]} **TR**: ${territory[continent].tr}  |  ${trPc}%\n\n`;
		}
		else{
			// Remove one of the timestamps when all continents open to use fewer characters
			territoryField += `**${continent}**\
			\nUnlocked <t:${timestamp}:R>\
			\n${discordEmoji["VS"]} **VS**: ${territory[continent].vs}  |  ${vsPc}%\
			\n${discordEmoji["NC"]} **NC**: ${territory[continent].nc}  |  ${ncPc}%\
			\n${discordEmoji["TR"]} **TR**: ${territory[continent].tr}  |  ${trPc}%\n\n`
		}
	}

	resEmbed.addFields({name: "Territory Control", value: territoryField, inline: true});

	// Alerts
	try{
		const alerts = await alertInfo(serverID);
		let alertField = "";
		for(const alert of alerts){
			alertField += `**[${alert.name}](https://ps2alerts.com/alert/${alert.instanceId}?utm_source=auraxis-bot&utm_medium=discord&utm_campaign=partners)**\
			\n${alert.description}\nStarted at <t:${alert.timeStart}:t>\nEnds <t:${alert.timeEnd}:R>\nPopulation: ${popLevels[alert.bracket]}\n\n`;
		}
		resEmbed.addFields({name: "Alerts", value: alertField, inline: true});
	}
	catch(err){
		resEmbed.addFields({name: "Alerts", value: "No active alerts", inline: true});
	}
	resEmbed.setTimestamp();
	resEmbed.setFooter({text: "Updated every 5 minutes • Population from wt.honu.pw • Alerts from PS2Alerts"});
	resEmbed.setColor("BLUE");

	return resEmbed;
}

/**
 * Create a outfit dashboard that shows the bases owned by the outfit and current members online
 * @param {string} outfitID - The outfit ID
 * @param {string} platform - The platform
 * @param {pg.Client} pgClient - The postgres client
 * @returns the outfit dashboard embed
 */
const outfitStatus = async function(outfitID, platform, pgClient){
	const oInfo = await onlineInfo("", platform, outfitID);
	let resEmbed = new MessageEmbed();
	if(oInfo.alias != ""){
		resEmbed.setTitle(`[${oInfo.alias}] ${oInfo.name}`);
		resEmbed.setURL(outfitLink(oInfo.alias, oInfo.outfitID, platform));
	}
	else{
		resEmbed.setTitle(oInfo.name);
		if(platform == 'ps2:v2'){
			resEmbed.setURL(outfitLink(oInfo.alias, oInfo.outfitID, platform));
		}
	}
	resEmbed.setThumbnail(`https://www.outfit-tracker.com/outfit-logo/${oInfo.outfitID}.png`);
	resEmbed.setDescription(`${oInfo.onlineCount}/${oInfo.memberCount} online | ${serverNames[oInfo.world]}`);
	resEmbed.setColor(faction(oInfo.faction).color);

	if(oInfo.onlineCount === -1){
		resEmbed.addFields({name: "Online member count unavailable", value: "-"});
		resEmbed.setDescription(`?/${oInfo.memberCount} online | ${serverNames[oInfo.world]}`);
	}
	else{
		for(let i = 0; i < 8; i++){
			if(oInfo.onlineMembers[i].length > 0){
				if(totalLength(oInfo.onlineMembers[i]) <= 1024){
					resEmbed.addFields({name: oInfo.rankNames[i]+" ("+oInfo.onlineMembers[i].length+")", value: `${oInfo.onlineMembers[i]}`.replace(/,/g, '\n'), inline: true});
				}
				else{
					resEmbed.addFields({name: oInfo.rankNames[i]+" ("+oInfo.onlineMembers[i].length+")", value: "Too many to display", inline: true});
				}
			}
		}
	}

	const oBases = await ownedBases(outfitID, oInfo.world, pgClient);
	let auraxium = 0;
	let synthium = 0;
	let polystellarite = 0;
	let ownedNames = [];
	for(const base of oBases){
		if(base.facility in bases){
			const baseInfo = bases[base.facility];
			ownedNames.push(baseInfo.name);
			if(centralBases.includes(base.facility)){
				polystellarite += 2;
			}
			else if(baseInfo.type == "Small Outpost"){
				auraxium += 5;
			}
			else if(baseInfo.type == "Large Outpost"){
				auraxium += 25;
			}
			else if(baseInfo.type == "Construction Outpost"){
				synthium += 3;
			}
			else if(["Bio Lab", "Amp Station", "Tech Plant", "Containment Site"].includes(baseInfo.type)){
				synthium += 8;
			}
		}
	}
	if((auraxium + synthium + polystellarite) > 0){ //Recognized bases are owned
		resEmbed.addFields(
			{name: "Bases owned", value: `${ownedNames}`.replace(/,/g, '\n')},
			{name: `${discordEmoji["Auraxium"]}`, value: `+${auraxium/5}/min`, inline: true},
			{name: `${discordEmoji["Synthium"]}`, value: `+${synthium/5}/min`, inline: true},
			{name: `${discordEmoji["Polystellarite"]}`, value: `+${polystellarite/5}/min`, inline: true}
		)
	}

	resEmbed.setTimestamp();
	resEmbed.setFooter({text: "Updated every 5 minutes • Outfit decals provided by outfit-tracker.com"});

	return resEmbed;
}

/**
 * Edit dashboard embeds with new data
 * @param {string} channelID - The channel ID where the current dashboard is
 * @param {string} messageID - The message ID of the current dashboard
 * @param {discord.MessageEmbed} newDash - The new dashboard
 * @param {pg.Client} pgClient = The postgres client
 * @param {discord.Client} discordClient - The discord client 
 */
const editMessage = async function(channelID, messageID, newDash, pgClient, discordClient){
	try{
		const channel = await discordClient.channels.fetch(channelID);
		const message = await channel.messages.fetch(messageID);
		await message.edit({embeds: [newDash]});
	}
	catch(err){
		if(err?.code == 10008 || err?.code == 10003 || err?.code == 50001){ //Unknown message/channel or missing access
			console.log("Deleted message from dashboard table");
			pgClient.query("DELETE FROM dashboard WHERE messageid = $1;", [messageID]);
			pgClient.query("DELETE FROM outfitDashboard WHERE messageid = $1;", [messageID]);
		}
		else{
			console.log('Error editing dashboard');
			console.log(err);
		}
	}
}

module.exports = {
	/**
	 * Creates a dashboard for a server
	 * @param {discord.Channel} channel - The channel to send the message to
	 * @param {string} serverName - The server name
	 * @param {pg.Client} pgClient - The postgres client 
	 * @returns the status of the creation of the dashboard
	 * @throws if bot has insufficient permissions to post messages
	 */
	createServer: async function(channel, serverName, pgClient){
		const resEmbed = await serverStatus(serverIDs[serverName], pgClient);
		const messageID = await messageHandler.send(channel, {embeds: [resEmbed]}, "Create server dashboard", true);
		if(messageID == -1){
			throw "Error creating dashboard, please check that the bot has permission to post in this channel.";
		}
		await pgClient.query("INSERT INTO dashboard (concatkey, channel, messageid, world) VALUES ($1, $2, $3, $4)\
		ON CONFLICT(concatkey) DO UPDATE SET messageid = $3;",
		[`${channel.id}-${serverName}`, channel.id, messageID, serverName]);
		return "Dashboard successfully created.  It will be automatically updated every 5 minutes.";
	},

	/**
	 * Creates a dashboard for an outfit
	 * @param {discord.Channel} channel - The channel to send the message to
	 * @param {string} oTag - The tag of the outfit
	 * @param {string} platform - The platform of the outfit
	 * @param {pg.Client} pgClient - The postgres client
	 * @returns the status of the creation of the dashboard
	 * @throws if bot has insufficient permissions to post messages
	 */
	createOutfit: async function(channel, oTag, platform, pgClient){
		const oInfo = await onlineInfo(oTag, platform);
		const resEmbed = await outfitStatus(oInfo.outfitID, platform, pgClient);
		const messageID = await messageHandler.send(channel, {embeds: [resEmbed]}, "Create outfit dashboard", true);
		if(messageID == -1){
			throw "Error creating dashboard, please check that the bot has permission to post in this channel.";
		}
		await pgClient.query("INSERT INTO outfitDashboard (concatkey, channel, messageid, outfitID, platform) VALUES ($1, $2, $3, $4, $5)\
		ON CONFLICT(concatkey) DO UPDATE SET messageid = $3;",
		[`${channel.id}-${oInfo.outfitID}`, channel.id, messageID, oInfo.outfitID, platform]);
		return "Dashboard successfully created.  It will be automatically updated every 5 minutes.";
	},

	/**
	 * Updates current dashboards in discord channels
	 * @param {pg.Client} pgClient - The postgres client
	 * @param {discord.Client} discordClient - The discord client 
	 */
	update: async function(pgClient, discordClient){
		for(const serverName of servers){
			try{
				const status = await serverStatus(serverIDs[serverName], pgClient);
				const channels = await pgClient.query('SELECT * FROM dashboard WHERE world = $1;', [serverName]);
				for(const row of channels.rows){
					await editMessage(row.channel, row.messageid, status, pgClient, discordClient);
				}
			}
			catch(err){
				console.log(`Error updating ${serverName} dashboard`);
				console.log(err);
			}
		}
		try{
			const outfits = await pgClient.query('SELECT DISTINCT outfitID, platform FROM outfitDashboard;');
			for(const row of outfits.rows){
				try{
					const status = await outfitStatus(row.outfitid, row.platform, pgClient);
					const channels = await pgClient.query('SELECT * FROM outfitdashboard WHERE outfitid = $1 AND platform = $2', [row.outfitid, row.platform]);
					for(const channelRow of channels.rows){
						await editMessage(channelRow.channel, channelRow.messageid, status, pgClient, discordClient);
					}
				}
				catch(err){
					console.log(`Error updating outfit dashboard ${row.platform}: ${row.outfitid}`);
					console.log(err);
					if(err == " not found"){
						await pgClient.query("DELETE FROM outfitDashboard WHERE outfitID = $1;", [row.outfitid]);
						console.log(`Deleted ${row.outfitid} from table`);
					}
				}
			}
		}
		catch(err){
			console.log(`Error pulling outfit dashboards`);
			console.log(err);
		}
	}
}