/**
 * This file defines functionality to parse weapons.json and return the relevant info
 * @module weaponInfo
 */

const Discord = require('discord.js');
const weaponsJSON = require('./static/weapons.json');
const {badQuery, localeNumber} = require('./utils.js');
const i18n = require('i18n');

/**
 * Checks if any CoF values has been updated
 * @param {string[]} CoF - list of CoF values for a weapon
 * @returns true if any CoF does not equal "?"
 */
function CoFUpdated(CoF){
	for(let x of CoF){
		if(x != "?"){
			return true;
		}
	}
	return false;
}

/**
 * Only checks if standing Cof is updated
 * @param {string[]} CoF - list of CoF values for a weapon
 * @returns true if only standing Cof does not equal "?"
 */
function standingOnly(CoF){
	return CoF[0] != "?" && CoF[1] == "?" && CoF[2] == "?" && CoF[3] == "?" && CoF[4] == "?" && CoF[5] == "?";
}

/**
 * Get weapon statistics for a weapon
 * @param {string} name - name or ID of weapon to get info for
 * @returns return weapon statistics as JSON
 * @throws if weapon not found
 */
const weaponInfo = async function(name){

	name = name.replace(/[“”]/g, '"');

	//Check if ID matches
	if(typeof(weaponsJSON[name]) !== 'undefined'){
		let returnObj = weaponsJSON[name];
		returnObj.id = name;
		return returnObj;
	}

	//Check for exact match
	for(const id in weaponsJSON){
		if(weaponsJSON[id].name.toLowerCase() == name.toLowerCase()){
			let returnObj = weaponsJSON[id];
			returnObj.id = id;
			return returnObj;
		}
	}

	//check for partial match
	for(const id in weaponsJSON){
		if(weaponsJSON[id].name.toLowerCase().indexOf(name.toLowerCase()) > -1){
			let returnObj = weaponsJSON[id];
			returnObj.id = id;
			return returnObj;
		}
	}

	throw `${name} not found.`;
}

/**
 * Checks if `query` is in any weapon name. Used to create a list of possible weapons to suggest to the user
 * @param {string} query - query to check
 * @returns a list of weapons names that contain `query`
 */
const partialMatches = async function(query){
	let matches = [];
	query = query.replace(/[“”]/g, '"').toLowerCase();

	if(query in weaponsJSON){
		matches.push({name: `${weaponsJSON[query].name} (${weaponsJSON[query].category}) [${query}]`, value: query});
	}

	for(const id in weaponsJSON){
		if(weaponsJSON[id].name.toLowerCase().indexOf(query) > -1){
			matches.push({name: `${weaponsJSON[id].name} (${weaponsJSON[id].category}) [${id}]`, value: id});
		}
		if(matches.length >= 25){
			break;
		}
	}

	return matches;
}

