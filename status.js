/**
 * This file implements functions to look up and report server status
 * @module status
 */

const Discord = require('discord.js');
const { censusRequest } = require('./utils.js');
const i18n = require('i18n');

/**
 * Get the population status of each server
 * @returns a discord embed of the current population status for each server
 */
const info = async function(){
	let status = {
		'Connery': 'Unknown',
		'Miller': 'Unknown',
		'Cobalt': 'Unknown',
		'Emerald': 'Unknown',
		'SolTech': 'Unknown',
		'Jaeger': 'Unknown',
		'Genudine': 'Unknown',
		'Ceres': 'Unknown'
	}

	const data = await censusRequest('global', 'game_server_status_list', '/game_server_status?game_code=ps2&c:limit=100');
    if(typeof(data) === 'undefined'){
        throw "API Error";
	}
	
	for(const world of data){
		if(world.name.toLowerCase().includes("connery")){
			status["Connery"] = world.last_reported_state;
		}
		else if(world.name.toLowerCase().includes("miller")){
			status["Miller"] = world.last_reported_state;
		}
		else if(world.name.toLowerCase().includes("cobalt")){
			status["Cobalt"] = world.last_reported_state;
		}
		else if(world.name.toLowerCase().includes("emerald")){
			status["Emerald"] = world.last_reported_state;
		}
		else if(world.name.toLowerCase().includes("soltech")){
			status["SolTech"] = world.last_reported_state;
		}
		else if(world.name.toLowerCase().includes("jaeger")){
			status["Jaeger"] = world.last_reported_state;
		}
		else if(world.name.toLowerCase().includes("genudine")){
			status["Genudine"] = world.last_reported_state;
		}
		else if(world.name.toLowerCase().includes("ceres")){
			status["Ceres"] = world.last_reported_state;
		}
	}

	return status;
}

module.exports = {
	/**
	 * Get a discord message of the status of each PS2 server
	 * @param {string} locale - The locale to use
	 * @returns a discord message of the status of each PS2 server
	 */
	servers: async function(locale="en-US"){
		let status = await info();
		let resEmbed = new Discord.MessageEmbed();
		resEmbed.setTitle(i18n.__({phrase: 'Server Status', locale: locale}));
		for(const i in status){
			resEmbed.addField(i18n.__({phrase: i, locale: locale}), i18n.__({phrase: status[i], locale: locale}), true);
		}
		resEmbed.setTimestamp();
		return resEmbed;
	}
}