/**
 * This file defines functions to look up a list of a character's completed directives
 * @module directives
 */

const {censusRequest, faction, characterLink} = require('./utils.js');
const Discord = require('discord.js');
const directives = require('./static/directives.json');
const i18n = require('i18n');

/**
 * Get the list of completed directives for a character
 * @param {string} cName - the name of the character to look up
 * @param {string} platform - the platform of the character
 * @param {string} locale - the locale to use 
 * @returns the list of completed directives and when they were completed
 * @throws if `cName` is not a valid character name
 */
const getDirectiveList = async function(cName, platform, locale="en-US"){
	let nameResponse = await censusRequest(platform, 'character_list', `/character?name.first_lower=${cName}`);
	if(nameResponse.length == 0){
        throw i18n.__mf({phrase: "{name} not found", locale: locale}, {name: cName});
    }
	const characterId = nameResponse[0].character_id;
	let response = await censusRequest(platform, 'characters_directive_tree_list', `characters_directive_tree?character_id=${characterId}&c:limit=500`);
	let directiveList = [];
	for(const dir of response){
		if(dir.completion_time != 0){
			directiveList.push([dir.directive_tree_id, dir.completion_time]);
		}
	}

	directiveList.sort((a,b) => b[1] - a[1]);
	return {
		name: nameResponse[0].name.first,
		id: characterId, 
		faction: nameResponse[0].faction_id, 
		directives: directiveList
	};
}

module.exports = {
	/**
	 * Send a message with the list of completed directives for a character
	 * @param {string} cName - the name of the character to look up
	 * @param {string} platform - the platform of the character
	 * @param {boolean} expanded - whether to show the full list of directives or just the first few
	 * @param {string} locale - the locale to use 
	 * @returns a discord embed with the list of completed directives, when they were completed, and a fisu link to the character's directives
	 * @throws if `cName` has no completed directives
	 */
	directives: async function(cName, platform, expanded=false, locale="en-US"){
		const directiveList = await getDirectiveList(cName.toLowerCase(), platform, locale);
		let remaining = directiveList.directives.length;
		if(remaining === 0){
			throw i18n.__mf({phrase: "{name} has not completed any directives", locale: locale}, {name: directiveList.name});
		}

		let max = remaining <= 25 ? 25 : 20; //This is just to avoid returning a list that says "and 1 more", it'll always be at least 5 more
		if (expanded) {
			max = remaining;
		}
		const resEmbed = new Discord.EmbedBuilder()
			.setTitle(i18n.__mf({phrase: "{name} Directives", locale: locale}, {name: directiveList.name}))
			.setColor(faction(directiveList.faction).color)
			.setThumbnail('https://census.daybreakgames.com/files/ps2/images/static/84283.png');
		
		let completedDirectives = '';
		directiveList.directives
			.slice(0, max)
			.forEach(([id, time]) => {
				remaining--;
				if (id in directives) completedDirectives += `<t:${time}:d>: ${directives[id].name}\n`;
				else console.log(`Missing directive id ${id}`);
			});

		const row = [];
		if (remaining > 0) {
			completedDirectives += i18n.__mf({phrase: "And {num} more", locale: locale}, {num: remaining});
			row[0] = new Discord.ActionRowBuilder()
				.addComponents(
					new Discord.ButtonBuilder()
						.setCustomId(`directives%${directiveList.name}%${platform}`)
						.setLabel(i18n.__({phrase: "View all", locale: locale}))
						.setStyle(Discord.ButtonStyle.Primary)
				);
		} 
			
		resEmbed.setDescription(completedDirectives);
		resEmbed.setURL(characterLink(directiveList.name, directiveList.id, platform, "directives"));
		return [resEmbed, row];
	}
}
