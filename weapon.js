// This file defines functionality to parse weapons.json and return the relevant info
// Currently in beta

const Discord = require('discord.js');
var weaponsJSON = require('./weapons.json');

var weaponInfo = async function(name){
	//Check if ID matches
	if(typeof(weaponsJSON[name]) !== 'undefined'){
		let returnObj = weaponsJSON[name];
		returnObj.id = name;
		return new Promise(function(resolve, reject){
			resolve(returnObj);
		})
	}

	//Check for exact match
	for(id in weaponsJSON){
		if(weaponsJSON[id].name.toLowerCase() == name.toLowerCase()){
			let returnObj = weaponsJSON[id];
			returnObj.id = id;
			return new Promise(function(resolve, reject){
				resolve(returnObj);
			})
		}
	}

	//check for partial match
	for(id in weaponsJSON){
		if(weaponsJSON[id].name.toLowerCase().indexOf(name.toLowerCase()) > -1){
			let returnObj = weaponsJSON[id];
			returnObj.id = id;
			return new Promise(function(resolve, reject){
				resolve(returnObj);
			})
		}
	}

	return new Promise(function(resolve, reject){
		reject(name+" not found.");
	})
}

module.exports = {
	lookup: async function(name){
		let wInfo = {};
		try{
            wInfo = await weaponInfo(name);
        }
        catch(error){
            return new Promise(function(resolve, reject){
                reject(error);
            })
		}
		
		let resEmbed = new Discord.RichEmbed();

		resEmbed.setTitle(wInfo.name);
		resEmbed.setDescription(wInfo.description);
		resEmbed.setThumbnail('http://census.daybreakgames.com/files/ps2/images/static/'+wInfo.image_id+'.png');
		resEmbed.setFooter("ID: "+wInfo.id+" | Command currently in Beta");
		
		if(typeof(wInfo.category) !== 'undefined'){
			resEmbed.addField("Category", wInfo.category, true);
		}

		if(typeof(wInfo.fireRate) !== 'undefined'){
			if(wInfo.fireRate != 0){
				resEmbed.addField("Fire Rate", (60*(1000/wInfo.fireRate)).toPrecision(3), true);
			}
			resEmbed.addField("Clip", wInfo.clip, true);
			resEmbed.addField("Capacity", wInfo.ammo, true);
			if(typeof(wInfo.chamber) === 'undefined'){
				resEmbed.addField("Reload", wInfo.reload/1000, true);
			}
		}

		if(typeof(wInfo.damage) !== 'undefined' && typeof(wInfo.maxDamage) == 'undefined'){
			resEmbed.addField("Damage", wInfo.damage, true);
			// resEmbed.addField("Min Damage", wInfo.minDamage, true);
		}

		if(typeof(wInfo.maxDamage) !== 'undefined'){
			resEmbed.addField("Short Reload", wInfo.reload/1000+"s", true);
			resEmbed.addField("Long Reload", (wInfo.reload/1000+wInfo.chamber/1000).toPrecision(3)+"s", true);
			resEmbed.addField("Max Damage", wInfo.maxDamage+" @ "+wInfo.maxDamageRange+"m", true);
			resEmbed.addField("Min Damage", wInfo.minDamage+" @ "+wInfo.minDamageRange+"m", true);
			if(wInfo.pellets != "1"){
				resEmbed.addField("Pellets", wInfo.pellets, true);
			}
			resEmbed.addField("Muzzle Velocity", wInfo.speed, true);
		}

		if(typeof(wInfo.directDamage) !== 'undefined'){
			resEmbed.addField("Direct Damage", wInfo.directDamage, true);
			resEmbed.addField("Indirect Damage", wInfo.indirectDamage, true);
		}

		return new Promise(function(resolve, reject){
			resolve(resEmbed);
		})
	}
}