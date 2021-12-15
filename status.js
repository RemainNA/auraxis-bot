// This file implements functions to look up and report server status

const Discord = require('discord.js');
const { censusRequest } = require('./utils.js');

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
	servers: async function(){
		let status = await info();
		let resEmbed = new Discord.MessageEmbed();
		resEmbed.setTitle('Server Status');
		for(const i in status){
			resEmbed.addField(i, status[i], true);
		}
		resEmbed.setTimestamp();
		return resEmbed;
	}
}