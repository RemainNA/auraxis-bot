// This file implements a function which finds and returns the max BR a character reached before joining ASP, and tracks their ASP unlocks and tokens

const Discord = require('discord.js');
const got = require('got');
const messageHandler = require('./messageHandler.js');

const basicInfo = async function(cName, platform){
	let uri = 'http://census.daybreakgames.com/s:'+process.env.serviceID+'/get/'+platform+'/character?name.first_lower='+cName+'&c:resolve=item_full&c:lang=en';
	let response = "";
	try{
		response = await got(uri).json(); 
	}
	catch(err){
        if(err.message.indexOf('404') > -1){
            throw "API Unreachable";
        }
    }
    if(typeof(response.error) !== 'undefined'){
        if(response.error == 'service_unavailable'){
            throw "Census API currently unavailable";
        }
        if(typeof(response.error) === 'string'){
            throw `Census API error: ${response.error}`;
        }
        throw response.error;
    }
    if(typeof(response.character_list) === 'undefined'){
        throw "API Error";
    }
    if(typeof(response.character_list[0]) === 'undefined'){
        throw `${cName} not found`;
	}
	let data = response.character_list[0];
	if(data.faction_id == "4"){
		throw "NSO not supported";
	}
	if(data.prestige_level == "0"){
		throw `${cName} has not yet unlocked ASP`;
	}
	let br = Number(data.battle_rank.value);
	let availableTokens = 1+Math.floor(br/25);
	let aspTitle = false;
	let decals = []; //count br 101-120 decals
	let tokens = [];
	for (const x in data.items){
		if (Number(data.items[x].item_id) >= 803931 && Number(data.items[x].item_id) <= 803950){
			//record br 101-120 decals
			decals.push(Number(data.items[x].item_id));
		}
		else if(data.items[x].item_type_id == "1" && data.items[x].item_category_id == "133"){
			//record unlocked ASP items
			tokens.push(data.items[x].name.en+": "+data.items[x].description.en);
			tokens.push('----');
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
		availableTokens: availableTokens
	}
	return retInfo;
}

module.exports = {
	originalBR: async function(cName, platform){
		if(messageHandler.badQuery(cName)){
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
			cInfo.unlocks.pop();
		}
		resEmbed.addField("Available Points", cInfo.availableTokens);
		resEmbed.addField("ASP Skills", cInfo.unlocks);
		resEmbed.setThumbnail("http://census.daybreakgames.com/files/ps2/images/static/88688.png");

		return resEmbed;
	}
}