/**
 * Look up basic information about an outfit
 * @module outfit
 * @typedef { import('pg').Client} pg.Client
 */
const Discord = require('discord.js');
const { serverNames, badQuery, censusRequest, localeNumber, faction } = require('./utils.js');
const bases = require('./static/bases.json');
const i18n = require('i18n');

/**
 * Get basic information about an outfit, online members, owned bases etc.
 * @param {string} oTag - outfit tag to query the PS2 Census API with
 * @param {string} platform - which platform to request, eg. ps2:v2, ps2ps4us:v2, or ps2ps4eu:v2
 * @param {string | null} oID - outfit ID to query the PS2 Census API with 
 * @param {string} locale - locale to use e.g. en-US
 * @throws if outfit could not be found or if there was an error gathering outfit information
 */
const basicInfo = async function(oTag, platform, oID, locale="en-US"){
	let url = `/outfit?alias_lower=${oTag}&c:resolve=member_online_status&c:join=character^on:leader_character_id^to:character_id&c:join=character^on:members.character_id^to:character_id^hide:certs&c:join=characters_world^on:leader_character_id^to:character_id`;
	if(oID != null){
		url = `/outfit/${oID}?c:resolve=member_online_status&c:join=character^on:leader_character_id^to:character_id&c:join=character^on:members.character_id^to:character_id^hide:certs&c:join=characters_world^on:leader_character_id^to:character_id`;
	}
	let response = await censusRequest(platform, 'outfit_list', url);
	if(response.length == 0){
		throw i18n.__mf({phrase: '{name} not found', locale: locale}, {name: oTag});
	}
	let data = response[0];
	if(typeof(data.leader_character_id_join_character) === 'undefined'){
		throw i18n.__({phrase: 'Outfit found, but some information is missing.  Please try again or contact the developer if the issue persists.', locale: locale});
	}
	let resObj = {
		name: data.name,
		alias: data.alias,
		faction: data.leader_character_id_join_character.faction_id,
		owner: data.leader_character_id_join_character.name.first,
		memberCount: Number.parseInt(data.member_count),
		worldId: -1,
		onlineDay: 0,
		onlineWeek: 0,
		onlineMonth: 0,
		outfitID: data.outfit_id,
		timeCreated: data.time_created
	};
	if(typeof(data.leader_character_id_join_characters_world) !== 'undefined'){
		resObj.worldId = data.leader_character_id_join_characters_world.world_id;
	}

	let onlineServiceAvailable = true;
	if(data.members != undefined && data.members[0].online_status == "service_unavailable"){
		resObj["onlineMembers"] = i18n.__({phrase: "Online member count unavailable", locale: locale});
		onlineServiceAvailable = false;
	}
	else{
		resObj["onlineMembers"] = 0;
	}
	
	const now = Math.round(Date.now() / 1000); //Current Unix epoch

	for(const i in data.members){
		if(data.members[i].online_status > 0 && onlineServiceAvailable){
			resObj["onlineMembers"] += 1;
			resObj["onlineDay"] += 1;
			resObj["onlineWeek"] += 1;
			resObj["onlineMonth"] += 1;
		}
		else if(typeof(data.members[i].members_character_id_join_character) === 'undefined'){
			continue;
		}
		else if(now - data.members[i].members_character_id_join_character.times.last_login <= 86400){
			resObj["onlineDay"] += 1;
			resObj["onlineWeek"] += 1;
			resObj["onlineMonth"] += 1;
		}
		else if(now - data.members[i].members_character_id_join_character.times.last_login <= 604800){
			resObj["onlineWeek"] += 1;
			resObj["onlineMonth"] += 1;
		}
		else if(now - data.members[i].members_character_id_join_character.times.last_login <= 2592000){
			resObj["onlineMonth"] += 1;
		}
	}

	return resObj;
}

/**
 * Get the bases an outfit owns
 * @param {string} outfitID - outfit ID to query the database with
 * @param {number} worldID - the server ID the outfit is on
 * @param {pg.Client} pgClient - Postgres client to use
 * @returns Array of owned bases
 */
