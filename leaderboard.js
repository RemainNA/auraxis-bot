// This file defines functions to query the PS2 leaderboard

const {censusRequest, serverIDs, serverNames} = require('./utils.js');
const Discord = require('discord.js');

constructExtension = function(name, period, world, limit){
	if(world == undefined){
		return `leaderboard/?name=${name}&period=${period}&c:limit=${limit}&c:resolve=character_name`
	}
	return `leaderboard/?name=${name}&period=${period}&world=${world}&c:limit=${limit}&c:resolve=character_name`
}


module.exports = {
	lookup: async function(name, period, server, limit){
		let platform = 'ps2:v2';
		if(server == 'genudine'){
			platform = 'ps2ps4us:v2'
		}
		else if(server == 'ceres'){
			platform == 'ps2ps4eu:v2'
		}
		const data = await censusRequest(platform, 'leaderboard_list', constructExtension(name, period, serverIDs[server], limit));

		let resEmbed = new Discord.MessageEmbed();
		if(server == undefined){
			resEmbed.setTitle(`${period} ${name} leaderboard`);
		}
		else{
			resEmbed.setTitle(`${serverNames[serverIDs[server]]} ${period} ${name} leaderboard`);
		}
		let textList = ''
		let place = 1;
		if(name == 'Time'){
			for(const entry of data){
				if(entry.value > 86400){
					// 86400 is the number of seconds in a day
					const days = Math.floor(entry.value/86400);
					const hours = Math.floor((entry.value - days*86400)/3600);
					textList += `${place}. ${entry.name.first}: ${days}d ${hours}h\n`
				}
				else{
					const hours = Math.floor(entry.value/3600);
					const minutes = Math.floor((entry.value - hours*3600)/60);
					textList += `${place}. ${entry.name.first}: ${hours}h ${minutes}m\n`
				}
				place += 1;
			}
		}
		else{
			for(const entry of data){
				textList += `${place}. ${entry.name.first}: ${parseInt(entry.value).toLocaleString()}\n`
				place += 1;
			}
		}
		
		resEmbed.setDescription(textList);
		return resEmbed;
	}
}
