/**
 * This file defines functions to update previously sent alert notifications
 * @module alertMaintenance
 */
/**
 * @typedef {import('discord.js').Client} discord.Client
 * @typedef {import('pg').Client} pg.Client
 */
import { ChannelType, EmbedBuilder, PermissionsBitField } from 'discord.js';
import { fetch }  from 'undici';
import alerts from './static/alerts.json' assert {type: 'json'};
import {serverNames} from './utils.js';
import {popLevels} from './commands/alerts.js';
/**
 * faction winners
 */
const winnerFaction = {
	1: "<:VS:818766983918518272> VS win",
	2: "<:NC:818767043138027580> NC win",
	3: "<:TR:818988588049629256> TR win",
}

/**
 * Creates a new discord embed for updating the alert
 * @param info - alert info from PS2Alerts
 * @param {pg.Client} pgClient - postgres client
 * @param {discord.Client} discordClient - discord client
 * @param {boolean} isComplete - true if alert is complete
 * @throws if error retrieving territory control for an alert
 */
async function updateAlert(info, pgClient, discordClient, isComplete){
	const messageEmbed = new EmbedBuilder();
	messageEmbed.setTimestamp();
	messageEmbed.setFooter({text: "Data from ps2alerts.com"});
	const alertName = alerts[info.censusMetagameEventType].name;
	messageEmbed.setTitle(alertName);
	if (alertName.includes('Enlightenment')){
		messageEmbed.setColor('Purple');
	}
	else if (alertName.includes('Liberation')){
		messageEmbed.setColor('Blue');
	}
	else if (alertName.includes('Superiority')){
		messageEmbed.setColor('Red');
	}
	messageEmbed.setDescription(`[${alerts[info.censusMetagameEventType].description}](https://ps2alerts.com/alert/${info.instanceId}?utm_source=auraxis-bot&utm_medium=discord&utm_campaign=partners)`);
	messageEmbed.addFields({name: "Server", value: serverNames[info.world], inline: true});
	if(isComplete){
		messageEmbed.addFields({name: "Status", value: `Ended <t:${Math.floor(Date.parse(info.timeEnded)/1000)}:R>`, inline: true});
	}
	else{
		const start = Date.parse(info.timeStarted);
		messageEmbed.addFields({name: "Status", value: `Started <t:${Math.floor(start/1000)}:t>\nEnds <t:${Math.floor((start+info.duration)/1000)}:R>`, inline: true});
	}
	messageEmbed.addFields({name: "Population", value: `${popLevels[info.bracket]}`, inline: true});
	try{
		messageEmbed.addFields({name: "Territory Control", value: `\
		\n<:VS:818766983918518272> **VS**: ${info.result.vs}%\
		\n<:NC:818767043138027580> **NC**: ${info.result.nc}%\
		\n<:TR:818988588049629256> **TR**: ${info.result.tr}%`, inline: true});
	}
	catch(err){
		throw "Error displaying territory";
	}
	
	if(isComplete){
		if(info.result.draw){
			messageEmbed.addFields({name: "Result", value: "Draw", inline: true});
		}
		else{
			messageEmbed.addFields({name: "Result", value: `${winnerFaction[info.result.victor]}`, inline: true});
			const minutesDone = Math.floor((Date.now() - Date.parse(info.timeEnded))/60000);
			if (!(info.result.victor in winnerFaction) && minutesDone < 5){
				isComplete = false; //Don't delete from list, retry up to 5 minutes later when field may be populated
			}
		}
	}


	const result = await pgClient.query("SELECT messageID, channelID FROM alertMaintenance WHERE alertID = $1;", [info.instanceId])
	for (const row of result.rows) {
		editMessage(messageEmbed, row.messageid, row.channelid, discordClient)
	}
	if(isComplete){
		pgClient.query("DELETE FROM alertMaintenance WHERE alertID = $1;", [info.instanceId]);
	}
}

/**
 * Edits existing alert message with new information
 * @param {EmbedBuilder} embed - embed to replace messageID with
 * @param {string} messageId - message id to edit
 * @param {string} channelId - channel id to edit message in
 * @param {discord.Client} discordClient - discord client
 */
async function editMessage(embed, messageId, channelId, discordClient){
	try {
		const resChann = await discordClient.channels.fetch(channelId);
		if (resChann.type === ChannelType.GuildText || resChann.type === ChannelType.GuildAnnouncement && resChann.permissionsFor(resChann.guild.members.me).has(PermissionsBitField.Flags.ViewChannel)) {
			const resMsg = await resChann.messages.fetch(messageId);
			await resMsg.edit({embeds: [embed]});
		}
		else if(resChann.type === ChannelType.DM){
			const resMsg = await resChann.messages.fetch(messageId);
			await resMsg.edit({embeds: [embed]});
		}
	}
	catch(err) { /**ignore, will be cleaned up on alert end*/ }
}

/**
 * Deletes alert if there is no longer a message to update it.
 * If there is no error message for `row` will log error
 * @param row - alert information from PS2Alerts
 * @param {pg.Client} pgClient - postgres client
 * @param {string} err - error message 
 */
async function checkError(row, pgClient, err){
	if(row.error){
		pgClient.query("DELETE FROM alertMaintenance WHERE alertID = $1;", [row.alertid]);
	}
	else{
		pgClient.query("UPDATE alertMaintenance SET error = true WHERE alertID = $1;", [row.alertid]);
		console.log(`Error retrieving alert info from PS2Alerts for alert ${row.alertid}`);
		console.log(err);
	}
}

/**
 * Update alert info in the database and edit discord messages
 * @param {pg.Client} pgClient - postgres client
 * @param {discord.Client} discordClient - discord client
 */
export async function update(pgClient, discordClient){
	const results = await pgClient.query("SELECT DISTINCT alertID, error FROM alertMaintenance");
	Promise.allSettled(results.rows.map(async row => {
		try {
			const request = await fetch(`https://api.ps2alerts.com/instances/${row.alertid}`);
			const response = await request.json();
			await updateAlert(response, pgClient, discordClient, response.timeEnded != null);
		}
		catch (err) {
			if (typeof(err) !== 'string') {
				checkError(row, pgClient, "Error during web request");
			}
			else if(err == "Error displaying territory"){
				checkError(row, pgClient, err);
			}
			else{
				console.log("Error occurred when updating alert");
				console.log(err);
			}
		}
	}));
}