// This file implements a function which finds and returns the max BR a character reached before joining ASP

const Discord = require('discord.js');
var got = require('got');
var messageHandler = require('./messageHandler.js');


var basicInfo = async function(cName, platform){
	let uri = 'https://census.daybreakgames.com/s:'+process.env.serviceID+'/get/'+platform+'/character?name.first_lower='+cName+'&c:resolve=item_full&c:lang=en';
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
        if(typeof(response.error) === 'string'){
            return new Promise(function(resolve, reject){
                reject("Census API error: "+response.error);
            })
        }
        return new Promise(function(resolve, reject){
            reject(response.error);
        })
    }
    if(typeof(response.character_list) === 'undefined'){
        return new Promise(function(resolve, reject){
            reject("API Error");
        })
    }
    if(typeof(response.character_list[0]) === 'undefined'){
        return new Promise(function(resolve, reject){
            reject(cName+" not found");
        })
	}
	let data = response.character_list[0];
	if(data.faction_id == "4"){
		return new Promise(function(resolve, reject){
            reject("NSO not supported");
        })
	}
	if(data.prestige_level == "0"){
		return new Promise(function(resolve, reject){
            reject(cName+" has not yet unlocked ASP");
        })
	}
	let aspTitle = false;
	let decals = []; //count br 101-120 decals
	for (x in data.items){
		if (Number(data.items[x].item_id) >= 803931 && Number(data.items[x].item_id) <= 803950){
			//record br 101-120 decals
			decals.push(Number(data.items[x].item_id));
		}
		if(Number(data.items[x].item_id) == 6004399){
			aspTitle = true;
		}
	}
	if(!aspTitle){
		return new Promise(function(resolve, reject){
            reject(cName+" has not yet unlocked ASP");
        })
	}
	let preBR = 100;
	if(decals.length != 0){
		preBR = Math.max.apply(Math, decals) - 803830;
	}
	let retInfo = {
		faction: data.faction_id,
		preBR: preBR,
		name: data.name.first
	}
	return new Promise(function(resolve, reject){
		resolve(retInfo);
	})
}

module.exports = {
	originalBR: async function(cName, platform){
		if(messageHandler.badQuery(cName)){
			return new Promise(function(resolve, reject){
                reject("Character search contains disallowed characters");
            })
		}

		try{
			cInfo = await basicInfo(cName, platform);
		}
		catch(error){
			return new Promise(function(resolve, reject){
				reject(error);
			})
		}
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
		return new Promise(function(resolve, reject){
			resolve(resEmbed);
		})
	}
}