const Discord = require('discord.js');
var got = require('got');
var messageHandler = require('./messageHandler.js');

var onlineInfo = async function(oTag, platform){
	let uri = 'http://census.daybreakgames.com/s:'+process.env.serviceID+'/get/'+platform+'/outfit?alias_lower='+oTag+'&c:resolve=member_online_status,rank,member_character_name&c:join=character^on:leader_character_id^to:character_id&c:join=characters_world^on:leader_character_id^to:character_id';
	let response = "";
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
		return new Promise(function(resolve, reject){
			reject(response.error);
		})
	}
	if(typeof(response.outfit_list) === 'undefined'){
		return new Promise(function(resolve, reject){
			reject("API Error");
		})
	}
	if(typeof(response.outfit_list[0]) === 'undefined'){
		return new Promise(function(resolve, reject){
			reject(oTag+" not found");
		})
	}
	let urlBase = 'https://ps2.fisu.pw/player/?name=';
	if(platform == 'ps2ps4us:v2'){
		urlBase = 'https://ps4us.ps2.fisu.pw/player/?name=';
	}
	else if(platform == 'ps2ps4eu:v2'){
		urlBase = 'https://ps4eu.ps2.fisu.pw/player/?name=';
	}
	let data = response.outfit_list[0];
	let resObj = {
		name: data.name,
		alias: data.alias,
		memberCount: data.member_count,
		onlineCount: 0
	}
	if(data.members[0].online_status == "service_unavailable"){
		resObj.onlineCount = "Online member count unavailable";
		return new Promise(function(resolve, reject){
			resolve(resObj);
		})
	}
	if(typeof(data.members[0].name) === 'undefined'){
		return new Promise(function(resolve, reject){
			reject("API error: names not returned")
		})
	}
	if(typeof(data.leader_character_id_join_character) !== 'undefined'){
		resObj.faction = data.leader_character_id_join_character.faction_id;
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
	for(i in data.members){
		if(data.members[i].online_status > 0){
			resObj.onlineCount += 1;
			onlineMembers[Number.parseInt(data.members[i].rank_ordinal)-pcModifier].push("["+data.members[i].name.first+"]("+urlBase+data.members[i].name.first+")");
		}
		if(pcModifier == 0 && rankNames[Number.parseInt(data.members[i].rank_ordinal)] == ""){
			rankNames[Number.parseInt(data.members[i].rank_ordinal)] = data.members[i].rank;
		}
	}
	for(i in onlineMembers){
		onlineMembers[i].sort(function (a, b) {return a.toLowerCase().localeCompare(b.toLowerCase());});  //This sorts ignoring case: https://stackoverflow.com/questions/8996963/how-to-perform-case-insensitive-sorting-in-javascript#9645447
	}
	resObj.onlineMembers = onlineMembers;
	resObj.rankNames = rankNames;
	return new Promise(function(resolve, reject){
		resolve(resObj);
	})
}

module.exports = {
	online: async function(oTag, platform){
		if(messageHandler.badQuery(oTag)){
			return new Promise(function(resolve, reject){
                reject("Outfit search contains disallowed characters");
            })
		}

		try{
			oInfo = await onlineInfo(oTag, platform);
		}
		catch(error){
			return new Promise(function(resolve, reject){
				reject(error);
			})
		}

		let resEmbed = new Discord.MessageEmbed();

		resEmbed.setTitle(oInfo.name);
		resEmbed.setDescription(oInfo.alias+"\n"+oInfo.onlineCount+"/"+oInfo.memberCount+" online");
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
		if(oInfo.onlineCount == "Online member count unavailable"){
			resEmbed.addField(oInfo.onlineCount, "", true);
			return new Promise(function(resolve, reject){
				resolve(resEmbed);
			})
		}
		switch (oInfo.faction){
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
		for(let i = 0; i < 8; i++){
			if(oInfo.onlineMembers[i].length > 0){
				anyOn = true;
				try{
					resEmbed.addField(oInfo.rankNames[i], oInfo.onlineMembers[i], true);
				}
				catch{
					resEmbed.addField(oInfo.rankNames[i], "Too many to display", true);
				}
				
			}
		}
		return new Promise(function(resolve, reject){
			resolve(resEmbed);
		})
	}
}