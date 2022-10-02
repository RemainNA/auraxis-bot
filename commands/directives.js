/**
 * This file defines functions to look up a list of a character's completed directives
 * @module directives
 * @typedef {import('discord.js').ButtonInteraction} ButtonInteraction
 * @typedef {import('discord.js').ChatInputCommandInteraction} ChatInteraction
 */

import { censusRequest, faction, platforms } from '../utils.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import directives from '../static/directives.json' assert {type: "json"};
import i18n from 'i18n';

/**
 * Get the list of completed directives for a character
 * @param {string} cName - the name of the character to look up
 * @param {string} platform - the platform of the character
 * @param {string} locale - the locale to use 
 * @returns the list of completed directives and when they were completed
 * @throws if `cName` is not a valid character name
 */
async function getDirectiveList(cName, platform, locale="en-US"){
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
		faction: nameResponse[0].faction_id, 
		directives: directiveList
	};
}

export const type = ['Base'];

export const data = {
	name: 'directives',
	description: "Lookup a list of a character's Auraxium medals",
	options: [{
		name: 'name',
		type: '3',
		description: 'Character name',
		required: true,
	},
	{
		name: 'platform',
		type: '3',
		description: "Which platform is the character on?  Defaults to PC",
		required: false,
		choices: platforms
	}]
};

/**
 * Used to expand the directives embed to include all the directives of a user
 * @param { ButtonInteraction } interaction - button interaction
 * @param { string } locale - locale of the user
 * @param { string[] } options - options from the button interaction
 */
export async function button(interaction, locale, options) {
	await interaction.deferReply({ephemeral: true});
	const [cName, platform] = options;
	const [sendEmbed, row] = await directive(cName, platform, locale, true);
	await interaction.editReply({embeds: [sendEmbed], components: row});

}

/**
 * Runs the `/directives` command
 * @param { ChatInteraction } interaction - command chat interaction
 * @param { string } locale - locale of the user
 */
export async function execute(interaction, locale) {
	const cName = interaction.options.getString('name');
	const platform = interaction.options.getString('platform') || 'ps2:v2';
	const [sendEmbed, row] = await directive(cName, platform, locale);
	await interaction.editReply({embeds: [sendEmbed], components: row});

}

/**
 * Send a message with the list of completed directives for a character
 * @param {string} cName - the name of the character to look up
 * @param {string} platform - the platform of the character
 * @param {string} locale - the locale to use 
 * @param {boolean} expanded - whether to show the full list of directives or just the first few
 * @returns {Promise<[EmbedBuilder, any[]]>} a discord embed with the list of completed directives, when they were completed, and a fisu link to the character's directives
 * @throws if `cName` has no completed directives
 */
async function directive(cName, platform, locale="en-US", expanded=false){
	const directiveList = await getDirectiveList(cName.toLowerCase(), platform, locale);
	const resEmbed = new EmbedBuilder();
	resEmbed.setTitle(i18n.__mf({phrase: "{name} Directives", locale: locale}, {name: directiveList.name}));
	let textList = "";
	let remaining = directiveList.directives.length;
	if(remaining == 0){
		throw i18n.__mf({phrase: "{name} has not completed any directives", locale: locale}, {name: directiveList.name});
	}
	if(expanded){
		remaining = 0
		for(const dir of directiveList.directives){
			if(dir[0] in directives){
				textList += `<t:${dir[1]}:d>: ${directives[dir[0]].name}\n`;
			}
			else{
				console.log(`Missing directive id ${dir[0]}`);
			}
		}
		resEmbed.setDescription(textList);
	}
	else{
		let max = 20;
		if(remaining <= 25){
			//This is just to avoid returning a list that says "and 1 more", it'll always be at least 5 more
			max = 25;
		}
		for(const dir of directiveList.directives){
			if(max == 0){
				textList += i18n.__mf({phrase: "And {num} more", locale: locale}, {num: remaining});
				break;
			}
			if(dir[0] in directives){
				textList += `<t:${dir[1]}:d>: ${directives[dir[0]].name}\n`;
			}
			else{
				console.log(`Missing directive id ${dir[0]}`);
			}
			remaining -= 1;
			max -= 1
		}
		resEmbed.setDescription(textList);
	}
	resEmbed.setColor(faction(directiveList.faction).color)
	resEmbed.setThumbnail('https://census.daybreakgames.com/files/ps2/images/static/84283.png');
	if(platform == 'ps2:v2'){
		resEmbed.setURL(`https://ps2.fisu.pw/directive/?name=${directiveList[0]}`);
	}
	else if(platform == 'ps2ps4us:v2'){
		resEmbed.setURL(`https://ps4us.ps2.fisu.pw/directive/?name=${directiveList[0]}`);
	}
	else if(platform == 'ps2ps4eu:v2'){
		resEmbed.setURL(`https://ps4eu.ps2.fisu.pw/directive/?name=${directiveList[0]}`);
	}
	if(remaining > 0){
		const row = new ActionRowBuilder()
		row.addComponents(
			new ButtonBuilder()
				.setCustomId(`directives%${directiveList.name}%${platform}`)
				.setLabel(i18n.__({phrase: "View all", locale: locale}))
				.setStyle(ButtonStyle.Primary)
		);
		return[resEmbed, [row]];
	}
	else{
		return[resEmbed, []];
	}
}