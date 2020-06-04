// This file defines functionality to parse weapons.json and return the relevant info
// Currently in beta

const Discord = require('discord.js');
var weaponsJSON = require('./weapons.json');

function CoFUpdated(CoF){
	for(let x of CoF){
		if(x != "?"){
			return true;
		}
	}
	return false;
}

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
		resEmbed.setThumbnail('http://census.daybreakgames.com/files/ps2/images/static/'+wInfo.image_id+'.png');
		
		if(typeof(wInfo.category) !== 'undefined'){
			resEmbed.addField("Category", wInfo.category, true);
		}

		if(typeof(wInfo.fireRate) !== 'undefined'){
			if(wInfo.fireRate != 0 && wInfo.clip != 1){
				resEmbed.addField("Fire Rate", (60*(1000/wInfo.fireRate)).toPrecision(3), true);
			}
			if(typeof(wInfo.clip) !== 'undefined' && wInfo.clip != 1){
				resEmbed.addField("Clip", wInfo.clip, true);
			}
			if(typeof(wInfo.ammo) !== 'undefined' && wInfo.ammo != 1){
				resEmbed.addField("Capacity", wInfo.ammo, true);
			}
			if(typeof(wInfo.chamber) === 'undefined' && typeof(wInfo.reload) !== 'undefined' && wInfo.reload != 0){
				resEmbed.addField("Reload", wInfo.reload/1000+"s", true);
			}
		}

		if(typeof(wInfo.damage) !== 'undefined' && typeof(wInfo.maxDamage) == 'undefined'){
			resEmbed.addField("Damage", wInfo.damage, true);
		}

		if(typeof(wInfo.maxDamage) !== 'undefined'){
			if(typeof(wInfo.chamber) !== 'undefined'){
				resEmbed.addField("Short Reload", wInfo.reload/1000+"s", true);
				resEmbed.addField("Long Reload", (wInfo.reload/1000+wInfo.chamber/1000).toPrecision(3)+"s", true);
			}
			else if(typeof(wInfo.reload) !== 'undefined' && wInfo.reload != 0){
				resEmbed.addField("Reload", wInfo.reload/1000+"s", true);
			}
			resEmbed.addField("Max Dmg", wInfo.maxDamage+" @ "+wInfo.maxDamageRange+"m", true);
			resEmbed.addField("Min Dmg", wInfo.minDamage+" @ "+wInfo.minDamageRange+"m", true);
			if(wInfo.pellets > 1){
				resEmbed.addField("Pellets", wInfo.pellets, true);
			}
			if(typeof(wInfo.speed) !== 'undefined'){
				resEmbed.addField("Muzzle Vel", wInfo.speed+" m/s", true);
			}
		}

		if(typeof(wInfo.directDamage) !== 'undefined'){
			resEmbed.addField("Direct Damage", wInfo.directDamage, true);
			if(typeof(wInfo.indirectDamage) !== 'undefined' && wInfo.indirectDamage != 0){
				resEmbed.addField("Indirect Damage", wInfo.indirectDamage, true);
			}
		}

		let hipCOFMin = ["?","?","?","?","?","?"];
		let hipCOFMax = ["?","?","?","?","?","?"];
		let adsCOFMin = ["?","?","?","?","?","?"];
		let adsCOFMax = ["?","?","?","?","?","?"];

		if(typeof(wInfo.verticalRecoil) !== 'undefined'){
			if(typeof(wInfo.adsCofRecoil) !== 'undefined'){
				resEmbed.addField("Bloom (hip/ADS)", wInfo.hipCofRecoil+"/"+wInfo.adsCofRecoil, true);
			}
			else{
				resEmbed.addField("Bloom (hip)", wInfo.hipCofRecoil, true);
			}
			resEmbed.addField("Vertical Recoil", wInfo.verticalRecoil, true);
			resEmbed.addField("Recoil Angle (min/max)", wInfo.recoilAngleMin+"/"+wInfo.recoilAngleMax, true);
			resEmbed.addField("Horizontal Recoil (min/max)", wInfo.recoilHorizontalMin+"/"+wInfo.recoilHorizontalMax, true);
			resEmbed.addField("Horizontal Tolerance", wInfo.recoilHorizontalTolerance, true);
			resEmbed.addField("First Shot Multiplier", wInfo.firstShotMultiplier+"x", true);
			resEmbed.addField("Headshot Multiplier", Number(wInfo.headshotMultiplier)+1+"x", true);
			if(typeof(wInfo.standingCofMin) !== 'undefined'){
				hipCOFMin[0] = wInfo.standingCofMin;
				hipCOFMax[0] = wInfo.standingCofMax;
			}
			if(typeof(wInfo.crouchingCofMin) !== 'undefined'){
				hipCOFMin[1] = wInfo.crouchingCofMin;
				hipCOFMax[1] = wInfo.crouchingCofMax;
			}
			if(typeof(wInfo.runningCofMin) !== 'undefined'){
				hipCOFMin[2] = wInfo.runningCofMin;
				hipCOFMax[2] = wInfo.runningCofMax;
			}
			if(typeof(wInfo.sprintingCofMin) !== 'undefined'){
				hipCOFMin[3] = wInfo.sprintingCofMin;
				hipCOFMax[3] = wInfo.sprintingCofMax;
			}
			if(typeof(wInfo.fallingCofMin) !== 'undefined'){
				hipCOFMin[4] = wInfo.fallingCofMin;
				hipCOFMax[4] = wInfo.fallingCofMax;
			}
			if(typeof(wInfo.crouchWalkingCofMin) !== 'undefined'){
				hipCOFMin[5] = wInfo.crouchWalkingCofMin;
				hipCOFMax[5] = wInfo.crouchWalkingCofMax;
			}
		}

		if(typeof(wInfo.adsMoveSpeed) !== 'undefined'){
			resEmbed.addField("ADS Move Speed", wInfo.adsMoveSpeed, true);
			if(typeof(wInfo.standingCofMinADS) !== 'undefined'){
				adsCOFMin[0] = wInfo.standingCofMinADS;
				adsCOFMax[0] = wInfo.standingCofMaxADS;
			}
			if(typeof(wInfo.crouchingCofMinADS) !== 'undefined'){
				adsCOFMin[1] = wInfo.crouchingCofMinADS;
				adsCOFMax[1] = wInfo.crouchingCofMaxADS;
			}
			if(typeof(wInfo.runningCofMinADS) !== 'undefined'){
				adsCOFMin[2] = wInfo.runningCofMinADS;
				adsCOFMax[2] = wInfo.runningCofMaxADS;
			}
			if(typeof(wInfo.sprintingCofMinADS) !== 'undefined'){
				adsCOFMin[3] = wInfo.sprintingCofMinADS;
				adsCOFMax[3] = wInfo.sprintingCofMaxADS;
			}
			if(typeof(wInfo.fallingCofMinADS) !== 'undefined'){
				adsCOFMin[4] = wInfo.fallingCofMinADS;
				adsCOFMax[4] = wInfo.fallingCofMaxADS;
			}
			if(typeof(wInfo.crouchWalkingCofMinADS) !== 'undefined'){
				adsCOFMin[5] = wInfo.crouchWalkingCofMinADS;
				adsCOFMax[5] = wInfo.crouchWalkingCofMaxADS;
			}
		}

		if(CoFUpdated(hipCOFMin) || CoFUpdated(adsCOFMin)){
			resEmbed.addField("CoF", "*CoF shown Stand/Crouch/Walk/Sprint/Fall/Crouch Walk*");
		}

		if(CoFUpdated(hipCOFMin)){
			resEmbed.addField("Hipfire CoF Min", hipCOFMin[0]+"/"+hipCOFMin[1]+"/"+hipCOFMin[2]+"/"+hipCOFMin[3]+"/"+hipCOFMin[4]+"/"+hipCOFMin[5], true);
			resEmbed.addField("Hipfire CoF Max", hipCOFMax[0]+"/"+hipCOFMax[1]+"/"+hipCOFMax[2]+"/"+hipCOFMax[3]+"/"+hipCOFMax[4]+"/"+hipCOFMax[5], true);
			resEmbed.addBlankField(true);
		}

		if(CoFUpdated(adsCOFMin)){
			resEmbed.addField("ADS CoF Min", adsCOFMin[0]+"/"+adsCOFMin[1]+"/"+adsCOFMin[2]+"/"+adsCOFMin[3]+"/"+adsCOFMin[4]+"/"+adsCOFMin[5], true);
			resEmbed.addField("ADS CoF Max", adsCOFMax[0]+"/"+adsCOFMax[1]+"/"+adsCOFMax[2]+"/"+adsCOFMax[3]+"/"+adsCOFMax[4]+"/"+adsCOFMax[5], true);
			resEmbed.addBlankField(true);
		}

		resEmbed.setDescription(wInfo.description);
		resEmbed.setFooter("ID: "+wInfo.id+" | Command currently in Beta");

		return new Promise(function(resolve, reject){
			resolve(resEmbed);
		})
	}
}