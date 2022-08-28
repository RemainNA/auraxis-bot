/**
 * This file implements functions to look up information about the current outfit wars
 * @ts-check
 * @module outfitWars
 */

const Discord = require('discord.js');
const {default: got} = require('got');
const { serverNames, serverIDs, faction } = require('./utils');
const { onlineInfo}  = require('./online.js');
const i18n = require('i18n');

module.exports = {
	/**
	 * Get the current registrations for the input server
	 * @param {string} server - server name
	 * @param {string} locale - locale to use
	 * @returns a discord embed of the current outfit wars registrations
	 * @throws if there is an error requesting any info
	 */
	registrations: async function(server, locale='en-US'){
		const uri = `https://census.lithafalcon.cc/get/ps2/outfit_war_registration?world_id=${serverIDs[server]}`
		const response = await got(uri).json();
		const sendEmbed = new Discord.MessageEmbed();
		sendEmbed.setTitle(i18n.__mf({phrase: "outfitWarsRegistrations", locale: locale}, 
			{server: serverNames[serverIDs[server]]}
		));
		let fullyRegistered = "";
		let partiallyRegistered = "";
		let fullyContinued = "";
		let partiallyContinued = "";
		let fullyRegisteredCount = 0;
		let partiallyRegisteredCount = 0;
		const outfitIDs = [];
		const registrations = response.outfit_war_registration_list;
		for(const outfit of registrations){
			outfitIDs.push(outfit.outfit_id);
		}
		const outfits = await Promise.all(Array.from(outfitIDs, x=> onlineInfo("", "ps2:v2", x, locale)));
		for(let i = 0; i < outfits.length; i++){
			if(registrations[i].status == "Full"){
				fullyRegisteredCount++;
				const currentString = `${faction(registrations[i].faction_id).decal} [${outfits[i].alias}] ${outfits[i].name}\n`;
				if(fullyRegistered.length + currentString.length > 1020){
					fullyContinued += currentString;
				}
				else{
					fullyRegistered += currentString;
				}
			}
			else{
				partiallyRegisteredCount++;
				const currentString = `${faction(registrations[i].faction_id).decal} [${outfits[i].alias}] ${outfits[i].name}: ${registrations[i].member_signup_count} registered\n`;
				if(partiallyRegistered.length + currentString.length > 1020){
					partiallyContinued += currentString;
				}
				else{
					partiallyRegistered += currentString;
				}
			}
		}
		sendEmbed.addField(i18n.__mf({phrase: "fullyRegistered", locale: locale}, {count: fullyRegisteredCount}), fullyRegistered);
		if(fullyContinued.length > 0){
			sendEmbed.addField('\u200B', fullyContinued);
		}
		sendEmbed.addField(i18n.__mf({phrase: "partiallyRegistered", locale: locale}, {count: partiallyRegisteredCount}), partiallyRegistered);
		if(partiallyContinued.length > 0){
			sendEmbed.addField('\u200B', partiallyContinued);
		}
		sendEmbed.setFooter({text: i18n.__md({phrase: "Data from {site}", locale: locale}, {site: "census.lithafalcon.cc"})});
	
		return sendEmbed;
	}
}
