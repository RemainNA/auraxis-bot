const Discord = require('discord.js');
const got = require('got');
const { serverNames, badQuery } = require('./utils.js');
const bases = require('./static/bases.json');

const basicInfo = async function(oTag, platform){
	let uri = 'http://census.daybreakgames.com/s:'+process.env.serviceID+'/get/'+platform+'/outfit?alias_lower='+oTag+'&c:resolve=member_online_status&c:join=character^on:leader_character_id^to:character_id&c:join=character^on:members.character_id^to:character_id^hide:certs&c:join=characters_world^on:leader_character_id^to:character_id';
	let response = "";
	try{
		response = await got(uri).json(); 
	}
	catch(err){
		if(err.message.indexOf('404') > -1){
			throw"API Unreachable";
		}
	}
	if(typeof(response.error) !== 'undefined'){
		if(response.error == 'service_unavailable'){
			throw "Census API currently unavailable";
		}
		throw response.error;
	}
	if(typeof(response.outfit_list) === 'undefined'){
		throw "API Error";
	}
	if(typeof(response.outfit_list[0]) === 'undefined'){
		throw `${oTag} not found`;
	}
	let data = response.outfit_list[0];
	if(typeof(data.leader_character_id_join_character) === 'undefined'){
		throw 'Outfit found, but some information is missing.  Please try again or contact the developer if the issue persists.'
	}
	let resObj = {
		name: data.name,
		alias: data.alias,
		faction: data.leader_character_id_join_character.faction_id,
		owner: data.leader_character_id_join_character.name.first,
		memberCount: data.member_count,
		worldId: -1,
		onlineDay: 0,
		onlineWeek: 0,
		onlineMonth: 0,
		outfitID: data.outfit_id
	}
	if(typeof(data.leader_character_id_join_characters_world) !== 'undefined'){
		resObj.worldId = data.leader_character_id_join_characters_world.world_id;
	}

	onlineServiceAvailable = true;
	if(data.members[0].online_status == "service_unavailable"){
		resObj["onlineMembers"] = "Online member count unavailable";
		onlineServiceAvailable = false;
	}
	else{
		resObj["onlineMembers"] = 0;
	}
	
	now = Math.round(Date.now() / 1000); //Current Unix epoch

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

const centralBases = [
    '6200', // The Crown
    '222280', // The Ascent
    '254000', // Eisa
    '298000' // Nason's Defiance
]

module.exports = {
	outfit: async function(oTag, platform, pgClient){
		if(badQuery(oTag)){
			throw "Outfit search contains disallowed characters";
		}

		const oInfo = await basicInfo(oTag, platform);
		const oBases = await ownedBases(oInfo.outfitID, oInfo.worldId, pgClient);

		let resEmbed = new Discord.MessageEmbed();

		resEmbed.setTitle(oInfo.name);
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
		resEmbed.addField("Members", oInfo.memberCount, true);
		resEmbed.addField('\u200b', '\u200b', true)
		let dayPc = Number.parseFloat((oInfo.onlineDay/oInfo.memberCount)*100).toPrecision(3);
		let weekPc = Number.parseFloat((oInfo.onlineWeek/oInfo.memberCount)*100).toPrecision(3);
		let monthPc = Number.parseFloat((oInfo.onlineMonth/oInfo.memberCount)*100).toPrecision(3);
		resEmbed.addField("Online", `${oInfo.onlineMembers}`, true);
		resEmbed.addField("Last day", oInfo.onlineDay+" ("+dayPc+"%)", true);
		resEmbed.addField("Last week", oInfo.onlineWeek+" ("+weekPc+"%)", true);
		resEmbed.addField("Last month", oInfo.onlineMonth+" ("+monthPc+"%)", true);
		resEmbed.addField("Server", serverNames[Number(oInfo.worldId)], true);

		switch (oInfo.faction){
			case "1":
				resEmbed.addField('Faction', '<:VS:818766983918518272> VS', true);
				resEmbed.setColor('PURPLE');
				break;
			case "2":
				resEmbed.addField('Faction', '<:NC:818767043138027580> NC', true);
				resEmbed.setColor('BLUE');
				break;
			case "3":
				resEmbed.addField('Faction', '<:TR:818988588049629256> TR', true);
				resEmbed.setColor('RED');
				break;
			default:
				resEmbed.addField('Faction', '<:NS:819511690726866986> NSO', true);
				resEmbed.setColor('GREY');
		}
		if(platform == "ps2:v2"){
			resEmbed.addField("Owner", "["+oInfo.owner+"]("+"https://ps2.fisu.pw/player/?name="+oInfo.owner+")", true);
		}
		else if(platform == "ps2ps4us:v2"){
			resEmbed.addField("Owner", "["+oInfo.owner+"]("+"https://ps4us.ps2.fisu.pw/player/?name="+oInfo.owner+")", true);
		}
		else if(platform == "ps2ps4eu:v2"){
			resEmbed.addField("Owner", "["+oInfo.owner+"]("+"https://ps4eu.ps2.fisu.pw/player/?name="+oInfo.owner+")", true);
		}
		let auraxium = 0;
		let synthium = 0;
		let polystellarite = 0;
		let ownedNames = [];
		for(let base of oBases){
			if(base.facility in bases){
				const baseInfo = bases[base.facility];
				ownedNames.push(baseInfo.name);
				if(base.facility in centralBases){
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
				}
			}
		}
		if((auraxium + synthium + polystellarite) > 0){ //Recognized bases are owned
			resEmbed.addField('<:Auraxium:818766792376713249>', `+${auraxium/5}/min`, true);
			resEmbed.addField('<:Synthium:818766858865475584>', `+${synthium/5}/min`, true);
			resEmbed.addField('<:Polystellarite:818766888238448661>', `+${polystellarite/5}/min`, true);
			resEmbed.addField('Bases owned', `${ownedNames}`.replace(/,/g, '\n'));
		}

		return resEmbed;
	}
}