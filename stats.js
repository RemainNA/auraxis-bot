/**
 * This file implements functions to look up a character's stats with a specific weapon
 * @module stats
 */

const Discord = require('discord.js');
const weaponsJSON = require('./static/weapons.json');
const sanction = require('./static/sanction.json');
const { badQuery, censusRequest, localeNumber, faction } = require('./utils.js');
const i18n = require('i18n');

/**
 * Get weapon name and id
 * @param {string} name - The name of the weapon or  weapon ID
 * @param searchSpace - A list of ID's to search
 * @param {string} cName - The name of the character to check the weapon stats for
 * @returns the weapon that matches `name`
 * @throws if `cName` is not a valid character or `name` is not a valid weapon
 */
const getWeaponId = async function(name, searchSpace, cName=""){
	//Check if ID matches

	name = name.replace(/[“”]/g, '"');

	if(name in weaponsJSON && searchSpace.includes(name)){
		return [weaponsJSON[name], name];
	}

	if(name in sanction && searchSpace.includes(name)){
		return [sanction[name], name];
	}

	//Check for exact match
	for(const id in weaponsJSON){
		if(weaponsJSON[id].name.toLowerCase() == name.toLowerCase() && searchSpace.includes(id)){
			return [weaponsJSON[id], id];
		}
	}

	for(const id in sanction){
		if(sanction[id].name.toLowerCase() == name.toLowerCase() && searchSpace.includes(id)){
			return [sanction[id], id];
		}
	}

	//Check for partial match
	for(const id in weaponsJSON){
		if(weaponsJSON[id].name.toLowerCase().indexOf(name.toLowerCase()) > -1 && searchSpace.includes(id)){
			return [weaponsJSON[id], id];
		}
	}

	for(const id in sanction){
		if(sanction[id].name.toLowerCase().indexOf(name.toLowerCase()) > -1 && searchSpace.includes(id)){
			return [sanction[id], id];
		}
	}

	if(cName == ""){
		throw `${name} not found.`;
	}
	else if(name in weaponsJSON){
		throw `${weaponsJSON[name].name} [${name}] not found for ${cName}`;
	}
	else if(name in sanction){
		throw `${sanction[name].name} [${name}] not found for ${cName}`;
	}
	else{
		throw `${name} not found for ${cName}`;
	}
	
}

/**
 * The different factions pools for weapons
 */
const factions = {
	"0": "Common pool",
	"1": "VS",
	"2": "NC",
	"3": "TR",
	"4": "NSO"
}

/**
 * Get a list of partial matches for a weapon name
 * @param {string} query - The query to search for 
 * @returns a list of  objects with the name and ID of the weapon
 */
const partialMatches = async function(query){
	let matches = [];
	let included = [];
	query = query.replace(/[“”]/g, '"').toLowerCase();

	for(const id in weaponsJSON){
		if(weaponsJSON[id].name.toLowerCase().indexOf(query) > -1){
			if(weaponsJSON[id].faction){
				matches.push({name: `${weaponsJSON[id].name} (${factions[weaponsJSON[id].faction]} ${weaponsJSON[id].category}) [${id}]`, value: id});
			}
			else{
				matches.push({name: `${weaponsJSON[id].name} (${sanction[id].category}) [${id}]`, value: id});
			}
			included.push(id);
		}
		if(matches.length >= 25){
			break;
		}
	}

	for(const id in sanction){
		if(matches.length >= 25){
			break;
		}
		if(sanction[id].name.toLowerCase().indexOf(query) > -1 && !included.includes(id)){
			matches.push({name: `${sanction[id].name} (${sanction[id].category}) [${id}]`, value: id});
			included.push(id);
		}
	}

	return matches;
}

/**
 * Get character's stats with a specific weapon
 * @param {string} cName - The name of the character to get the stats for
 * @param {string} wName - The name of the weapon to get the stats for
 * @param {string} platform - The platform to get the stats for
 * @param {string} locale - The locale to get the stats for
 * @returns character information for a specific weapon
 * @throws if `cName` is not a valid character or `wName` is not a valid weapon
 */
