//This file implements functions to create and update server dashboards, showing population, territory control, and active alerts

const {MessageEmbed} = require('discord.js');
const messageHandler = require('./messageHandler.js');
const {getPopulation} = require('./population.js');
const {alertInfo} = require('./alerts.js');
const {territoryInfo, continentBenefit} = require('./territory.js');
const {serverNames, serverIDs, servers, continents} = require('./utils.js');

const serverStatus = async function(serverID){
	let resEmbed = new MessageEmbed();
	resEmbed.setTitle(`${serverNames[serverID]} Dashboard`);

	// Population
	const population = await getPopulation(serverID); 
	const totalPop = population.vs + population.nc + population.tr + population.ns;
	const vsPc = Number.parseFloat((population.vs/totalPop)*100).toPrecision(3);
	const ncPc = Number.parseFloat((population.nc/totalPop)*100).toPrecision(3);
	const trPc = Number.parseFloat((population.tr/totalPop)*100).toPrecision(3);
	const nsPc = Number.parseFloat((population.ns/totalPop)*100).toPrecision(3);
	const populationField = `\
	\n<:VS:818766983918518272> **VS**: ${population.vs}  |  ${vsPc}%\
	\n<:NC:818767043138027580> **NC**: ${population.nc}  |  ${ncPc}%\
	\n<:TR:818988588049629256> **TR**: ${population.tr}  |  ${trPc}%\
	\n<:NS:819511690726866986> **NSO**: ${population.ns}  |  ${nsPc}%`
	resEmbed.addField(`Population - ${totalPop}`, populationField, true);

	// Territory
	const territory = await territoryInfo(serverID);
	let territoryField = "";

	for (const continent of continents){
		const totalTer = territory[continent].vs + territory[continent].nc + territory[continent].tr;
		if(totalTer == 0){
			continue; // This accounts for Esamir being disabled on PS4
		}
		const vsPc = Number.parseFloat((territory[continent].vs/totalTer)*100).toPrecision(3);
		const ncPc = Number.parseFloat((territory[continent].nc/totalTer)*100).toPrecision(3);
		const trPc = Number.parseFloat((territory[continent].tr/totalTer)*100).toPrecision(3);
		if(vsPc == 100){
			territoryField += `**${continent}** <:VS:818766983918518272>\nOwned by the VS: ${continentBenefit(continent)}\n\n`;
		}
		else if(ncPc == 100){
			territoryField += `**${continent}** <:NC:818767043138027580>\nOwned by the NC: ${continentBenefit(continent)}\n\n`;
		}
		else if(trPc == 100){
			territoryField += `**${continent}** <:TR:818988588049629256>\nOwned by the TR: ${continentBenefit(continent)}\n\n`;
		}
		else{
			territoryField += `**${continent}**\
			\n<:VS:818766983918518272> **VS**: ${territory[continent].vs}  |  ${vsPc}%\
			\n<:NC:818767043138027580> **NC**: ${territory[continent].nc}  |  ${ncPc}%\
			\n<:TR:818988588049629256> **TR**: ${territory[continent].tr}  |  ${trPc}%\n\n`
		}
	}

	resEmbed.addField("Territory", territoryField, true);

	// Alerts
	try{
		const alerts = await alertInfo(serverID);
		let alertField = "";
		for(const alert of alerts){
			alertField += `**[${alert.name}](https://ps2alerts.com/alert/${alert.instanceId}?utm_source=auraxis-bot&utm_medium=discord&utm_campaign=partners)**\
			\n${alert.description}\nStarted at <t:${alert.timeStart}:t>\nEnds <t:${alert.timeEnd}:R>\n\n`;
		}
		resEmbed.addField("Alerts", alertField, true);
	}
	catch(err){
		resEmbed.addField("Alerts", "No active alerts", true);
	}
	resEmbed.setTimestamp();
	resEmbed.setFooter("Updated every 5 minutes • Population from Fisu • Alerts from PS2Alerts");
	resEmbed.setColor("BLUE");

	return resEmbed;
}

const editMessage = async function(channelID, messageID, newDash, pgClient, discordClient){
	try{
		const channel = await discordClient.channels.fetch(channelID);
		const message = await channel.messages.fetch(messageID);
		await message.edit({embeds: [newDash]});
	}
	catch(err){
		if(err?.code == 10008 || err?.code == 10003){ //Unknown message or channel
			console.log("Deleted message from dashboard table");
			pgClient.query("DELETE FROM dashboard WHERE messageid = $1;", [messageID]);
		}
		else{
			console.log(err);
		}
	}
}

module.exports = {
	create: async function(channel, serverName, pgClient){
		let resEmbed = await serverStatus(serverIDs[serverName]);
		let messageID = await messageHandler.send(channel, {embeds: [resEmbed]}, "Create dashboard", true);
		await pgClient.query("INSERT INTO dashboard (concatkey, channel, messageid, world) VALUES ($1, $2, $3, $4)\
		ON CONFLICT(concatkey) DO UPDATE SET messageid = $3;",
		[`${channel.id}-${serverName}`, channel.id, messageID, serverName]);
		return "Dashboard successfully created.  It will be automatically updated every 5 minutes.";
	},

	update: async function(pgClient, discordClient){
		for(const serverName of servers){
			try{
				const status = await serverStatus(serverIDs[serverName]);
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
	}
}