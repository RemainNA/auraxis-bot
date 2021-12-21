// This file implements functions to look up a character's stats with a specific weapon

const Discord = require('discord.js');
const weaponsJSON = require('./static/weapons.json');
const sanction = require('./static/sanction.json');
const { badQuery, censusRequest } = require('./utils.js');

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

const factions = {
	"0": "Common pool",
	"1": "VS",
	"2": "NC",
	"3": "TR",
	"4": "NSO"
}

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

const characterInfo = async function(cName, wName, platform){
	let response =  await censusRequest(platform, 'character_list', `/character?name.first_lower=${cName}&c:resolve=weapon_stat_by_faction,weapon_stat`);
    if(response.length == 0){
        throw `${cName} not found`;
	}
	let data = response[0];
	if(typeof(data.stats) === 'undefined' || typeof(data.stats.weapon_stat) === 'undefined' || typeof(data.stats.weapon_stat_by_faction) === 'undefined'){
		throw "Unable to retrieve weapon stats";
	}
	let resObj = {
		name: data.name.first,
		faction: data.faction_id,
		deaths: 0,
		fireCount: 0,
		hits: 0,
		playTime: 0,
		score: 0
	}

	let validIds = []

	// This for loop determines the search space, limited to what weapons the character has actually used
	for(let weapon of data.stats.weapon_stat_by_faction){
		if(!validIds.includes(weapon.item_id) && weapon.stat_name == "weapon_kills"){
			validIds.push(weapon.item_id);
		}
	}

	if(validIds.length == 0){
		throw `${wName} not found for ${data.name.first}`;
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
	lookup: async function(cName, wName, platform){
		if(badQuery(cName)){
			throw "Character search contains disallowed characters";
		}
		if(wName.indexOf("[") > -1){
			// Account for autocomplete breaking
			const splitList = wName.split("[")
			wName = splitList[splitList.length-1].split("]")[0];
		}
		if(badQuery(wName)){
			throw "Weapon search contains disallowed characters";
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
		let spm = Number.parseFloat(cInfo.score/(cInfo.playTime/60));
		resEmbed.addField("Kills", totalKills.toLocaleString(), true);
		resEmbed.addField("Deaths", parseInt(cInfo.deaths).toLocaleString(), true);
		resEmbed.addField("KD", Number.parseFloat(totalKills/cInfo.deaths).toPrecision(3), true);
		resEmbed.addField("Accuracy", (accuracy*100).toPrecision(3)+"%", true);
		totalHeadshots && resEmbed.addField("HSR", (hsr*100).toPrecision(3)+"%", true);
		ahr && resEmbed.addField("AHR Score", `${ahr}`, true);
		totalVehicleKills && resEmbed.addField("Vehicle Kills", parseInt(totalVehicleKills).toLocaleString(), true);
		resEmbed.addField("Playtime", hours+" hours, "+minutes+" minutes", true);
		resEmbed.addField("KPM", Number.parseFloat(totalKills/(cInfo.playTime/60)).toPrecision(3), true);
		resEmbed.addField("Avg Damage/Kill", Math.floor(totalDamage/totalKills).toLocaleString(), true);
		if(spm > 1000){
			resEmbed.addField("Score (SPM)", parseInt(cInfo.score).toLocaleString()+" ("+Math.floor(spm)+")", true);
		}
		else{
			resEmbed.addField("Score (SPM)", parseInt(cInfo.score).toLocaleString()+" ("+spm.toPrecision(3)+")", true);
		}
		switch(cInfo.faction){
			case "1":
				resEmbed.setColor('PURPLE');
				break;
			case "2":
				resEmbed.setColor('BLUE');
				break;
			case "3":
				resEmbed.setColor('RED');
				break;
			default:
				resEmbed.setColor('GREY');
		}
		if(wInfo.image_id != -1 && wInfo.image_id != undefined){
			resEmbed.setThumbnail('http://census.daybreakgames.com/files/ps2/images/static/'+wInfo.image_id+'.png');
		}
		resEmbed.setFooter("Weapon ID: "+wInfo.id);

		return resEmbed;
	},

	partialMatches: partialMatches
}