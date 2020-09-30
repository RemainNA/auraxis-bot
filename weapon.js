// This file defines functionality to parse weapons.json and return the relevant info
// Currently in beta

const Discord = require('discord.js');
var weaponsJSON = require('./weapons.json');
var messageHandler = require('./messageHandler.js');

function CoFUpdated(CoF){
	for(let x of CoF){
		if(x != "?"){
			return true;
		}
	}
	return false;
}

function standingOnly(CoF){
	return CoF[0] != "?" && CoF[1] == "?" && CoF[2] == "?" && CoF[3] == "?" && CoF[4] == "?" && CoF[5] == "?";
}

var weaponInfo = async function(name){

	name = name.replace(/[“”]/g, '"');

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
		if(messageHandler.badQuery(name)){
			return new Promise(function(resolve, reject){
                reject("Weapon search contains disallowed characters");
            })
		}

		let wInfo = {};
		try{
            wInfo = await weaponInfo(name);
        }
        catch(error){
            return new Promise(function(resolve, reject){
                reject(error);
            })
		}
		
		let resEmbed = new Discord.MessageEmbed();

		resEmbed.setTitle(wInfo.name);
		resEmbed.setThumbnail('http://census.daybreakgames.com/files/ps2/images/static/'+wInfo.image_id+'.png');
		
		if(typeof(wInfo.category) !== 'undefined'){
			resEmbed.addField("Category", wInfo.category, true);
		}

		if(typeof(wInfo.fireRate) !== 'undefined'){
			if(wInfo.fireRate != 0 && wInfo.clip != 1){
				resEmbed.addField("Fire Rate", (60*(1000/wInfo.fireRate)).toPrecision(3), true);
			}
		}
		if(typeof(wInfo.heatCapacity) !== 'undefined'){
			resEmbed.addField("Heat Capacity", wInfo.heatCapacity, true);
			resEmbed.addField("Heat Per Shot", wInfo.heatPerShot, true);
			resEmbed.addField("Heat Bleed Off", wInfo.heatBleedOff+"/s", true);
			resEmbed.addField("Recovery Delay", wInfo.heatRecoveryDelay/1000+" s \n "+(Number(wInfo.overheatPenalty)+Number(wInfo.heatRecoveryDelay))/1000+" s Overheated", true);
		}
		else if (typeof(wInfo.clip) !== 'undefined' && wInfo.clip != 1){
			if(typeof(wInfo.ammo) !== 'undefined' && wInfo.ammo != 1){
				resEmbed.addField("Ammo", wInfo.clip+" magazine \n"+wInfo.ammo+" capacity", true);
			}
			else{
				resEmbed.addField("Magazine", wInfo.clip, true);
			}
			if(typeof(wInfo.reload) !== 'undefined' && wInfo.reload != 0){
				resEmbed.addField("Reload", wInfo.reload/1000+"s", true);
			}
		}
		else{
			if(typeof(wInfo.chamber) !== 'undefined'){
				resEmbed.addField("Reload", (wInfo.reload/1000).toPrecision(3)+" s Short\n "+(wInfo.reload/1000+wInfo.chamber/1000).toPrecision(3)+" s Long", true);
			}
			else if(typeof(wInfo.reload) !== 'undefined' && wInfo.reload != 0){
				resEmbed.addField("Reload", wInfo.reload/1000+"s", true);
			}
		}

		

		if(typeof(wInfo.maxDamage) !== 'undefined'){	
			resEmbed.addField("Damage", wInfo.maxDamage+" @ "+wInfo.maxDamageRange+"m \n "+wInfo.minDamage+" @ "+wInfo.minDamageRange+"m", true);
			if(wInfo.pellets > 1){
				resEmbed.addField("Pellets", wInfo.pellets, true);
				resEmbed.addField("Pellet Spread", wInfo.pelletSpread, true);
			}
			if(typeof(wInfo.speed) !== 'undefined'){
				resEmbed.addField("Muzzle Vel", wInfo.speed+" m/s", true);
			}
		}

		if(typeof(wInfo.indirectDamage) !== 'undefined' && wInfo.directDamage !== 'undefined'){ //checking for damage equality is pretty much just ruling out the Tomoe
			resEmbed.addField("Direct Damage", wInfo.directDamage, true);
			if(wInfo.indirectDamage != 0){
				resEmbed.addField("Indirect Damage", wInfo.indirectDamage, true);
			}
		}
		else if(typeof(wInfo.damage) !== 'undefined' && typeof(wInfo.maxDamage) == 'undefined'){
			resEmbed.addField("Damage", wInfo.damage, true);
		}

		let hipCOFMin = ["?","?","?","?","?","?"];
		let hipCOFMax = ["?","?","?","?","?","?"];
		let adsCOFMin = ["?","?","?","?","?","?"];
		let adsCOFMax = ["?","?","?","?","?","?"];

		//Checking for vertical recoil here and below keeps things like med kits from displaying irrelevant stats
		if(typeof(wInfo.adsCofRecoil) !== 'undefined' && typeof(wInfo.hipCofRecoil) !== 'undefined' && typeof(wInfo.verticalRecoil) !== 'undefined'){ 
			resEmbed.addField("Bloom (hip/ADS)", wInfo.hipCofRecoil+"/"+wInfo.adsCofRecoil, true);
		}
		else if(typeof(wInfo.hipCofRecoil) !== 'undefined' && typeof(wInfo.verticalRecoil) !== 'undefined'){
			resEmbed.addField("Bloom (hip)", wInfo.hipCofRecoil, true);
		}
		wInfo.verticalRecoil && resEmbed.addField("Vertical Recoil", wInfo.verticalRecoil, true);
		wInfo.recoilAngleMin && wInfo.recoilAngleMax && resEmbed.addField("Recoil Angle (min/max)", wInfo.recoilAngleMin+"/"+wInfo.recoilAngleMax, true);
		wInfo.recoilHorizontalMin && wInfo.recoilHorizontalMax && resEmbed.addField("Horizontal Recoil (min/max)", wInfo.recoilHorizontalMin+"/"+wInfo.recoilHorizontalMax, true);
		wInfo.recoilHorizontalTolerance && resEmbed.addField("Horizontal Tolerance", wInfo.recoilHorizontalTolerance, true);
		wInfo.firstShotMultiplier && resEmbed.addField("First Shot Multiplier", wInfo.firstShotMultiplier+"x", true);
		wInfo.fireModes && resEmbed.addField("Fire modes", wInfo.fireModes, true);
		wInfo.headshotMultiplier && resEmbed.addField("Headshot Multiplier", Number(wInfo.headshotMultiplier)+1+"x", true);
		wInfo.defZoom && wInfo.defZoom != 1 && resEmbed.addField("Iron Sights Zoom", wInfo.defZoom+"x", true);

		if(typeof(wInfo.verticalRecoil) !== 'undefined'){
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
			if(standingOnly(hipCOFMin) || standingOnly(adsCOFMin)){
				resEmbed.addField('\u200b', '\u200b', true)
			}
			else{
				resEmbed.addField("-------------------", "*CoF shown Stand/Crouch/Walk/Sprint/Fall/Crouch Walk*");
			}
		}

		if(CoFUpdated(hipCOFMin)){
			if(standingOnly(hipCOFMin)){
				resEmbed.addField("Hipfire CoF Min", hipCOFMin[0], true);
				resEmbed.addField("Hipfire CoF Max", hipCOFMax[0], true);
				resEmbed.addField('\u200b', '\u200b', true)
			}
			else{
				resEmbed.addField("Hipfire CoF Min", hipCOFMin[0]+"/"+hipCOFMin[1]+"/"+hipCOFMin[2]+"/"+hipCOFMin[3]+"/"+hipCOFMin[4]+"/"+hipCOFMin[5], true);
				resEmbed.addField("Hipfire CoF Max", hipCOFMax[0]+"/"+hipCOFMax[1]+"/"+hipCOFMax[2]+"/"+hipCOFMax[3]+"/"+hipCOFMax[4]+"/"+hipCOFMax[5], true);
				resEmbed.addField('\u200b', '\u200b', true)
			}
		}

		if(CoFUpdated(adsCOFMin)){
			if(standingOnly(adsCOFMin)){
				resEmbed.addField("ADS CoF Min", adsCOFMin[0], true);
				resEmbed.addField("ADS CoF Max", adsCOFMax[0], true);
				resEmbed.addField('\u200b', '\u200b', true)
			}
			else{
				resEmbed.addField("ADS CoF Min", adsCOFMin[0]+"/"+adsCOFMin[1]+"/"+adsCOFMin[2]+"/"+adsCOFMin[3]+"/"+adsCOFMin[4]+"/"+adsCOFMin[5], true);
				resEmbed.addField("ADS CoF Max", adsCOFMax[0]+"/"+adsCOFMax[1]+"/"+adsCOFMax[2]+"/"+adsCOFMax[3]+"/"+adsCOFMax[4]+"/"+adsCOFMax[5], true);
				resEmbed.addField('\u200b', '\u200b', true)
			}
			
		}

		resEmbed.setDescription(wInfo.description);
		resEmbed.setFooter("ID: "+wInfo.id+" | Command currently in Beta");

		return new Promise(function(resolve, reject){
			resolve(resEmbed);
		})
	}
}