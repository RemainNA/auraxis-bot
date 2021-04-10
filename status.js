// This file implements functions to look up and report server status

const Discord = require('discord.js');
const got = require('got');

const info = async function(){
	let uri = 'http://census.daybreakgames.com/s:'+process.env.serviceID+'/get/global/game_server_status?game_code=ps2&c:limit=100'
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

	let response = "";
	try{
		response = await got(uri).json(); 
	}
	catch(err){
		if(err.message.indexOf('404') > -1){
			throw "API Unreachable";
		}
	}
	if(typeof(response.error) !== 'undefined'){
        if(response.error == 'service_unavailable'){
            throw "Census API currently unavailable";
        }
        throw response.error;
    }
    if(typeof(response.game_server_status_list) === 'undefined'){
        throw "API Error";
	}
	
	let data = response.game_server_status_list;
	for(let world of data){
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
		else if(world.name.toLowerCase().includes("jaegar")){
			status["Jaegar"] = world.last_reported_state;
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