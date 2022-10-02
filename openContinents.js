/**
 * This file implements functions to check which continents are open, update base ownership, and send unlock notifications
 * @module openContinents
 * @typedef {import('pg').Client} pg.Client
 * @typedef {import('discord.js').Client} discord.Client
 */

import {territoryInfo} from './commands/territory.js';
import {serverIDs, serverNames, servers, continents} from './utils.js';
import {send} from './messageHandler.js';
import {unsubscribeAll} from './subscriptions.js';
import {PermissionsBitField} from 'discord.js';
import {update} from './commands/tracker.js';

/**
 * continentName: continentId
 */
const contIDs = {
	"Indar": "2",
	"Hossin": "4",
	"Amerish": "6",
	"Esamir": "8",
	"Oshur": "344",
	"Koltyr": "14"
};

/**
 * Send a notification to subscribed channels that a continent has been opened
 * @param {string} cont - continent name that is open
 * @param {string} server - continent the server is in
 * @param {string} channelID - subscribed channel  ID
 * @param {pg.Client} pgClient - postgres client to use
 * @param {discord.Client} discordClient - discord client to use
 */
async function notifyUnlock(cont, server, channelID, pgClient, discordClient){
	try{
		const channel = await discordClient.channels.fetch(channelID);
		if(typeof(channel.guild) !== 'undefined'){
			if(channel.permissionsFor(channel.guild.members.me).has([PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.EmbedLinks])){
				await send(channel, `${cont} on ${server} is now open!`, "Continent unlock");
			}
			else{
				unsubscribeAll(pgClient, channelID);
				console.log(`Unsubscribed from ${channelID}`);
			}
		}
		else{
			const res = await send(channel, `${cont} on ${server} is now open!`, "Continent unlock");
			if(res == -1){
				unsubscribeAll(pgClient, channelID);
				console.log(`Unsubscribed from ${channelID}`);
			}
		}
	}
	catch(err){
		if(err.code == 10003){ //Unknown channel error, thrown when the channel is deleted
			unsubscribeAll(pgClient, channelID);
			console.log(`Unsubscribed from ${channelID}`);
		}
		else{
			console.log("Continent unlock notify error");
			console.log(err);
		}
	}
}

/**
 * Send a notification to subscribed channels that a continent has been opened
 * @param {pg.Client} pgClient - postgres client to use
 * @param {discord.Client} discordClient - discord client to use
 */
export async function check(pgClient, discordClient){
	for(const server of servers){
		try{
			const now = new Date().toISOString();
			const territory = await territoryInfo(serverIDs[server]);
			const currentStatus = await pgClient.query("SELECT * FROM openContinents WHERE world = $1;", [server]);
			await pgClient.query("UPDATE openContinents SET indar = $1, hossin = $2, amerish = $3, esamir = $4, oshur = $5, koltyr = $6 WHERE world = $7;",
			[territory["Indar"].locked == -1, territory["Hossin"].locked == -1, territory["Amerish"].locked == -1, territory["Esamir"].locked == -1, territory["Oshur"].locked == -1, territory["Koltyr"].locked == -1, server]);
			for(const cont of continents){
				if(territory[cont].locked != -1){
					await pgClient.query("DELETE FROM bases WHERE continent = $1 AND world = $2;",
					[contIDs[cont], serverIDs[server]]);
				}
				else if(!currentStatus.rows[0][cont.toLowerCase()]){
					// If continent is open but recorded as closed
					try{
						const result = await pgClient.query("SELECT u.channel, c.Indar, c.Hossin, c.Amerish, c.Esamir, c.Oshur, c.Koltyr, c.autoDelete\
						FROM unlocks u LEFT JOIN subscriptionConfig c on u.channel = c.channel\
						WHERE u.world = $1;", [server]);
						for (const row of result.rows){
							if(row[cont.toLowerCase()]){
								await notifyUnlock(cont, serverNames[serverIDs[server]], row.channel, pgClient, discordClient);
							}
						}
					}
					catch(err){
						console.log("Unlock error");
						console.log(err);
					}
					update(pgClient, discordClient, true); //Update trackers with new continent
				}
				if(territory[cont].locked == -1 != currentStatus.rows[0][cont.toLowerCase()]){
					// Update timestamp if there is a change
					await pgClient.query(`UPDATE openContinents SET ${cont.toLowerCase()}change = $1 WHERE world = $2;`, [now, server]);
				}
			}
		}
		catch(err){
			console.log("Error in openContinents");
			console.log(err);
		}
	}
}