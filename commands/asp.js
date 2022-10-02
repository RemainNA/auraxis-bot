/**
 * This file implements a function which finds and returns the max BR a character reached before joining ASP, and tracks their ASP unlocks and tokens
 * @module asp
 * @typedef {import('discord.js').ChatInputCommandInteraction} ChatInteraction 
 */

import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import { censusRequest, badQuery, faction, platforms } from '../utils.js';
import i18n from 'i18n';

/**
 * Get basic information about a character's ASP unlocks and BR
 * @param {string} cName - character name to check
 * @param {string} platform  - what platform the character is on
 * @param {string} locale -  locale to use
 * @returns an object containing the ASP information about a character
 * @throw if `cName` is not a valid character name, are NSO are have no ASP
 */
async function basicInfo(cName, platform, locale="en-US"){
	let response = await censusRequest(platform, 'character_list', `/character?name.first_lower=${cName}&c:resolve=item_full&c:lang=en`);
	if(response.length == 0){
		throw i18n.__mf({phrase: "{name} not found", locale: locale}, {name: cName});
	}
	let data = response[0];
	if(data.prestige_level == "0"){
		throw i18n.__mf({phrase: "{name} has not yet unlocked ASP", locale: locale}, {name: data.name.first});
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
				tokensContinued += '----\n';
			}
			else{
				tokens += `${data.items[x].name.en}: ${data.items[x].description.en}\n`;
				tokens += '----\n';
			}		
			availableTokens -= 1;
		}
		if(Number(data.items[x].item_id) == 6004399){
			aspTitle = true;
		}
	}
	if(!aspTitle){
		throw i18n.__mf({phrase: "{name} has not yet unlocked ASP", locale: locale}, {name: data.name.first});
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
	};
	return retInfo;
}

export const data = {
	name: 'asp',
	description: "Look up ASP specific information for a character",
	options: [{
		name: 'name',
		type: ApplicationCommandOptionType.String,
		description: 'Character name',
		required: true,
	},
	{
		name: 'platform',
		type: ApplicationCommandOptionType.String,
		description: "Which platform is the character on?  Defaults to PC",
		required: false,
		choices: platforms
	}]
};

export const type = ['Base'];

/**
 * Runs the `/asp` command
 * @param { ChatInteraction } interaction - command chat interaction
 * @param { string } locale - locale to use 
 */
export async function execute(interaction, locale) {
	const cName = interaction.options.getString('name').toLowerCase();
	const platform = interaction.options.getString('platform') || 'ps2:v2';
	const sendEmbed = await aspEmbed(cName, platform, locale);
	await interaction.editReply({embeds: [sendEmbed]});
}

/**
 * Returns an embed containing ASP information about a character
 * @param { string } cName - name of the character
 * @param { string } platform - which platform the character is on
 * @param { string } locale - locale to use 
 * @returns an embed containing the ASP information of cName
 */
export async function aspEmbed(cName, platform, locale="en-US"){
	if(badQuery(cName)){
		throw i18n.__({phrase: "Character search contains disallowed characters", locale: locale});
	}
	const cInfo = await basicInfo(cName, platform, locale);
	if(cInfo.unlocks.length == 0){
		cInfo.unlocks = "None";
	}
	else{
		cInfo.unlocks = cInfo.unlocks.substring(0,(cInfo.unlocks.length-6));
	}
	const resEmbed = new EmbedBuilder()
		.setColor(faction(cInfo.faction).color)
		.setTitle(cInfo.name)
		.setDescription(`${i18n.__({phrase: "BR pre ASP", locale: locale})}: ${cInfo.preBR}`);
	resEmbed.addFields(
		{name: i18n.__({phrase: "Available Points", locale: locale}), value: `${cInfo.availableTokens}`},
		{name: i18n.__({phrase: "ASP Skills", locale: locale}), value: cInfo.unlocks}
	);
	if(cInfo.unlocksContinued != ""){
		resEmbed.addFields(
			{name: i18n.__({phrase: "ASP Skills Continued", locale: locale}), value: cInfo.unlocksContinued.substring(0,(cInfo.unlocksContinued.length-6))}
		);
	}
	resEmbed.setThumbnail("http://census.daybreakgames.com/files/ps2/images/static/88688.png");
	return resEmbed;
}