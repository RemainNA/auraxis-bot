// This file implements a function which finds and returns the max BR a character reached before joining ASP, and tracks their ASP unlocks and tokens

const Discord = require('discord.js');
const { censusRequest, badQuery } = require('./utils.js');

const basicInfo = async function(cName, platform){
	let response = await censusRequest(platform, 'character_list', `/character?name.first_lower=${cName}&c:resolve=item_full&c:lang=en`);
    if(response.length == 0){
        throw `${cName} not found`;
	}
	let data = response[0];
	if(data.faction_id == "4"){
		throw "NSO not supported";
	}
	if(data.prestige_level == "0"){
		throw `${data.name.first} has not yet unlocked ASP`;
	}
	let br = Number(data.battle_rank.value);
	let availableTokens = 1 + Math.floor(br/25) + 4 * (Number.parseInt(data.prestige_level) - 1);
	let aspTitle = false;
	let decals = []; //count br 101-120 decals
	let tokens = "";
	let tokensContinued = "";
	for (const x in data.items){
		if (Number(data.items[x].item_id) >= 803931 && Number(data.items[x].item_id) <= 803950){
			//record br 101-120 decals
			decals.push(Number(data.items[x].item_id));
		}
		else if(data.items[x].item_type_id == "1" && data.items[x].item_category_id == "133"){
			//record unlocked ASP items
			if((tokens.length + data.items[x].name.en.length + data.items[x].description.en.length + 8) > 1024){
				tokensContinued += `${data.items[x].name.en}: ${data.items[x].description.en}\n`;
				tokensContinued += '----\n'
			}
			else{
				tokens += `${data.items[x].name.en}: ${data.items[x].description.en}\n`;
				tokens += '----\n'
			}		
			availableTokens -= 1;
		}
		if(Number(data.items[x].item_id) == 6004399){
			aspTitle = true;
		}
	}
	if(!aspTitle){
		throw `${cName} has not yet unlocked ASP`;
	}
	let preBR = 100;
	if(decals.length != 0){
		preBR = Math.max.apply(Math, decals) - 803830;
	}
	let retInfo = {
		faction: data.faction_id,
		preBR: preBR,
		name: data.name.first,
		unlocks: tokens,
		unlocksContinued: tokensContinued,
		availableTokens: availableTokens
	}
	return retInfo;
}

module.exports = {
	originalBR: async function(cName, platform){
		if(badQuery(cName)){
			throw "Character search contains disallowed characters";
		}
		let cInfo = await basicInfo(cName, platform);

		let resEmbed = new Discord.MessageEmbed();
		if (cInfo.faction == "1"){ //vs
            resEmbed.setColor('PURPLE');
        }
        else if (cInfo.faction == "2"){ //nc
            resEmbed.setColor('BLUE');
        }
        else if (cInfo.faction == "3"){ //tr
            resEmbed.setColor('RED');
        }
        else{ //NSO
            resEmbed.setColor('GREY');
		}
		resEmbed.setTitle(cInfo.name);
		resEmbed.setDescription("BR pre ASP: "+cInfo.preBR);
		if(cInfo.unlocks.length == 0){
			cInfo.unlocks = "None";
		}
		else{
			cInfo.unlocks = cInfo.unlocks.substring(0,(cInfo.unlocks.length-6));
		}
		resEmbed.addField("Available Points", `${cInfo.availableTokens}`);
		resEmbed.addField("ASP Skills", cInfo.unlocks);
		if(cInfo.unlocksContinued != ""){
			resEmbed.addField("ASP Skills Continued", cInfo.unlocksContinued.substring(0,(cInfo.unlocksContinued.length-6)));
		}
		resEmbed.setThumbnail("http://census.daybreakgames.com/files/ps2/images/static/88688.png");

		return resEmbed;
	}
}