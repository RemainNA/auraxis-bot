/**
 * This file defines functions to query the PS2 leaderboard
 * @module leaderboard
 * @typedef {import('discord.js').ChatInputCommandInteraction} ChatInteraction
 */

import { allServers, censusRequest, serverIDs, serverNames } from'../utils.js';
import { EmbedBuilder } from'discord.js';
import i18n from'i18n';

/**
 * Get the right URL extension for the PS2 census API
 * @param {string} name - the type of leaderboard to query
 * @param {string} period - the time period to query
 * @param {string} world - which server to query
 * @param {number} limit - the number of players to return
 * @returns {string} the url census request to use
 */
function constructExtension(name, period, world, limit){
	if(world == undefined){
		return `leaderboard/?name=${name}&period=${period}&c:limit=${limit}&c:resolve=character_name`;
	}
	return `leaderboard/?name=${name}&period=${period}&world=${world}&c:limit=${limit}&c:resolve=character_name`;
}

export const type = ['Base'];

export const data = {
	name: 'leaderboard',
	description: "Lookup current leaderboard",
	options: [{
		name: 'type',
		type: '3',
		description: 'Type of leaderboard to look up',
		required: true,
		choices: [{
			name: 'Kills',
			value: 'Kills'
		},
		{
			name: 'Score',
			value: 'Score'
		},
		{
			name: 'Time',
			value: 'Time'
		},
		{
			name: 'Deaths',
			value: 'Deaths'
		}]
	},
	{
		name: 'period',
		type: '3',
		description: 'Time period of the leaderboard',
		required: true,
		choices: [{
			name: 'Forever',
			value: 'Forever'
		},
		{
			name: 'Monthly',
			value: 'Monthly'
		},
		{
			name: 'Weekly',
			value: 'Weekly'
		},
		{
			name: 'Daily',
			value: 'Daily'
		},
		{
			name: 'One Life',
			value: 'OneLife'
		}]
	},
	{
		name: 'server',
		type: '3',
		description: 'Server name',
		required: false,
		choices: allServers
	}]
};


/**
 * Creates a discord embed of the  leaderboard for a given type, time period, and server
 * @param { ChatInteraction } interaction - the interaction to respond to
 * @param {string} locale - the locale to use
 */
export async function execute(interaction, locale='en-US'){
	/**
	 * I'm not really sure why limit is a parameter since it's always 20,
	 * lookup() was never called anywhere other than in main.js
	 */
	const name = interaction.options.getString('type');
	const period = interaction.options.getString('period');
	const server = interaction.options.getString('server');
	const limit = 20;
	let platform = 'ps2:v2';
	if(server == 'genudine'){
		platform = 'ps2ps4us:v2';
	}
	else if(server == 'ceres'){
		platform = 'ps2ps4eu:v2';
	}
	const data = await censusRequest(platform, 'leaderboard_list', constructExtension(name, period, serverIDs[server], limit));

	const resEmbed = new EmbedBuilder();
	if(server == undefined){
		resEmbed.setTitle(i18n.__mf({phrase: "{period} {type} leaderboard", locale: locale}, 
		{period: i18n.__({phrase: period, locale: locale}), type: i18n.__({phrase: name, locale: locale})}));
	}
	else{
		const serverName = i18n.__({phrase: serverNames[serverIDs[server]], locale: locale});
		resEmbed.setTitle(i18n.__mf({phrase: "{server} {period} {type} leaderboard", locale: locale}, 
		{server: serverName, period: i18n.__({phrase: period, locale: locale}), type: i18n.__({phrase: name, locale: locale})}));
	}
	let textList = '';
	let place = 1;
	if(name == 'Time'){
		for(const entry of data){
			if(entry.value > 86400){
				// 86400 is the number of seconds in a day
				const days = Math.floor(entry.value/86400);
				const hours = Math.floor((entry.value - days*86400)/3600);
				textList += `${place}. ${entry.name.first}: ${i18n.__mf({phrase: "{days}d {hours}h", locale: locale}, {days: days, hours: hours})}\n`;
			}
			else{
				const hours = Math.floor(entry.value/3600);
				const minutes = Math.floor((entry.value - hours*3600)/60);
				textList += `${place}. ${entry.name.first}: ${i18n.__mf({phrase: "{hour}h {minute}m", locale: locale}, {hour: hours, minute: minutes})}m\n`;
			}
			place += 1;
		}
	}
	else{
		for(const entry of data){
			textList += `${place}. ${entry.name.first}: ${parseInt(entry.value).toLocaleString(locale)}\n`;
			place += 1;
		}
	}
	
	resEmbed.setDescription(textList);
	await interaction.editReply({embeds: [resEmbed]});
}