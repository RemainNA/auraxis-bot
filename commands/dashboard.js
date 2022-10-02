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
const {serverNames, serverIDs, servers, continents, continentNames, faction, localeNumber} = require('./utils.js');

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
	\n<:VS:818766983918518272> **VS**: ${pop.global.vs}  |  ${vsPc}%\
	\n<:NC:818767043138027580> **NC**: ${pop.global.nc}  |  ${ncPc}%\
	\n<:TR:818988588049629256> **TR**: ${pop.global.tr}  |  ${trPc}%\
	\n:question: **?**: ${pop.global.unknown}  |  ${nsPc}%`

	resEmbed.addField(`Population - ${localeNumber(pop.global.all, "en-US")}`, populationField, true);

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
			territoryField += `**${continent}** ${owningFaction.decal}\nLocked <t:${timestamp}:t> (<t:${timestamp}:R>)\n${continentBenefit(continent)}\n\n`;
		}
		else if (openContinents < 5 && territory[continent].unstable){
			territoryField += `**${continent}**  <:Unstable:1000661319663497217>\
			\nUnlocked <t:${timestamp}:t> (<t:${timestamp}:R>)\
			\n*Currently unstable*\
			\n<:VS:818766983918518272> **VS**: ${territory[continent].vs}  |  ${vsPc}%\
			\n<:NC:818767043138027580> **NC**: ${territory[continent].nc}  |  ${ncPc}%\
			\n<:TR:818988588049629256> **TR**: ${territory[continent].tr}  |  ${trPc}%\n\n`;
		}
		else if (openContinents < 5){
			territoryField += `**${continent}**\
			\nUnlocked <t:${timestamp}:t> (<t:${timestamp}:R>)\
			\n<:VS:818766983918518272> **VS**: ${territory[continent].vs}  |  ${vsPc}%\
			\n<:NC:818767043138027580> **NC**: ${territory[continent].nc}  |  ${ncPc}%\
			\n<:TR:818988588049629256> **TR**: ${territory[continent].tr}  |  ${trPc}%\n\n`;
		}
		else{
			// Remove one of the timestamps when all continents open to use fewer characters
			territoryField += `**${continent}**\
			\nUnlocked <t:${timestamp}:R>\
			\n<:VS:818766983918518272> **VS**: ${territory[continent].vs}  |  ${vsPc}%\
			\n<:NC:818767043138027580> **NC**: ${territory[continent].nc}  |  ${ncPc}%\
			\n<:TR:818988588049629256> **TR**: ${territory[continent].tr}  |  ${trPc}%\n\n`
		}
	}

	resEmbed.addField("Territory Control", territoryField, true);

	// Alerts
	try{
		const alerts = await alertInfo(serverID);
		let alertField = "";
		for(const alert of alerts){
			alertField += `**[${alert.name}](https://ps2alerts.com/alert/${alert.instanceId}?utm_source=auraxis-bot&utm_medium=discord&utm_campaign=partners)**\
			\n${alert.description}\nStarted at <t:${alert.timeStart}:t>\nEnds <t:${alert.timeEnd}:R>\nPopulation: ${popLevels[alert.bracket]}\n\n`;
		}
		resEmbed.addField("Alerts", alertField, true);
	}
	catch(err){
		resEmbed.addField("Alerts", "No active alerts", true);
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
		if(platform == 'ps2:v2'){
			resEmbed.setURL(`http://ps2.fisu.pw/outfit/?name=${oInfo.alias}`);
		}
		else if(platform == 'ps2ps4us:v2'){
			resEmbed.setURL(`http://ps4us.ps2.fisu.pw/outfit/?name=${oInfo.alias}`);
		}
		else if(platform == 'ps2ps4eu:v2'){
			resEmbed.setURL(`http://ps4eu.ps2.fisu.pw/outfit/?name=${oInfo.alias}`);
		}
	}
	else{
		resEmbed.setTitle(oInfo.name);
	}
	resEmbed.setThumbnail(`https://www.outfit-tracker.com/outfit-logo/${oInfo.outfitID}.png`);
	resEmbed.setDescription(`${oInfo.onlineCount}/${oInfo.memberCount} online | ${serverNames[oInfo.world]}`);
	resEmbed.setColor(faction(oInfo.faction).color);

	if(oInfo.onlineCount === -1){
		resEmbed.addField("Online member count unavailable", "-");
		resEmbed.setDescription(`?/${oInfo.memberCount} online | ${serverNames[oInfo.world]}`);
	}
	else{
		for(let i = 0; i < 8; i++){
			if(oInfo.onlineMembers[i].length > 0){
				if(totalLength(oInfo.onlineMembers[i]) <= 1024){
					resEmbed.addField(oInfo.rankNames[i]+" ("+oInfo.onlineMembers[i].length+")", `${oInfo.onlineMembers[i]}`.replace(/,/g, '\n'), true);
				}
				else{
					resEmbed.addField(oInfo.rankNames[i]+" ("+oInfo.onlineMembers[i].length+")", "Too many to display", true);
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
		resEmbed.addField('Bases owned', `${ownedNames}`.replace(/,/g, '\n'));
		resEmbed.addField('<:Auraxium:818766792376713249>', `+${auraxium/5}/min`, true);
		resEmbed.addField('<:Synthium:818766858865475584>', `+${synthium/5}/min`, true);
		resEmbed.addField('<:Polystellarite:818766888238448661>', `+${polystellarite/5}/min`, true);
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