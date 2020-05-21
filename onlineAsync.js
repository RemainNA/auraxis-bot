const Discord = require('discord.js');
var got = require('got');

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
	let data = response.outfit_list[0];
	let resObj = {
		name: data.name,
		alias: data.alias,
		faction: data.leader_character_id_join_character.faction_id,
		owner: data.leader_character_id_join_character.name.first,
		memberCount: data.member_count,
		onlineCount: 0
	}
	if(data.members[0].online_status == "service_unavailable"){
		resObj.onlineCount = "Online member count unavailable";
		onlineServiceAvailable = false;
	}
	else{
		onlineMembers = [];
		for(i in data.members){
			if(data.members[i].online_status > 0){
				resObj.onlineCount += 1;
				onlineMembers.push(data.members[i].name.first);
			}
		}
		if(onlineMembers.length == 0){
			onlineMembers.push(':x:');
		}
		onlineMembers.sort(function (a, b) {return a.toLowerCase().localeCompare(b.toLowerCase());});  //This sorts ignoring case: https://stackoverflow.com/questions/8996963/how-to-perform-case-insensitive-sorting-in-javascript#9645447
		resObj.onlineMembers = onlineMembers;
	}
	return new Promise(function(resolve, reject){
		resolve(resObj);
	})
}

module.exports = {
	online: async function(oTag, platform){
		try{
			oInfo = await onlineInfo(oTag, platform);
		}
		catch(error){
			return new Promise(function(resolve, reject){
				reject(error);
			})
		}

		let resEmbed = new Discord.RichEmbed();

		resEmbed.setTitle(oInfo.name);
		resEmbed.setDescription(oInfo.alias);
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
		resEmbed.addField("Online "+oInfo.onlineCount+"/"+oInfo.memberCount, oInfo.onlineMembers, true);
		return new Promise(function(resolve, reject){
			resolve(resEmbed);
		})
	}
}