/**
 * This file defines functions to update previously sent alert notifications
 * @module alertMaintenance
 */
/**
 * @typedef {import('discord.js').Client} discord.Client
 * @typedef {import('pg').Client} pg.Client
 */
const Discord = require('discord.js');
const { fetch } = require('undici');
const alerts = require('./static/alerts.json');
const {serverNames, discordEmoji} = require('./utils.js');
const {getPopulation} = require('./population.js');
/**
 * faction winners
 */
const winnerFaction = {
	1: `${discordEmoji["VS"]} VS win`,
	2: `${discordEmoji["NC"]} NC win`,
	3: `${discordEmoji["TR"]} TR win`,
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
	const messageEmbed = new Discord.EmbedBuilder();
	messageEmbed.setTimestamp();
	messageEmbed.setFooter({text: info.honuId ? "Data from wt.honu.pw" : "Data from ps2alerts.com & wt.honu.pw"});
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
    if (info.playerCount !== null && info.playerCount !== undefined) {
		if(info.playerCount != 0){
			messageEmbed.addFields({name: "Population", value: `${info.playerCount}`, inline: true});
		}
    } else {
		try{
			const populationResults = await getPopulation();
			const pop = populationResults[info.world][info.zone];
			if(pop.all != 0){
				messageEmbed.addFields({name: "Population", value: `${pop.all}`, inline: true});
			}
		}
		catch(err){
			console.log("DEBUG: Error retrieving population statistics in alertMaintenance");
			console.log(err);
		} //Ignore population error
    }
	try{
		messageEmbed.addFields({name: "Territory Control", value: `\
		\n${discordEmoji["VS"]} **VS**: ${info.result.vs}%\
		\n${discordEmoji["NC"]} **NC**: ${info.result.nc}%\
		\n${discordEmoji["TR"]} **TR**: ${info.result.tr}%`, inline: true});
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
 * @param {Discord.EmbedBuilder} embed - embed to replace messageID with
 * @param {string} messageId - message id to edit
 * @param {string} channelId - channel id to edit message in
 * @param {Discord.Client} discordClient - discord client
 */
async function editMessage(embed, messageId, channelId, discordClient){
	try {
		const resChann = await discordClient.channels.fetch(channelId);
		if ([Discord.ChannelType.GuildText, Discord.ChannelType.GuildAnnouncement].includes(resChann.type) && resChann.permissionsFor(resChann.guild.members.me).has(Discord.PermissionFlagsBits.ViewChannel)) {
			const resMsg = await resChann.messages.fetch(messageId);
			await resMsg.edit({embeds: [embed]});
		}
		else if(resChann.type == Discord.ChannelType.DM){
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

module.exports = {
	/**
	 * Update alert info in the database and edit discord messages
	 * @param {pg.Client} pgClient - postgres client
	 * @param {Discord.Client} discordClient - discord client
	 */
	update: async function(pgClient, discordClient){
		const results = await pgClient.query("SELECT DISTINCT alertID, error FROM alertMaintenance");
		Promise.allSettled(results.rows.map(async row => {
			try {
                // for testing honu locally, cause it uses a self-signed cert
                //process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
				let url;
				if(["1000", "2000"].includes(row.alertid.split("-")[0])){
					url = `https://api.ps2alerts.com/instances/${row.alertid}`
				}
				else{
					url = `https://wt.honu.pw/api/alerts/dropin/${row.alertid}`;
				}
                
                const request = await fetch(url, {headers: {"User-Agent": process.env.USER_AGENT}});
				if (request.status == 404) {
					checkError(row, pgClient, "Error retrieving alert info: 404");
					return;
				}
                else if (request.status == 200) { // a non-200 means Honu did not find the alert for some reason
                    const response = await request.json();
                    await updateAlert(response, pgClient, discordClient, response.timeEnded != null);
                }
				else{
					checkError(row, pgClient, `Error retrieving alert info: ${request.status} status code`);
				}
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
}