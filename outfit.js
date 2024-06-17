/**
 * Look up basic information about an outfit
 * @module outfit
 * @typedef { import('pg').Client} pg.Client
 */
const Discord = require('discord.js');
const { serverNames, badQuery, censusRequest, localeNumber, faction, outfitLink, characterLink, discordEmoji } = require('./utils.js');
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
		leaderID: data.leader_character_id,
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

		let resEmbed = new Discord.EmbedBuilder();

		resEmbed.setTitle(oInfo.name);
		resEmbed.setThumbnail(`https://www.outfit-tracker.com/outfit-logo/${oInfo.outfitID}.png`);
		resEmbed.setFooter({text: i18n.__({phrase: "outfitDecalSource", locale: locale})});
		if(oInfo.alias != "" || platform == "ps2:v2"){
			resEmbed.setURL(outfitLink(oInfo.alias, oInfo.outfitID, platform));
		}
		if(oInfo.alias != ""){
			resEmbed.setDescription(oInfo.alias);
		}
		const dayPc = localeNumber((oInfo.onlineDay/oInfo.memberCount)*100, locale);
		const weekPc = localeNumber((oInfo.onlineWeek/oInfo.memberCount)*100, locale);
		const monthPc = localeNumber((oInfo.onlineMonth/oInfo.memberCount)*100, locale);

		const factionInfo = faction(oInfo.faction);
		resEmbed.addFields(
			{name: i18n.__({phrase: "Founded", locale: locale}), value: `<t:${oInfo.timeCreated}:D>`, inline: true},
			{name: i18n.__({phrase: "Members", locale: locale}), value: localeNumber(oInfo.memberCount, locale), inline: true},
			{name: i18n.__({phrase: "Online", locale: locale}), value: `${oInfo.onlineMembers}`, inline: true},
			{name: i18n.__({phrase: "Last day", locale: locale}), value: localeNumber(oInfo.onlineDay, locale)+" ("+dayPc+"%)", inline: true},
			{name: i18n.__({phrase: "Last week", locale: locale}), value: localeNumber(oInfo.onlineWeek, locale)+" ("+weekPc+"%)", inline: true},
			{name: i18n.__({phrase: "Last month", locale: locale}), value: localeNumber(oInfo.onlineMonth, locale)+" ("+monthPc+"%)", inline: true},
			{name: i18n.__({phrase: "Server", locale: locale}), value: i18n.__({phrase: serverNames[Number(oInfo.worldId)], locale: locale}), inline: true},
			{name: i18n.__({phrase: "Faction", locale: locale}), value: `${factionInfo.decal} ${i18n.__({phrase: factionInfo.initial, locale: locale})}`, inline: true}
		)
		resEmbed.setColor(factionInfo.color);
		resEmbed.addFields({name: i18n.__({phrase: 'Owner', locale: locale}), value: `[${oInfo.owner}](${characterLink(oInfo.owner, oInfo.leaderID, platform)})`, inline: true});
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
					case "CTF Small Outpost":
					case "Seapost":
						auraxium += 5;
						break;
					case "Large Outpost":
					case "CTF Large Outpost":
						auraxium += 25;
						break;
					case "Construction Outpost":
					case "CTF Construction Outpost":
						synthium += 3;
						break;
					case "Bio Lab":
					case "Amp Station":
					case "CTF Amp Station":
					case "Tech Plant":
					case "Containment Site":
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
			resEmbed.addFields(
				{name: `${discordEmoji["Auraxium"]}`, value: i18n.__mf({phrase: "quantityPerMinute", locale: locale}, {quantity: auraxium/5}), inline: true},
				{name: `${discordEmoji["Synthium"]}`, value: i18n.__mf({phrase: "quantityPerMinute", locale: locale}, {quantity: synthium/5}), inline: true},
				{name: `${discordEmoji["Polystellarite"]}`, value: i18n.__mf({phrase: "quantityPerMinute", locale: locale}, {quantity: polystellarite/5}), inline: true},
				{name: i18n.__({phrase: 'Bases owned', locale: locale}), value: `${ownedNames}`.replace(/,/g, '\n'), inline: true}
			)
		}

		const row = new Discord.ActionRowBuilder();
		row.addComponents(
			new Discord.ButtonBuilder()
				.setStyle(Discord.ButtonStyle.Primary)
				.setLabel(i18n.__({phrase: 'View online', locale: locale}))
				.setCustomId(`online%${oInfo.outfitID}%${platform}`)
		);
		if(platform == "ps2:v2"){
			const now = Math.round(Date.now() / 1000);

			row.addComponents(
				new Discord.ButtonBuilder()
					.setStyle(Discord.ButtonStyle.Link)
					.setURL(generateReport([oInfo.outfitID], now-3600, now))
					.setLabel(i18n.__({phrase: 'Past 1 hour report', locale: locale})),
				new Discord.ButtonBuilder()
					.setStyle(Discord.ButtonStyle.Link)
					.setURL(generateReport([oInfo.outfitID], now-7200, now))
					.setLabel(i18n.__({phrase: 'Past 2 hour report', locale: locale}))
			);
			if(oInfo.alias != ""){
				if(platform == 'ps2:v2'){
					row.addComponents(
						new Discord.ButtonBuilder()
							.setURL(`https://ps2.fisu.pw/outfit/?name=${oInfo.alias}`)
							.setLabel(i18n.__({phrase: 'fisuLink', locale: locale}))
							.setStyle(Discord.ButtonStyle.Link)
					);
				}
			}
		}

		return [resEmbed, [row]];
	},

	ownedBases: ownedBases,
	centralBases: centralBases
}