const characterInfo = async function(cName, wName, platform, locale="en-US"){
	let response =  await censusRequest(platform, 'character_list', `/character?name.first_lower=${cName}&c:resolve=weapon_stat_by_faction,weapon_stat`);
    if(response.length == 0){
        throw i18n.__mf({phrase: "{name} not found", locale: locale}, {name: cName});
	}
	let data = response[0];
	if(typeof(data.stats) === 'undefined' || typeof(data.stats.weapon_stat) === 'undefined' || typeof(data.stats.weapon_stat_by_faction) === 'undefined'){
		throw i18n.__({phrase: "Unable to retrieve weapon stats", locale: locale});
	}
	let resObj = {
		name: data.name.first,
		faction: data.faction_id,
		deaths: 0,
		fireCount: 0,
		hits: 0,
		playTime: 0,
		score: 0
	};

	let validIds = [];

	// This for loop determines the search space, limited to what weapons the character has actually used
	for(let weapon of data.stats.weapon_stat_by_faction){
		if(!validIds.includes(weapon.item_id) && weapon.stat_name == "weapon_kills"){
			validIds.push(weapon.item_id);
		}
	}

	if(validIds.length == 0){
		throw i18n.__mf({phrase: "{weapon} not found for {name}", locale: locale}, {weapon: wName, name: data.name.first});
	}

	let wInfo = await getWeaponId(wName, validIds, data.name.first);
	let wId = wInfo[1];

	resObj.weapon = wId;

	let found = false;

	for(let weapon of data.stats.weapon_stat){
		if(weapon.item_id == wId){
			found = true;
			switch(weapon.stat_name){
				case "weapon_deaths":
					resObj.deaths = Math.max(weapon.value, resObj.deaths);
					break;
				case "weapon_fire_count":
					resObj.fireCount = Math.max(weapon.value, resObj.fireCount);
					break;
				case "weapon_hit_count":
					resObj.hits = Math.max(weapon.value, resObj.hits);
					break;
				case "weapon_play_time":
					resObj.playTime = Math.max(weapon.value, resObj.playTime);
					break;
				case "weapon_score":
					resObj.score = Math.max(weapon.value, resObj.score);
					break;
			}
		}
	}

	if(!found){
		throw `${wName} not found for ${cName}`;
	}

	for(let weapon of data.stats.weapon_stat_by_faction){
		if(weapon.item_id == wId){
			switch(weapon.stat_name){
				case "weapon_damage_given":
					resObj.vsDamageGiven = weapon.value_vs;
					resObj.ncDamageGiven = weapon.value_nc;
					resObj.trDamageGiven = weapon.value_tr;
					break;
				case "weapon_headshots":
					resObj.vsHeadshots = weapon.value_vs;
					resObj.ncHeadshots = weapon.value_nc;
					resObj.trHeadshots = weapon.value_tr;
					break;
				case "weapon_kills":
					resObj.vsKills = weapon.value_vs;
					resObj.ncKills = weapon.value_nc;
					resObj.trKills = weapon.value_tr;
					break;
				case "weapon_vehicle_kills":
					resObj.vsVehicleKills = weapon.value_vs;
					resObj.ncVehicleKills = weapon.value_nc;
					resObj.trVehicleKills = weapon.value_tr;
					break;
			}
		}
	}

	return resObj;
}

