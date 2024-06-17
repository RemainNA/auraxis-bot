/**
 * This file implements a function which finds and returns the implants a character owns
 * @module ownedImplants
 */
const Discord = require('discord.js');
const { censusRequest, badQuery, faction } = require('./utils.js');
const i18n = require('i18n');
const { max } = require('pg/lib/defaults.js');

/**
 * Get a list of a character's implants
 * @param {string} cName - character name to check
 * @param {string} platform  - what platform the character is on
 * @param {string} locale -  locale to use
 * @returns an object containing the character's implants
 * @throw if `cName` is not a valid character name, or if the character has no implants
 */
const getImplantList = async function(cName, platform, locale="en-US"){
	let response = await censusRequest(platform, 'character_list', `/character?name.first_lower=${cName}&c:resolve=item_full&c:lang=en`);
	if(response.length == 0){
		throw i18n.__mf({phrase: "{name} not found", locale: locale}, {name: cName});
	}
	let data = response[0];
	let implantsDict = {};
	for (const item of data.items){
		if(item.item_category_id == "133" && item.item_type_id == "45"){
			const itemName = item.name.en;
			const nameLength = itemName.length;
			if(["1","2","3","4","5"].includes(itemName.substring(nameLength-1))){
				if (item.name.en.substring(0, nameLength-2) in implantsDict){
					implantsDict[itemName.substring(0, nameLength-2)] = Math.max(implantsDict[itemName.substring(0, nameLength-2)], parseInt(itemName.substring(nameLength-1)));
				}
				else{
					implantsDict[itemName.substring(0, nameLength-2)] = parseInt(itemName.substring(nameLength-1));
				}
			}
			else{
				implantsDict[itemName] = 6;
			}
		}
	}
	
	if(Object.keys(implantsDict).length == 0){
		throw i18n.__mf({phrase: "{name} has no implants", locale: locale}, {name: data.name.first});
	}
	const implantsList = [[],[],[],[],[],[]];
	for(const implant in implantsDict){
		implantsList[implantsDict[implant] - 1].push(implant);
	}
	for(const x in implantsList){
		if(implantsList[x].length > 0){
			implantsList[x].sort((a,b) => a.localeCompare(b));
		}
		else{
			implantsList[x] = ["None"];
		}
	}
	return {
		name: data.name.first,
		id: data.character_id,
		faction: data.faction_id,
		implants: implantsList.slice().reverse()
	};
}

/**
 * Send a message with the list of implants a character owns
 * @param {string} cName - character name to check
 * @param {string} platform  - what platform the character is on
 * @param {string} locale -  locale to use
 * @returns a discord embed with the list of implants a character owns
 * @throw if `cName` has no implants
 */
const ownedImplants = async function(cName, platform, locale="en-US"){
	const implantList = await getImplantList(cName.toLowerCase(), platform, locale);
	let resEmbed = new Discord.EmbedBuilder();
	resEmbed.setTitle(i18n.__mf({phrase: "characterImplants", locale: locale}, {name: implantList.name}));
	resEmbed.addFields(
		{name: i18n.__({phrase: "exceptional", locale: locale}), value: implantList.implants[0].join(", "), inline: true},
		{name: i18n.__({phrase: "rank5", locale: locale}), value: implantList.implants[1].join(", "), inline: true},
		{name: i18n.__({phrase: "rank4", locale: locale}), value: implantList.implants[2].join(", "), inline: true},
		{name: i18n.__({phrase: "rank3", locale: locale}), value: implantList.implants[3].join(", "), inline: true},
		{name: i18n.__({phrase: "rank2", locale: locale}), value: implantList.implants[4].join(", "), inline: true},
		{name: i18n.__({phrase: "rank1", locale: locale}), value: implantList.implants[5].join(", "), inline: true}
	);	
	resEmbed.setColor(faction(implantList.faction).color);
	resEmbed.setFooter({text: i18n.__({phrase: "implantFooterDisclaimer", locale: locale})});
	return resEmbed;
}

module.exports = {
	ownedImplants: ownedImplants
};