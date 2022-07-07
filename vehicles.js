/**
 * This file defines functions to look up a player's stats with a given vehicle
 * @module vehicles
 */

const Discord = require('discord.js');
const {censusRequest, localeNumber, faction} = require('./utils.js');
const vehicles = require('./static/parsedVehicles.json');
const {getWeaponName} = require('./character.js');
const i18n = require('i18n');
const utils = require('pg/lib/utils');

/**
 * Get a overview of a characters stats with a vechicle
 * @param {string} cName - character name to look up
 * @param {string} vehicleID - vehicle ID to look up
 * @param {string} platform - which platform to request, eg. ps2:v2, ps2ps4us:v2, or ps2ps4eu:v2
 * @returns an object containing the character's stats with the given vehicle
 * @throws if cannot find character, no vehicle found, or if the character has never used the vehicle
 */
const vehicleOverview = async function(cName, vehicleID, platform){
	const response = await censusRequest(platform, 'character_list', `/character?name.first_lower=${cName.toLowerCase()}&c:resolve=weapon_stat_by_faction,weapon_stat`);
	if(response.length == 0){
        throw `${cName} not found`;
    }
	const data = response[0];

	let topWeaponID = -1;
	let topWeaponKills = 0;
	let playTime = 0;
	let totalKills = 0;
	let totalDeaths = 0;
	let score = 0;
	let weaponKills = 0;
	let vehicleKills = 0;

	for(const stat of data.stats.weapon_stat){
		if(stat.item_id == "0" && stat.vehicle_id == vehicleID){
			if(stat.stat_name == "weapon_deaths"){
				totalDeaths = Number.parseInt(stat.value);
			}
			else if(stat.stat_name == "weapon_play_time"){
				playTime = Number.parseInt(stat.value);
			}
			else if(stat.stat_name == "weapon_score"){
				score = Number.parseInt(stat.value);
			}
		}
	}
	for(const stat of data.stats.weapon_stat_by_faction){
		if(stat.item_id == "0" && stat.vehicle_id == vehicleID){
			if(stat.stat_name == "weapon_kills"){
				totalKills = Number.parseInt(stat.value_vs) + Number.parseInt(stat.value_nc) + Number.parseInt(stat.value_tr);
			}
			else if(stat.stat_name == "weapon_vehicle_kills"){
				vehicleKills = Number.parseInt(stat.value_vs) + Number.parseInt(stat.value_nc) + Number.parseInt(stat.value_tr);
			}
		}
		else if(stat.vehicle_id == vehicleID && stat.stat_name == "weapon_kills"){
			const kills = Number.parseInt(stat.value_vs) + Number.parseInt(stat.value_nc) + Number.parseInt(stat.value_tr);
			weaponKills += kills;
			if(kills > topWeaponKills){
				topWeaponID = stat.item_id;
				topWeaponKills = kills;
			}
		}
	}
	return {
		charName: data.name.first,
		faction: data.faction_id,
		playTime: playTime,
		totalKills: totalKills,
		weaponKills: weaponKills,
		vehicleKills: vehicleKills,
		totalDeaths: totalDeaths,
		score: score,
		topWeaponID: topWeaponID,
		topWeaponKills: topWeaponKills
	};
}

module.exports = {
	/**
	 * Create an discord embed of a characters stats with a vehicle
	 * @param {string} cName - character name to look up
	 * @param {string} vehicleID - vehicle ID to look up
	 * @param {string} platform - which platform to request, eg. ps2:v2, ps2ps4us:v2, or ps2ps4eu:v2 
 	 * @param {string} locale - locale to use e.g. en-US
	 * @returns discord embed of character stats with a vehicle
	 */
	vehicle: async function(cName, vehicleID, platform, locale="en-US"){
		let vehicleName = "";
		let imageID = -1;
		if(vehicleID.indexOf("[") > -1){
			// Account for autocomplete breaking
			const splitList = vehicleID.split("[");
			vehicleID = splitList[splitList.length-1].split("]")[0];
		}
		if(vehicleID in vehicles){
			vehicleName = vehicles[vehicleID].name;
			imageID = vehicles[vehicleID].image;
		}
		else{
			const input = vehicleID.toLowerCase();
			for(const vid in vehicles){
				if(vehicles[vid].name.toLowerCase().indexOf(input) > -1){
					vehicleID = vid;
					vehicleName = vehicles[vid].name;
					imageID = vehicles[vid].image;
					break;
				}
			}
			if(vehicleName == ""){
				throw "Input not recognized";
			}
		}

		const vInfo = await vehicleOverview(cName, vehicleID, platform);
		if(vInfo.score == 0 && vInfo.playTime == 0){
			throw i18n.__mf({phrase: "{name} has not used the {vehicle}", locale: locale}, 
				{name: vInfo.charName, vehicle: vehicleName});
		}
		let resEmbed = new Discord.MessageEmbed();

		resEmbed.setTitle(vInfo.charName);
		resEmbed.setDescription(vehicleName);
		resEmbed.setThumbnail(`http://census.daybreakgames.com/files/ps2/images/static/${imageID}.png`);
		resEmbed.setColor(faction(vInfo.faction).color);
		const hoursPlayed = Math.floor(vInfo.playTime/3600);
		const minutesPlayed = Math.floor(vInfo.playTime/60 - hoursPlayed*60);
		resEmbed.addField(i18n.__({phrase: "Playtime", locale: locale}), 
			i18n.__mf({phrase: "{hour}h, {minute}m", locale: locale}, {hour: hoursPlayed, minute: minutesPlayed}), true);
		resEmbed.addField(i18n.__({phrase: "Score (SPM)", locale: locale}), 
			`${vInfo.score.toLocaleString(locale)} (${localeNumber(vInfo.score/vInfo.playTime*60, locale)})`, true);
		resEmbed.addField(i18n.__({phrase: "Weapon Kills", locale: locale}), 
			vInfo.weaponKills.toLocaleString(locale), true);
		resEmbed.addField(i18n.__({phrase: "Road Kills", locale: locale}), 
			(vInfo.totalKills-vInfo.weaponKills).toLocaleString(locale), true);
		resEmbed.addField(i18n.__({phrase: "Total KPM", locale: locale}), 
			localeNumber(vInfo.totalKills/vInfo.playTime*60, locale), true);
		resEmbed.addField(i18n.__({phrase: "Vehicle Kills (KPM)", locale: locale}), 
			`${vInfo.vehicleKills.toLocaleString(locale)} (${localeNumber(vInfo.vehicleKills/vInfo.playTime*60, locale)})`, true);
		resEmbed.addField(i18n.__({phrase: "Deaths", locale: locale}), 
			vInfo.totalDeaths.toLocaleString(locale), true);
		if(vInfo.topWeaponID != -1){
			const topWeaponName = await getWeaponName(vInfo.topWeaponID, platform);
			resEmbed.addField(i18n.__({phrase: "Top Weapon (kills)", locale: locale}), `${topWeaponName} (${vInfo.topWeaponKills.toLocaleString(locale)})`, true);
		}

		return resEmbed;
	},

	/**
	 * Checks if `query` is in any vehicle name
	 * @param {string} query - query to search for	
 	 * @returns a list of vehicle names and ID that contain `query`
	 */
	partialMatches: async function(query){
		let matches = [];
		query = query.replace(/[“”]/g, '"').toLowerCase();
		for(const id in vehicles){
			if(vehicles[id].name.toLowerCase().indexOf(query) > -1){
				matches.push({name: `${vehicles[id].name} [${id}]`, value: id});
			}
			if(matches.length >= 25){
				break;
			}
		}
		return matches;
	}
}