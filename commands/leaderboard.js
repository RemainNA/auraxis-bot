/**
 * This file defines functions to query the PS2 leaderboard
 * @module leaderboard
 */

const {censusRequest, serverIDs, serverNames} = require('./utils.js');
const Discord = require('discord.js');
const i18n = require('i18n');

/**
 * Get the right URL extension for the PS2 census API
 * @param {string} name - the type of leaderboard to query
 * @param {string} period - the time period to query
 * @param {string} world - which server to query
 * @param {number} limit - the number of players to return
 * @returns {string} the url census request to use
 */
const constructExtension = function(name, period, world, limit){
	if(world == undefined){
		return `leaderboard/?name=${name}&period=${period}&c:limit=${limit}&c:resolve=character_name`;
	}
	return `leaderboard/?name=${name}&period=${period}&world=${world}&c:limit=${limit}&c:resolve=character_name`;
}


module.exports = {
	/**
	 * Creates a discord embed of the  leaderboard for a given type, time period, and server
	 * @param {string} name - the type of leaderboard to query
	 * @param {string} period - the time period to query
	 * @param {string} server - the server to query
	 * @param {number} limit - the number of players to return
	 * @param {string} locale - the locale to use
	 * @returns a discord embed of the current leaderboard on the given server
	 */
	lookup: async function(name, period, server, limit, locale='en-US'){
		let platform = 'ps2:v2';
		if(server == 'genudine'){
			platform = 'ps2ps4us:v2';
		}
		else if(server == 'ceres'){
			platform = 'ps2ps4eu:v2';
		}
		const data = await censusRequest(platform, 'leaderboard_list', constructExtension(name, period, serverIDs[server], limit));

		let resEmbed = new Discord.MessageEmbed();
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
		return resEmbed;
	}
}
