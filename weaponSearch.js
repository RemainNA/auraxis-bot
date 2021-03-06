// This file defines functionality to search through known weapons and return matching results

const Discord = require('discord.js');
const weaponsJSON = require('./weapons.json');
const messageHandler = require('./messageHandler.js');

module.exports = {
	lookup: async function(name){
		if(messageHandler.badQuery(name)){
			throw  "Weapon search contains disallowed characters";
		}
		name = name.toLowerCase();
		let curLength = 0;
		let found = [];
		for(const id in weaponsJSON){
			if(weaponsJSON[id].name.toLowerCase().includes(name)){
				let info = `${weaponsJSON[id].name} [${id}]`
				if((curLength+info.length) > 1020){
					found.push("...");
					break;
				}
				else{
					found.push(info);
					curLength += info.length+1;
				}
			}
		}
		if(found.length == 0){
			throw "No weapons found matching that query";
		}
		let resEmbed = new Discord.MessageEmbed();
		resEmbed.setTitle("Weapon search results");
		resEmbed.addField('\u200b', found);

		return resEmbed;
	}
}