module.exports = {
	/**
	 * Look up weapon stats for a specific character and get a discord embed in return
	 * @param {string} cName - The name of the character to get the stats for
	 * @param {string} wName - The name of the weapon to get the stats for
	 * @param {string} platform - The platform to get the stats for
	 * @param {string} locale - the locale to use 
	 * @returns a discord embed for a character weapons stats
	 * @throws if `cName` or `wName` contains invalid characters
	 */
	lookup: async function(cName, wName, platform, locale="en-US"){
		if(badQuery(cName)){
			throw i18n.__({phrase: "Character search contains disallowed characters", locale: locale});
		}
		if(wName.indexOf("[") > -1){
			// Account for autocomplete breaking
			const splitList = wName.split("[");
			wName = splitList[splitList.length-1].split("]")[0];
		}
		if(badQuery(wName)){
			throw i18n.__({phrase: "Weapon search contains disallowed characters", locale: locale});
		}

		let cInfo = await characterInfo(cName, wName, platform);

		let wInfo = weaponsJSON[cInfo.weapon];
		if(wInfo == undefined){
			wInfo = sanction[cInfo.weapon];
		}
		wInfo.id = cInfo.weapon;

		let resEmbed = new Discord.MessageEmbed();
		resEmbed.setTitle(cInfo.name);
		resEmbed.setDescription(`${wInfo.name} (${wInfo.category})`);
		let totalKills = parseInt(cInfo.vsKills)+parseInt(cInfo.ncKills)+parseInt(cInfo.trKills);
		let totalHeadshots = parseInt(cInfo.vsHeadshots)+parseInt(cInfo.ncHeadshots)+parseInt(cInfo.trHeadshots);
		let totalDamage = parseInt(cInfo.vsDamageGiven)+parseInt(cInfo.ncDamageGiven)+parseInt(cInfo.trDamageGiven);
		let totalVehicleKills = parseInt(cInfo.vsVehicleKills)+parseInt(cInfo.ncVehicleKills)+parseInt(cInfo.trVehicleKills);
		let hours = Math.floor(cInfo.playTime/60/60);
		let minutes = Math.floor(cInfo.playTime/60 - hours*60);
		let accuracy = cInfo.hits/cInfo.fireCount;
		let hsr = totalHeadshots/totalKills;
		let ahr = Math.floor(accuracy*hsr*10000);
		let spm = cInfo.score/(cInfo.playTime/60);
		resEmbed.addField(i18n.__({phrase: "Kills", locale: locale}), totalKills.toLocaleString(locale), true);
		resEmbed.addField(i18n.__({phrase: "Deaths", locale: locale}), cInfo.deaths.toLocaleString(locale), true);
		resEmbed.addField(i18n.__({phrase: "K/D", locale: locale}), localeNumber(totalKills/cInfo.deaths, locale), true);
		resEmbed.addField(i18n.__({phrase: "Accuracy", locale: locale}), localeNumber(accuracy*100, locale)+"%", true);
		totalHeadshots && resEmbed.addField(i18n.__({phrase: "HSR", locale: locale}), localeNumber(hsr*100, locale)+"%", true);
		ahr && resEmbed.addField(i18n.__({phrase: "AHR Score", locale: locale}), `${ahr}`, true);
		totalVehicleKills && resEmbed.addField(i18n.__({phrase: "Vehicle Kills", locale: locale}), totalVehicleKills.toLocaleString(locale), true);
		resEmbed.addField(i18n.__({phrase: "Playtime", locale: locale}), hours+" hours, "+minutes+" minutes", true);
		resEmbed.addField(i18n.__({phrase: "KPM", locale: locale}), localeNumber(totalKills/(cInfo.playTime/60), locale), true);
		resEmbed.addField(i18n.__({phrase: "Avg Damage/Kill", locale: locale}), Math.floor(totalDamage/totalKills).toLocaleString(locale), true);
		resEmbed.addField(i18n.__({phrase: "Score (SPM)", locale: locale}), cInfo.score.toLocaleString(locale)+" ("+localeNumber(spm, locale)+")", true);
		resEmbed.setColor(faction(cInfo.faction).color)
		if(wInfo.image_id != -1 && wInfo.image_id != undefined){
			resEmbed.setThumbnail('http://census.daybreakgames.com/files/ps2/images/static/'+wInfo.image_id+'.png');
		}
		resEmbed.setFooter({text: i18n.__({phrase: "Weapon ID", locale: locale})+": "+wInfo.id});

		return resEmbed;
	},

	partialMatches: partialMatches
}