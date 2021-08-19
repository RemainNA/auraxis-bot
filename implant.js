const Discord = require('discord.js');
const implantsJSON = require('./static/implants.json');
const {badQuery} = require('./utils.js');

const implantInfo = async function(name){
	//Check if ID matches
	if(typeof(implantsJSON[name]) !== 'undefined'){
		let returnObj = implantsJSON[name];
		returnObj.name = name;
		return returnObj;
	}

	//Lower case name match
	for(const implant in implantsJSON){
		if(implant.toLowerCase() == name.toLowerCase()){
			let returnObj = implantsJSON[implant];
			returnObj.name = implant;
			return returnObj;
		}
	}

	//Partial match
	for(const implant in implantsJSON){
		if(implant.toLowerCase().indexOf(name.toLowerCase()) > -1){
			let returnObj = implantsJSON[implant];
			returnObj.name = implant;
			return returnObj;
		}
	}

	throw `${name} not found.`;
}

module.exports = {
	lookup: async function(name){
		if(badQuery(name)){
			throw "Search contains disallowed characters";
		}
		
		let iInfo = await implantInfo(name);

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

		return resEmbed;
	}
}