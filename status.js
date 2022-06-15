// This file implements functions to look up and report server status

const Discord = require('discord.js');
const { censusRequest } = require('./utils.js');
const i18n = require('i18n');

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
		const server = world.name.split(' ')[0]
		status[server] = world.last_reported_state;
	}

	return status;
}

module.exports = {
	servers: async function(locale="en-US"){
		const status = await info();
		const resEmbed = new Discord.MessageEmbed();
		resEmbed.setTitle(i18n.__({phrase: 'Server Status', locale: locale}));
		for(const server in status){
			resEmbed.addField(i18n.__({phrase: server, locale: locale}), i18n.__({phrase: status[server], locale: locale}), true);
		}
		resEmbed.setTimestamp();
		return resEmbed;
	}
}