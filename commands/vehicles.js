/**
 * This file defines functions to look up a player's stats with a given vehicle
 * @module vehicles
 * @typedef {import('discord.js').ChatInputCommandInteraction} ChatInteraction
 * @typedef {import('discord.js').AutocompleteInteraction} AutoComplete
 * @typedef {import('pg').Client} pg.Client
 */

import { EmbedBuilder } from 'discord.js';
import { censusRequest, localeNumber, faction, platforms } from '../utils.js';
import vehicles from '../static/parsedVehicles.json' assert {type: 'json'};
import { getWeaponName } from './character.js';
import i18n from 'i18n';

/**
 * Get a overview of a characters stats with a vechicle
 * @param {string} cName - character name to look up
 * @param {string} vehicleID - vehicle ID to look up
 * @param {string} platform - which platform to request, eg. ps2:v2, ps2ps4us:v2, or ps2ps4eu:v2
 * @returns an object containing the character's stats with the given vehicle
 * @throws if cannot find character, no vehicle found, or if the character has never used the vehicle
 */
async function vehicleOverview(cName, vehicleID, platform){
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

export const type = ['Base'];

export const data = {
	name: 'vehicle',
	description: "Lookup a character's stats with a given vehicle",
	options: [{
		name: 'name',
		type: '3',
		description: 'Character name',
		required: true,
	},
	{
		name: 'vehicle',
		type: '3',
		description: 'Vehicle name',
		autocomplete: true,
		required: true,
	},
	{
		name: 'platform',
		type: '3',
		description: "Which platform is the character on?  Defaults to PC",
		required: false,
		choices: platforms
	}]
};

/**
 * Create an discord embed of a characters stats with a vehicle
 * @param { ChatInteraction } interaction - command chat interaction
 * @param {string} locale - locale to use e.g. en-US
 */
export async function execute(interaction, locale="en-US"){
	const cName = interaction.options.getString('name');
	let vehicleID = interaction.options.getString('vehicle');
	const platform = interaction.options.getString('platform') || 'ps2:v2';
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
	const resEmbed = new EmbedBuilder();

	resEmbed.setTitle(vInfo.charName);
	resEmbed.setDescription(vehicleName);
	resEmbed.setThumbnail(`http://census.daybreakgames.com/files/ps2/images/static/${imageID}.png`);
	resEmbed.setColor(faction(vInfo.faction).color);
	const hoursPlayed = Math.floor(vInfo.playTime/3600);
	const minutesPlayed = Math.floor(vInfo.playTime/60 - hoursPlayed*60);
	resEmbed.addFields({name: i18n.__({phrase: "Playtime", locale: locale}), 
		value: i18n.__mf({phrase: "{hour}h, {minute}m", locale: locale}, {hour: hoursPlayed, minute: minutesPlayed}), inline: true},
	{name: i18n.__({phrase: "Score (SPM)", locale: locale}), 
		value: `${vInfo.score.toLocaleString(locale)} (${localeNumber(vInfo.score/vInfo.playTime*60, locale)})`, inline: true},
	{name: i18n.__({phrase: "Weapon Kills", locale: locale}), 
		value: vInfo.weaponKills.toLocaleString(locale), inline: true},
	{name: i18n.__({phrase: "Road Kills", locale: locale}), 
		value: (vInfo.totalKills-vInfo.weaponKills).toLocaleString(locale), inline: true},
	{name: i18n.__({phrase: "Total KPM", locale: locale}), 
		value: localeNumber(vInfo.totalKills/vInfo.playTime*60, locale), inline: true},
	{name: i18n.__({phrase: "Vehicle Kills (KPM)", locale: locale}), 
		value: `${vInfo.vehicleKills.toLocaleString(locale)} (${localeNumber(vInfo.vehicleKills/vInfo.playTime*60, locale)})`, inline: true},
	{name: i18n.__({phrase: "Deaths", locale: locale}), 
		value: vInfo.totalDeaths.toLocaleString(locale), inline: true});
	if(vInfo.topWeaponID != -1){
		const topWeaponName = await getWeaponName(vInfo.topWeaponID, platform);
		resEmbed.addFields({name: i18n.__({phrase: "Top Weapon (kills)", locale: locale}), value: `${topWeaponName} (${vInfo.topWeaponKills.toLocaleString(locale)})`, inline: true});
	}

	await interaction.editReply({embeds: [resEmbed]});
}

/**
 * Checks if `query` is in any vehicle name
 * @param { AutoComplete } interaction - auto complete interaction	
 */
export async function partialMatches(interaction){
	let query = interaction.options.getString('vehicle');
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
	await interaction.respond(matches);
}