module.exports = {
	/**
	 * Create a discord embed displaying weapon statistics
	 * @param {string} name - name of weapon to show
 	 * @param {string} locale - locale to use e.g. en-US
	 * @returns a discord embed of weapon stats, a description, and it's ID
	 * @throws if `name` contains invalid characters
	 */
	lookup: async function(name, locale="en-US"){
		if(name.indexOf("[") > -1){
			// Account for autocomplete breaking
			const splitList = name.split("[");
			name = splitList[splitList.length-1].split("]")[0];
		}
		if(badQuery(name)){
			throw i18n.__({phrase: "Weapon search contains disallowed characters", locale: locale});
		}

		let wInfo = await weaponInfo(name);
		
		let resEmbed = new Discord.MessageEmbed();

		resEmbed.setTitle(wInfo.name);
		wInfo.image_id != -1 && resEmbed.setThumbnail('http://census.daybreakgames.com/files/ps2/images/static/'+wInfo.image_id+'.png');
		
		if(typeof(wInfo.category) !== 'undefined'){
			resEmbed.addField(i18n.__({phrase: "Category", locale: locale}), wInfo.category, true);
		}

		if(typeof(wInfo.fireRate) !== 'undefined'){
			if(wInfo.fireRate != 0 && wInfo.clip != 1){
				resEmbed.addField(i18n.__({phrase: "Fire Rate", locale: locale}), localeNumber(60*(1000/wInfo.fireRate), locale), true);
			}
		}
		if(typeof(wInfo.heatCapacity) !== 'undefined'){
			resEmbed.addField(i18n.__({phrase: "Heat Capacity", locale: locale}), `${wInfo.heatCapacity}`, true);
			resEmbed.addField(i18n.__({phrase: "Heat Per Shot", locale: locale}), `${wInfo.heatPerShot}`, true);
			resEmbed.addField(i18n.__({phrase: "Heat Bleed Off", locale: locale}), `${wInfo.heatBleedOff}/s`, true);
			resEmbed.addField(i18n.__({phrase: "Recovery Delay", locale: locale}), `${wInfo.heatRecoveryDelay/1000} s\n${(Number(wInfo.overheatPenalty)+Number(wInfo.heatRecoveryDelay))/1000} s Overheated`, true);
		}
		else if (typeof(wInfo.clip) !== 'undefined' && wInfo.clip != 1){
			if(typeof(wInfo.ammo) !== 'undefined' && wInfo.ammo != 1){
				resEmbed.addField(i18n.__({phrase: "Ammo", locale: locale}), 
				i18n.__mf({phrase: "{m} magazine", locale: locale}, {m: wInfo.clip})+"\n"+
				i18n.__mf({phrase: "{c} capacity", locale: locale}, {c: wInfo.ammo}), true);
			}
			else{
				resEmbed.addField(i18n.__({phrase: "Magazine", locale: locale}), wInfo.clip, true);
			}
			if(typeof(wInfo.reload) !== 'undefined' && wInfo.reload != 0){
				if(typeof(wInfo.chamber) !== 'undefined' && wInfo.chamber != 0){
					const shortReload = localeNumber(wInfo.reload/1000, locale);
					const longReload = localeNumber(wInfo.reload/1000+wInfo.chamber/1000, locale);
					resEmbed.addField(i18n.__({phrase: "Reload", locale: locale}), 
					i18n.__mf({phrase: "{time}s Short", locale: locale}, {time: shortReload})+"\n"+
					i18n.__mf({phrase: "{time}s Long", locale: locale}, {time: longReload}), true);
				}
				else{
					// Some weapons with magazines don't have long/short reloads, e.g. P2-120 HEAT
					const reload = localeNumber(wInfo.reload/1000, locale);
					resEmbed.addField(i18n.__({phrase: "Reload", locale: locale}), 
					i18n.__mf({phrase: "{time}s", locale: locale}, {time: reload}), true);
				}
			}
		}
		else if(typeof(wInfo.reload) !== 'undefined' && wInfo.reload != 0){
			resEmbed.addField(i18n.__({phrase: "Reload", locale: locale}), wInfo.reload/1000+"s", true);
		}

		if(wInfo.maxDamage !== undefined && (wInfo.maxDamage != wInfo?.directDamage)){
			resEmbed.addField(i18n.__({phrase: "Damage", locale: locale}), wInfo.maxDamage+" @ "+wInfo.maxDamageRange+"m \n "+wInfo.minDamage+" @ "+wInfo.minDamageRange+"m", true);
			if(wInfo.pellets > 1){
				resEmbed.addField(i18n.__({phrase: "Pellets", locale: locale}), `${wInfo.pellets}`, true);
				resEmbed.addField(i18n.__({phrase: "Pellet Spread", locale: locale}), `${wInfo.pelletSpread}`, true);
			}
		}

		if(wInfo.maxIndirectDamage !== undefined && wInfo.directDamage !== undefined){ 
			if(wInfo.maxIndirectDamage != 0){ // Check for weapons like Tomoe and Doku scout rifles
				resEmbed.addField(i18n.__({phrase: "Direct Damage", locale: locale}), `${wInfo.directDamage}`, true);
				resEmbed.addField(i18n.__({phrase: "Indirect Damage", locale: locale}), 
				`${wInfo.maxIndirectDamage} @ ${wInfo.maxIndirectDamageRadius}m\
				\n ${wInfo.minIndirectDamage} @ ${wInfo.minIndirectDamageRadius}m`, true);
			}
			else{
				resEmbed.addField(i18n.__({phrase: "Damage", locale: locale}), `${wInfo.directDamage}`, true);
			}
		}
		else if(wInfo.maxIndirectDamage !== undefined){ // Lasher has indirect damage, but no direct damage stat as it follows most infantry guns with degradation at range
			resEmbed.addField(i18n.__({phrase: "Indirect Damage", locale: locale}), 
				`${wInfo.maxIndirectDamage} @ ${wInfo.maxIndirectDamageRadius}m\
				\n ${wInfo.minIndirectDamage} @ ${wInfo.minIndirectDamageRadius}m`, true);
		}

		if(typeof(wInfo.speed) !== 'undefined'){
			resEmbed.addField(i18n.__({phrase: "Muzzle Velocity", locale: locale}), 
			i18n.__mf({phrase: "{speed} m/s", locale: locale}, {speed: wInfo.speed}), true);
		}
		

		let hipCOFMin = ["?","?","?","?","?","?"];
		let hipCOFMax = ["?","?","?","?","?","?"];
		let adsCOFMin = ["?","?","?","?","?","?"];
		let adsCOFMax = ["?","?","?","?","?","?"];

		//Checking for vertical recoil here and below keeps things like med kits from displaying irrelevant stats
		if(typeof(wInfo.adsCofRecoil) !== 'undefined' && typeof(wInfo.hipCofRecoil) !== 'undefined' && typeof(wInfo.verticalRecoil) !== 'undefined'){ 
			resEmbed.addField(i18n.__({phrase: "Bloom (hip/ADS)", locale: locale}), wInfo.hipCofRecoil+"/"+wInfo.adsCofRecoil, true);
		}
		else if(typeof(wInfo.hipCofRecoil) !== 'undefined' && typeof(wInfo.verticalRecoil) !== 'undefined'){
			resEmbed.addField(i18n.__({phrase: "Bloom (hip)", locale: locale}), `${wInfo.hipCofRecoil}`, true);
		}
		wInfo.verticalRecoil != undefined && resEmbed.addField(i18n.__({phrase: "Vertical Recoil", locale: locale}), `${wInfo.verticalRecoil}`, true);
		wInfo.recoilAngleMin != undefined && wInfo.recoilAngleMax != undefined && resEmbed.addField(i18n.__({phrase: "Recoil Angle (min/max)", locale: locale}), wInfo.recoilAngleMin+"/"+wInfo.recoilAngleMax, true);
		wInfo.recoilHorizontalMin != undefined && wInfo.recoilHorizontalMax != undefined && resEmbed.addField(i18n.__({phrase: "Horizontal Recoil (min/max)", locale: locale}), wInfo.recoilHorizontalMin+"/"+wInfo.recoilHorizontalMax, true);
		wInfo.recoilHorizontalTolerance != undefined && resEmbed.addField(i18n.__({phrase: "Horizontal Tolerance", locale: locale}), `${wInfo.recoilHorizontalTolerance}`, true);
		wInfo.firstShotMultiplier != undefined && resEmbed.addField(i18n.__({phrase: "First Shot Multiplier", locale: locale}), `${wInfo.firstShotMultiplier}x`, true);
		wInfo.fireModes?.length != 0 && resEmbed.addField(i18n.__({phrase: "Fire Modes", locale: locale}), `${wInfo.fireModes}`.replace(/,/g, '\n'), true);
		wInfo.headshotMultiplier != undefined && resEmbed.addField(i18n.__({phrase: "Headshot Multiplier", locale: locale}), `${Number(wInfo.headshotMultiplier)+1}x`, true);
		wInfo.defZoom != undefined && wInfo.defZoom != 1 && resEmbed.addField(i18n.__({phrase: "Iron Sights Zoom", locale: locale}), `${wInfo.defZoom}x`, true);

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
			
		if(typeof(wInfo.adsMoveSpeed) !== 'undefined'){
			resEmbed.addField(i18n.__({phrase: "ADS Move Speed", locale: locale}), `${wInfo.adsMoveSpeed}x`, true);
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

		if(wInfo.useInWater !== undefined){
			if(wInfo.useInWater){
				resEmbed.addField(i18n.__({phrase: "Usable in water", locale: locale}), i18n.__({phrase: "yes", locale: locale}), true);
			}
			else{
				resEmbed.addField(i18n.__({phrase: "Usable in water", locale: locale}), i18n.__({phrase: "no", locale: locale}), true);
			}
		}

		if(CoFUpdated(hipCOFMin) || CoFUpdated(adsCOFMin)){
			if(standingOnly(hipCOFMin) || standingOnly(adsCOFMin)){
				resEmbed.addField('\u200b', '\u200b');
			}
			else{
				resEmbed.addField("-------------------", i18n.__({phrase: "*CoF shown Stand/Crouch/Walk/Sprint/Fall/Crouch Walk*", locale: locale}));
			}
		}

		if(CoFUpdated(hipCOFMin)){
			if(standingOnly(hipCOFMin)){
				resEmbed.addField(i18n.__({phrase: "Hipfire CoF Min", locale: locale}), `${hipCOFMin[0]}`, true);
				resEmbed.addField(i18n.__({phrase: "Hipfire CoF Max", locale: locale}), `${hipCOFMax[0]}`, true);
				resEmbed.addField('\u200b', '\u200b', true);
			}
			else{
				resEmbed.addField(i18n.__({phrase: "Hipfire CoF Min", locale: locale}), hipCOFMin[0]+"/"+hipCOFMin[1]+"/"+hipCOFMin[2]+"/"+hipCOFMin[3]+"/"+hipCOFMin[4]+"/"+hipCOFMin[5], true);
				resEmbed.addField(i18n.__({phrase: "Hipfire CoF Max", locale: locale}), hipCOFMax[0]+"/"+hipCOFMax[1]+"/"+hipCOFMax[2]+"/"+hipCOFMax[3]+"/"+hipCOFMax[4]+"/"+hipCOFMax[5], true);
				resEmbed.addField('\u200b', '\u200b', true);
			}
		}

		if(CoFUpdated(adsCOFMin)){
			if(standingOnly(adsCOFMin)){
				resEmbed.addField(i18n.__({phrase: "ADS CoF Min", locale: locale}), `${adsCOFMin[0]}`, true);
				resEmbed.addField(i18n.__({phrase: "ADS CoF Max", locale: locale}), `${adsCOFMax[0]}`, true);
				resEmbed.addField('\u200b', '\u200b', true);
			}
			else{
				resEmbed.addField(i18n.__({phrase: "ADS CoF Min", locale: locale}), adsCOFMin[0]+"/"+adsCOFMin[1]+"/"+adsCOFMin[2]+"/"+adsCOFMin[3]+"/"+adsCOFMin[4]+"/"+adsCOFMin[5], true);
				resEmbed.addField(i18n.__({phrase: "ADS CoF Max", locale: locale}), adsCOFMax[0]+"/"+adsCOFMax[1]+"/"+adsCOFMax[2]+"/"+adsCOFMax[3]+"/"+adsCOFMax[4]+"/"+adsCOFMax[5], true);
				resEmbed.addField('\u200b', '\u200b', true);
			}
			
		}

		resEmbed.setDescription(wInfo.description);
		resEmbed.setFooter({text: i18n.__({phrase: "Weapon ID", locale: locale})+": "+wInfo.id});

		return resEmbed;
	},

	partialMatches: partialMatches
}