const ownedBases = async function(outfitID, worldID, pgClient){
	let oBases = [];
	try{
		const res = await pgClient.query("SELECT * FROM bases WHERE outfit = $1 AND world = $2;", [outfitID, worldID]);
		for(const row of res.rows){
			oBases.push(row);
		}
		return oBases;
	}
	catch(err){
		console.log(err);
		return [];
	}
}

/**
 * The central bases for each continent
 */
const centralBases = [
    6200, // The Crown
    222280, // The Ascent
    254000, // Eisa
    298000 // Nason's Defiance
]

/**
 * Generate an outfit report on https://wt.honu.pw/report
 * @param {string[]} outfits - the outfits to include in the report
 * @param {number} start - start time of the repot
 * @param {number} end - end time of the report
 * @returns the URL to the report
 */
const generateReport = function(outfits, start, end){
	let reportString = `${start},${end};`;
	for(const outfit of outfits){
		reportString += `o${outfit};`;
	}
	const encodedString = Buffer.from(reportString, 'utf-8').toString('base64');
	return `https://wt.honu.pw/report/${encodedString}`;
}

module.exports = {
	/**
	 * Generate a discord embed overview of an outfit
 	 * @param {string} oTag - outfit tag to query the PS2 Census API with
 	 * @param {string} platform - which platform to request, eg. ps2:v2, ps2ps4us:v2, or ps2ps4eu:v2
 	 * @param {pg.Client} pgClient - Postgres client to use
 	 * @param {string | null} oID - outfit ID to query the PS2 Census API with 
 	 * @param {string} locale - locale to use e.g. en-US
	 * @returns a discord embed object and an Array of buttons
	 * @throw if `oTag` contains invalid characters or it too long
	 */
	outfit: async function(oTag, platform, pgClient, oID = null, locale = "en-US"){
		if(badQuery(oTag)){
			throw i18n.__({phrase: "Outfit search contains disallowed characters", locale: locale});
		}
		if(oTag.length > 4){
			throw i18n.__mf({phrase: "{tag} is longer than 4 letters, please enter a tag", locale: locale}, {tag: oTag});
		}

		const oInfo = await basicInfo(oTag, platform, oID);
		const oBases = await ownedBases(oInfo.outfitID, oInfo.worldId, pgClient);

		let resEmbed = new Discord.MessageEmbed();

		resEmbed.setTitle(oInfo.name);
		resEmbed.setThumbnail(`https://www.outfit-tracker.com/outfit-logo/${oInfo.outfitID}.png`);
		resEmbed.setFooter({text: i18n.__({phrase: "outfitDecalSource", locale: locale})});
		if(oInfo.alias != ""){
			resEmbed.setDescription(oInfo.alias);
			if(platform == 'ps2:v2'){
				resEmbed.setURL('http://ps2.fisu.pw/outfit/?name='+oInfo.alias);
			}
			else if(platform == 'ps2ps4us:v2'){
				resEmbed.setURL('http://ps4us.ps2.fisu.pw/outfit/?name='+oInfo.alias);
			}
			else if(platform == 'ps2ps4eu:v2'){
				resEmbed.setURL('http://ps4eu.ps2.fisu.pw/outfit/?name='+oInfo.alias);
			}
		}
		resEmbed.addField(i18n.__({phrase: "Founded", locale: locale}), `<t:${oInfo.timeCreated}:D>`, true);
		resEmbed.addField(i18n.__({phrase: "Members", locale: locale}), localeNumber(oInfo.memberCount, locale), true);
		const dayPc = localeNumber((oInfo.onlineDay/oInfo.memberCount)*100, locale);
		const weekPc = localeNumber((oInfo.onlineWeek/oInfo.memberCount)*100, locale);
		const monthPc = localeNumber((oInfo.onlineMonth/oInfo.memberCount)*100, locale);
		resEmbed.addField(i18n.__({phrase: "Online", locale: locale}), `${oInfo.onlineMembers}`, true);
		resEmbed.addField(i18n.__({phrase: "Last day", locale: locale}), localeNumber(oInfo.onlineDay, locale)+" ("+dayPc+"%)", true);
		resEmbed.addField(i18n.__({phrase: "Last week", locale: locale}), localeNumber(oInfo.onlineWeek, locale)+" ("+weekPc+"%)", true);
		resEmbed.addField(i18n.__({phrase: "Last month", locale: locale}), localeNumber(oInfo.onlineMonth, locale)+" ("+monthPc+"%)", true);
		resEmbed.addField(i18n.__({phrase: "Server", locale: locale}), i18n.__({phrase: serverNames[Number(oInfo.worldId)], locale: locale}), true);

		const factionInfo = faction(oInfo.faction);
		resEmbed.addField(i18n.__({phrase: "Faction", locale: locale}), `${factionInfo.decal} ${i18n.__({phrase: factionInfo.initial, locale: locale})}`, true);
		resEmbed.setColor(factionInfo.color);

		if(platform == "ps2:v2"){
			resEmbed.addField(i18n.__({phrase: 'Owner', locale: locale}), "["+oInfo.owner+"]("+"https://ps2.fisu.pw/player/?name="+oInfo.owner+")", true);
		}
		else if(platform == "ps2ps4us:v2"){
			resEmbed.addField(i18n.__({phrase: 'Owner', locale: locale}), "["+oInfo.owner+"]("+"https://ps4us.ps2.fisu.pw/player/?name="+oInfo.owner+")", true);
		}
		else if(platform == "ps2ps4eu:v2"){
			resEmbed.addField(i18n.__({phrase: 'Owner', locale: locale}), "["+oInfo.owner+"]("+"https://ps4eu.ps2.fisu.pw/player/?name="+oInfo.owner+")", true);
		}
		let auraxium = 0;
		let synthium = 0;
		let polystellarite = 0;
		let ownedNames = [];
		for(let base of oBases){
			if(base.facility in bases){
				const baseInfo = bases[base.facility];
				ownedNames.push(baseInfo.name);
				if(centralBases.includes(base.facility)){
					polystellarite += 2;
					continue;
				}
				switch(baseInfo.type){
					case "Small Outpost":
						auraxium += 5;
						break;
					case "Large Outpost":
						auraxium += 25;
						break;
					case "Construction Outpost":
						synthium += 3;
						break;
					case "Bio Lab":
						synthium += 8;
						break;
					case "Amp Station":
						synthium += 8;
						break;
					case "Tech Plant":
						synthium += 8;
						break;
					case "Containment Site":
						synthium += 8;
						break;
					case "Interlink":
						synthium += 8;
						break;
					case "Trident":
						polystellarite += 1;
						break;
				}
			}
		}
		if((auraxium + synthium + polystellarite) > 0){ //Recognized bases are owned
			resEmbed.addField('<:Auraxium:818766792376713249>', `+${auraxium/5}/min`, true);
			resEmbed.addField('<:Synthium:818766858865475584>', `+${synthium/5}/min`, true);
			resEmbed.addField('<:Polystellarite:818766888238448661>', `+${polystellarite/5}/min`, true);
			resEmbed.addField(i18n.__({phrase: 'Bases owned', locale: locale}), `${ownedNames}`.replace(/,/g, '\n'));
		}

		const row = new Discord.MessageActionRow();
		row.addComponents(
			new Discord.MessageButton()
				.setStyle('PRIMARY')
				.setLabel(i18n.__({phrase: 'View online', locale: locale}))
				.setCustomId(`online%${oInfo.outfitID}%${platform}`)
		);
		if(platform == "ps2:v2"){
			const now = Math.round(Date.now() / 1000);

			row.addComponents(
				new Discord.MessageButton()
					.setStyle('LINK')
					.setURL(generateReport([oInfo.outfitID], now-3600, now))
					.setLabel(i18n.__({phrase: 'Past 1 hour report', locale: locale})),
				new Discord.MessageButton()
					.setStyle('LINK')
					.setURL(generateReport([oInfo.outfitID], now-7200, now))
					.setLabel(i18n.__({phrase: 'Past 2 hour report', locale: locale}))
			);
		}

		return [resEmbed, [row]];
	},

	ownedBases: ownedBases,
	centralBases: centralBases
}