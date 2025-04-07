/**
 * Search up implant information
 * @module implant
 */
const Discord = require('discord.js');
const implantsJSON = require('./static/implants.json');
const {badQuery, discordEmoji} = require('./utils.js');

/**
 * Get implant information from implant.json
 * @param {string} name - the name of the implant to look up
 * @returns the implant information for `name`
 * @throws if `name` is not a valid implant
 */
const implantInfo = async function(name){
	//Check if ID matches
	if(implantsJSON[name] !== undefined){
		const returnObj = implantsJSON[name];
		returnObj.name = name;
		return returnObj;
	}

	//Partial match
	for(const implant in implantsJSON){
		if(implant.toLowerCase().includes(name.toLowerCase())){
			const returnObj = implantsJSON[implant];
			returnObj.name = implant;
			return returnObj;
		}
	}

	throw `${name} not found.`;
}

/**
 * Search for partial matches of implants
 * @param {string} query - the query to search for
 * @returns list of possible matches implant
 */
const partialMatches = async function(query){
	const matches = [];
	query = query.replace(/[“”]/g, '"').toLowerCase();

	for(const implant in implantsJSON){
		if(implant.toLowerCase().includes(query)){
			matches.push({name: implant, value: implant});
		}
		if(matches.length === 25){
			break;
		}
	}

	return matches
}

module.exports = {
	/**
	 * Creates a new embed with the implant information
	 * @param {string} name - the name of the implant to look up
	 * @returns a new embed with the implant information
	 * @throw if `name` contains invalid characters
	 */
	lookup: async function(name){
		if(badQuery(name)){
			throw "Search contains disallowed characters";
		}
		
		const iInfo = await implantInfo(name);

		const resEmbed = new Discord.EmbedBuilder();
		resEmbed.setTitle(iInfo.name);
		resEmbed.setThumbnail(`http://census.daybreakgames.com/files/ps2/images/static/${iInfo.image}.png`);
		if(iInfo.craft !== undefined){
			resEmbed.setDescription(`${iInfo.craft} ${discordEmoji["ISO-4"]}`);
		}
		if(iInfo.desc !== undefined){
			resEmbed.addFields({name: "Description", value: iInfo.desc});
		}
		else{
			resEmbed.addFields(
				{name: "Rank 1", value: iInfo["1"].replace(/\<.+?>/g, "**")},
				{name: `Rank 2 | 75 ${discordEmoji["ISO-4"]}`, value: iInfo["2"].replace(/\<.+?>/g, "**")},
				{name: `Rank 3 | 225 ${discordEmoji["ISO-4"]}`, value: iInfo["3"].replace(/\<.+?>/g, "**")},
				{name: `Rank 4 | 900 ${discordEmoji["ISO-4"]}`, value: iInfo["4"].replace(/\<.+?>/g, "**")},
				{name: `Rank 5 | 2475 ${discordEmoji["ISO-4"]}`, value: iInfo["5"].replace(/\<.+?>/g, "**")}
			)
		}

		return resEmbed;
	},

	partialMatches: partialMatches
}