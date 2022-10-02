/**
 * This file implements functions to look up and report server status
 * @module status
 */

const Discord = require('discord.js');
const { censusRequest } = require('./utils.js');
const i18n = require('i18n');

/**
 * Get the population status of each server
 * @returns an object contianing the population status of each server
 * @throws if there are API errors
 */
async function info(){	
	const data = await censusRequest('global', 'game_server_status_list', '/game_server_status?game_code=ps2&c:limit=100');
    if(data === undefined){
		throw "API Error";
	}

	const status = {
		'Connery': 'Unknown',
		'Miller': 'Unknown',
		'Cobalt': 'Unknown',
		'Emerald': 'Unknown',
		'SolTech': 'Unknown',
		'Jaeger': 'Unknown',
		'Genudine': 'Unknown',
		'Ceres': 'Unknown'
	};
	
	for(const world of data){
		/**
		 * the server name format by the census API is inconsistent
		 * but the first word is always the server name.
		 */
		const server = world.name.split(' ')[0];
		status[server] = world.last_reported_state;
	}

	return status;
}

module.exports = {
	/**
	 * Creates a discord embed of the current population status of each server
	 * @param {string} locale - The locale to use
	 * @returns a discord message of the status of each PS2 server
	 */
	servers: async function(locale="en-US"){
		const status = await info();
		const resEmbed = new Discord.MessageEmbed()
			.setTitle(i18n.__({phrase: 'Server Status', locale: locale}));
		for(const server in status){
			resEmbed.addField(i18n.__({phrase: server, locale: locale}), i18n.__({phrase: status[server], locale: locale}), true);
		}
		resEmbed.setTimestamp();
		return resEmbed;
	}
}