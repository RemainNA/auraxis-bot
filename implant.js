const Discord = require('discord.js');
var implantsJSON = require('./implants.json');
var messageHandler = require('./messageHandler.js');

var implantInfo = async function(name){
	//Check if ID matches
	if(typeof(implantsJSON[name]) !== 'undefined'){
		let returnObj = implantsJSON[name];
		returnObj.name = name;
		return new Promise(function(resolve, reject){
			resolve(returnObj);
		})
	}

	//Lower case name match
	for(implant in implantsJSON){
		if(implant.toLowerCase() == name.toLowerCase()){
			let returnObj = implantsJSON[implant];
			returnObj.name = implant;
			return new Promise(function(resolve, reject){
				resolve(returnObj);
			})
		}
	}

	//Partial match
	for(implant in implantsJSON){
		if(implant.toLowerCase().indexOf(name.toLowerCase()) > -1){
			let returnObj = implantsJSON[implant];
			returnObj.name = implant;
			return new Promise(function(resolve, reject){
				resolve(returnObj);
			})
		}
	}

	return new Promise(function(resolve, reject){
		reject(name+" not found.");
	})
}

module.exports = {
	lookup: async function(name){
		if(messageHandler.badQuery(name)){
			return new Promise(function(resolve, reject){
                reject("Search contains disallowed characters");
            })
		}
		
		let iInfo = {};
		try{
            iInfo = await implantInfo(name);
        }
        catch(error){
            return new Promise(function(resolve, reject){
                reject(error);
            })
		}

		let resEmbed = new Discord.MessageEmbed();
		resEmbed.setTitle(iInfo.name);
		resEmbed.setThumbnail('http://census.daybreakgames.com/files/ps2/images/static/'+iInfo.image+'.png');
		if(typeof(iInfo.desc) !== 'undefined'){
			resEmbed.addField("Description", iInfo.desc);
		}
		else{
			resEmbed.addField("Rank 1", iInfo["1"]);
			resEmbed.addField("Rank 2", iInfo["2"]);
			resEmbed.addField("Rank 3", iInfo["3"]);
			resEmbed.addField("Rank 4", iInfo["4"]);
			resEmbed.addField("Rank 5", iInfo["5"]);
		}

		return new Promise(function(resolve, reject){
			resolve(resEmbed);
		})
	}
}