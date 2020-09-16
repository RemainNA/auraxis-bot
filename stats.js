// This file implements functions to look up a character's stats with a specific weapon

const Discord = require('discord.js');
var weaponsJSON = require('./weapons.json');
var got = require('got');

var getWeaponId = async function(name, searchSpace, cName=""){
	//Check if ID matches
	if(typeof(weaponsJSON[name]) !== 'undefined' && searchSpace.includes(name)){
		let returnObj = weaponsJSON[name];
		returnObj.id = name;
		return new Promise(function(resolve, reject){
			resolve(returnObj);
		})
	}

	//Check for exact match
	for(id in weaponsJSON){
		if(weaponsJSON[id].name.toLowerCase() == name.toLowerCase() && searchSpace.includes(id)){
			let returnObj = weaponsJSON[id];
			returnObj.id = id;
			return new Promise(function(resolve, reject){
				resolve(returnObj);
			})
		}
	}

	//Check for partial match
	for(id in weaponsJSON){
		if(weaponsJSON[id].name.toLowerCase().indexOf(name.toLowerCase()) > -1 && searchSpace.includes(id)){
			let returnObj = weaponsJSON[id];
			returnObj.id = id;
			return new Promise(function(resolve, reject){
				resolve(returnObj);
			})
		}
	}

	if(cName == ""){
		return new Promise(function(resolve, reject){
			reject(name+" not found.");
		})
	}
	else{
		return new Promise(function(resolve, reject){
			reject(name+" not found for "+cName);
		})
	}
	
}

var characterInfo = async function(cName, wName, platform){
	let uri = 'https://census.daybreakgames.com/s:'+process.env.serviceID+'/get/'+platform+'/character?name.first_lower='+cName+'&c:resolve=weapon_stat_by_faction,weapon_stat';
	let response =  "";
    try{
       response = await got(uri).json(); 
    }
    catch(err){
        if(err.message.indexOf('404') > -1){
            return new Promise(function(resolve, reject){
                reject("API Unreachable");
            })
        }
    }
    if(typeof(response.error) !== 'undefined'){
        if(response.error == 'service_unavailable'){
            return new Promise(function(resolve, reject){
                reject("Census API currently unavailable");
            })
        }
        if(typeof(response.error) === 'string'){
            return new Promise(function(resolve, reject){
                reject("Census API error: "+response.error);
            })
        }
        return new Promise(function(resolve, reject){
            reject(response.error);
        })
    }
    if(typeof(response.character_list) === 'undefined'){
        return new Promise(function(resolve, reject){
            reject("API Error");
        })
    }
    if(typeof(response.character_list[0]) === 'undefined'){
        return new Promise(function(resolve, reject){
            reject(cName+" not found");
        })
	}
	let data = response.character_list[0];
	if(typeof(data.stats) === 'undefined' || typeof(data.stats.weapon_stat) === 'undefined' || typeof(data.stats.weapon_stat_by_faction) === 'undefined'){
		return new Promise(function(resolve, reject){
            reject("Unable to retrieve weapon stats");
        })
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
		return new Promise(function(resolve, reject){
			reject(wName+" not found for "+cName);
		})
	}

	let wInfo = {};
	try{
		wInfo = await getWeaponId(wName, validIds, cName);
	}
	catch(error){
		return new Promise(function(resolve, reject){
			reject(error);
		})
	}

	let wId = wInfo.id;

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
		return new Promise(function(resolve, reject){
			reject(wName+" not found for "+cName);
		})
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

	return new Promise(function(resolve, reject){
		resolve(resObj);
	})
}

module.exports = {
	lookup: async function(cName, wName, platform){
		let cInfo = {};
		try{
			cInfo = await characterInfo(cName, wName, platform);
		}
		catch(error){
			return new Promise(function(resolve, reject){
                reject(error);
            })
		}

		let wInfo = weaponsJSON[cInfo.weapon];
		wInfo.id = cInfo.weapon;

		let resEmbed = new Discord.MessageEmbed();
		resEmbed.setTitle(cInfo.name);
		resEmbed.setDescription(wInfo.name);
		let totalKills = parseInt(cInfo.vsKills)+parseInt(cInfo.ncKills)+parseInt(cInfo.trKills);
		let totalHeadshots = parseInt(cInfo.vsHeadshots)+parseInt(cInfo.ncHeadshots)+parseInt(cInfo.trHeadshots);
		let totalDamage = parseInt(cInfo.vsDamageGiven)+parseInt(cInfo.ncDamageGiven)+parseInt(cInfo.trDamageGiven);
		let totalVehicleKills = parseInt(cInfo.vsVehicleKills)+parseInt(cInfo.ncVehicleKills)+parseInt(cInfo.trVehicleKills);
		let hours = Math.floor(cInfo.playTime/60/60);
		let minutes = Math.floor(cInfo.playTime/60 - hours*60);
		resEmbed.addField("Kills", totalKills.toLocaleString(), true);
		resEmbed.addField("Deaths", parseInt(cInfo.deaths).toLocaleString(), true);
		resEmbed.addField("KD", Number.parseFloat(totalKills/cInfo.deaths).toPrecision(3), true);
		resEmbed.addField("Accuracy", Number.parseFloat((cInfo.hits/cInfo.fireCount)*100).toPrecision(3)+"%", true);
		totalHeadshots && resEmbed.addField("HSR", Number.parseFloat((totalHeadshots/totalKills)*100).toPrecision(3)+"%", true);
		totalVehicleKills && resEmbed.addField("Vehicle Kills", parseInt(totalVehicleKills).toLocaleString(), true);
		resEmbed.addField("Playtime", hours+" hours, "+minutes+" minutes", true);
		resEmbed.addField("KPM", Number.parseFloat(totalKills/(cInfo.playTime/60)).toPrecision(3), true);
		resEmbed.addField("Avg Damage/Kill", Math.floor(totalDamage/totalKills).toLocaleString(), true);
		resEmbed.addField("Score (SPM)", parseInt(cInfo.score).toLocaleString()+" ("+Number.parseFloat(cInfo.score/(cInfo.playTime/60)).toPrecision(3)+")", true);
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
		resEmbed.setThumbnail('http://census.daybreakgames.com/files/ps2/images/static/'+wInfo.image_id+'.png');
		resEmbed.setFooter("Weapon ID: "+wInfo.id);

		return new Promise(function(resolve, reject){
			resolve(resEmbed);
		})
	}
}