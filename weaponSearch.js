/**
 * This file defines functionality to search through known weapons and return matching results
 * @module weaponSearch
 */

const Discord = require('discord.js');
const weaponsJSON = require('./static/weapons.json');
const {badQuery} = require('./utils.js');

module.exports = {
	/**
	 * Look up a weapon by name and return a list of matching results
	 * @param {string} name - The name of the weapon to search for
	 * @returns a discord embed of matching results
	 */
	lookup: async function(name){
		if(badQuery(name)){
			throw  "Weapon search contains disallowed characters";
		}
		name = name.toLowerCase();
		let curLength = 0;
		let found = [];
		for(const id in weaponsJSON){
			if(weaponsJSON[id].name.toLowerCase().includes(name)){
				let info = `${weaponsJSON[id].name} [${id}]`;
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
		resEmbed.addField('\u200b', `${found}`.replace(/,/g, '\n'));

		return resEmbed;
	}
}