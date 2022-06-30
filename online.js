// @ts-check
/**
 * Handles the `/online` command
 * @ts-check
 * @module online
 */

const Discord = require('discord.js');
const { badQuery, censusRequest, faction} = require('./utils.js');
const i18n = require('i18n');

/**
 * Get who is online in `oTag`
 * @param {string} oTag - outfit tag to check
 * @param {string} platform - platform the outfit is on
 * @param {string | null} outfitID - outfit ID to check
 * @param {string} locale - locale to use
 * @returns a object containing the current online membeers of the outfit
 */
const onlineInfo = async function(oTag, platform, outfitID = null, locale = "en-US"){
	let url = `/outfit?alias_lower=${oTag}&c:resolve=member_online_status,rank,member_character_name&c:join=character^on:leader_character_id^to:character_id&c:join=characters_world^on:leader_character_id^to:character_id`;
	if(outfitID != null){
		url = `/outfit/${outfitID}?c:resolve=member_online_status,rank,member_character_name&c:join=character^on:leader_character_id^to:character_id&c:join=characters_world^on:leader_character_id^to:character_id`
	}
	let response = await censusRequest(platform, 'outfit_list', url);
	if(response.length == 0){
		throw `${oTag} not found`;
	}
	let urlBase = 'https://ps2.fisu.pw/player/?name=';
	if(platform == 'ps2ps4us:v2'){
		urlBase = 'https://ps4us.ps2.fisu.pw/player/?name=';
	}
	else if(platform == 'ps2ps4eu:v2'){
		urlBase = 'https://ps4eu.ps2.fisu.pw/player/?name=';
	}
	let data = response[0];
	let resObj = {
		name: data.name,
		alias: data.alias,
		memberCount: data.member_count,
		onlineCount: 0,
		world: data.leader_character_id_join_characters_world.world_id,
		outfitID: data.outfit_id
	}
	if(typeof(data.leader_character_id_join_character) !== 'undefined'){
		resObj.faction = data.leader_character_id_join_character.faction_id;
	}
	if(data.members[0].online_status == "service_unavailable"){
		resObj.onlineCount = "Online member count unavailable";
		return resObj;
	}
	if(typeof(data.members[0].name) === 'undefined'){
		throw "API error: names not returned";
	}
	let pcModifier = 0;
	let rankNames = ["","","","","","","",""];
	let onlineMembers = [[],[],[],[],[],[],[],[]];
	if(typeof(data.ranks) !== 'undefined'){
		pcModifier = 1;
		for(let rank of data.ranks){
			rankNames[Number.parseInt(rank.ordinal)-pcModifier] = rank.name;
		}
	}
	for(const i in data.members){
		if(data.members[i].online_status > 0){
			resObj.onlineCount += 1;
			onlineMembers[Number.parseInt(data.members[i].rank_ordinal)-pcModifier].push("["+data.members[i].name.first+"]("+urlBase+data.members[i].name.first+")");
		}
		if(pcModifier == 0 && rankNames[Number.parseInt(data.members[i].rank_ordinal)] == ""){
			rankNames[Number.parseInt(data.members[i].rank_ordinal)] = data.members[i].rank;
		}
	}
	for(const i in onlineMembers){
		onlineMembers[i].sort(function (a, b) {return a.toLowerCase().localeCompare(b.toLowerCase());});  //This sorts ignoring case: https://stackoverflow.com/questions/8996963/how-to-perform-case-insensitive-sorting-in-javascript#9645447
	}
	resObj.onlineMembers = onlineMembers;
	resObj.rankNames = rankNames;
	return resObj;
}

/**
 * Used to get the number total number of characters from online outfit members
 * @param {string[]} arr - array of online members
 * @returns the amount of characters in the array
 */
const totalLength = function(arr){
	let len = 0;
	for(const i in arr){
		len += arr[i].length+1;
	}
	return len;
}

module.exports = {
	/**
	 * Get the online members of an outfit
	 * @param {string} oTag - outfit tag to check
	 * @param {string} platform - platform the outfit is on
	 * @param {string} outfitID - outfit ID to check
	 * @param {string} locale - locale to use
	 * @returns a discord embed of the online members of the outfit
	 */
	online: async function(oTag, platform, outfitID = null, locale = "en-US"){
		if(badQuery(oTag)){
			throw i18n.__({phrase: "Outfit search contains disallowed characters", locale: locale});
		}
		if(oTag.length > 4){
			throw i18n.__mf({phrase: "{tag} is longer than 4 letters, please enter a tag", locale: locale}, {tag: oTag});
		}

		let oInfo = await onlineInfo(oTag, platform, outfitID, locale);
		let resEmbed = new Discord.MessageEmbed();

		resEmbed.setTitle(oInfo.name);
		resEmbed.setDescription(oInfo.alias+"\n"+i18n.__mf({phrase: "{online}/{total} online", locale: locale}, 
		{online: oInfo.onlineCount, total: oInfo.memberCount}));
		resEmbed.setTimestamp();
		if(platform == 'ps2:v2'){
			resEmbed.setURL('http://ps2.fisu.pw/outfit/?name='+oInfo.alias);
		}
		else if(platform == 'ps2ps4us:v2'){
			resEmbed.setURL('http://ps4us.ps2.fisu.pw/outfit/?name='+oInfo.alias);
		}
		else if(platform == 'ps2ps4eu:v2'){
			resEmbed.setURL('http://ps4eu.ps2.fisu.pw/outfit/?name='+oInfo.alias);
		}
		resEmbed.setColor(faction(oInfo.faction).color)
		if(oInfo.onlineCount == "Online member count unavailable"){
			resEmbed.addField(i18n.__({phrase: oInfo.onlineCount, locale: locale}), "-", true);
			resEmbed.setDescription(oInfo.alias+"\n"+"?/"+oInfo.memberCount+" online");

			return resEmbed;
		}
		for(let i = 0; i < 8; i++){
			if(oInfo.onlineMembers[i].length > 0){
				if(totalLength(oInfo.onlineMembers[i]) <= 1024){
					resEmbed.addField(oInfo.rankNames[i]+" ("+oInfo.onlineMembers[i].length+")", `${oInfo.onlineMembers[i]}`.replace(/,/g, '\n'), true);
				}
				else{
					resEmbed.addField(oInfo.rankNames[i]+" ("+oInfo.onlineMembers[i].length+")", i18n.__({phrase: "Too many to display", locale: locale}), true);
				}
			}
		}
		return resEmbed;
	},

	onlineInfo: onlineInfo,
	totalLength: totalLength
}