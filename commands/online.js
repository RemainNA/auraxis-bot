/**
 * Handles the `/online` command
 * @module online
 * @typedef {import('discord.js').ChatInputCommandInteraction} ChatInteraction
 * @typedef {import('discord.js').ButtonInteraction} ButtonInteraction
 */

import { EmbedBuilder } from 'discord.js';
import { badQuery, censusRequest, faction, platforms} from '../utils.js';
import i18n from 'i18n';

/**
 * Get who is online in `oTag`
 * @param {string} oTag - outfit tag to check
 * @param {string} platform - platform the outfit is on
 * @param {string | null} outfitID - outfit ID to check
 * @param {string} locale - locale to use
 * @returns {Promise<OnlineOutfit>} a object containing the current online members of the outfit. If online member count is unavailable, object.OnlineCount will be -1.
 * @throws if outfit tag cannot be found or there was an API error
 */
export async function onlineInfo(oTag, platform, outfitID = null, locale = "en-US"){
	let outfitSearch = `alias_lower=${oTag}`;
	if(outfitID != null){
		outfitSearch = `outfit_id=${outfitID}`;
	}
	const outfit = (await censusRequest(platform, 'outfit_list', `outfit?${outfitSearch}&c:resolve=rank`))[0];
	if(outfit === undefined){
		throw `${oTag} not found`;
	}
	/**
	 * Due to how this query works, if no one is online or the outfit doesn't exist then nothing will
	 * be returned by the API necessitating the first query to ensure the outfit exists and to get outfit information.
	 * Source for query: https://github.com/leonhard-s/auraxium/wiki/Census-API-Primer#example-joins
	 */
	const url = `outfit?${outfitSearch}&c:join=outfit_member^inject_at:members^show:character_id%27rank^outer:0^list:1(character^show:name.first^inject_at:character^outer:0^on:character_id(characters_online_status^inject_at:online_status^show:online_status^outer:0(world^on:online_status^to:world_id^outer:0^show:world_id^inject_at:ignore_this))`;
	const data = (await censusRequest(platform, 'outfit_list', url))[0];
	let urlBase = 'https://ps2.fisu.pw/player/?name=';
	if(platform == 'ps2ps4us:v2'){
		urlBase = 'https://ps4us.ps2.fisu.pw/player/?name=';
	}
	else if(platform == 'ps2ps4eu:v2'){
		urlBase = 'https://ps4eu.ps2.fisu.pw/player/?name=';
	}
	const leader = (await censusRequest(platform, 'character_list', `/character?character_id=${outfit.leader_character_id}&c:resolve=world`))[0];
	/**
	 * @typedef {Object} OnlineOutfit
	 * @property {string} name - outfit name
	 * @property {string} alias - outfit tag
	 * @property {number} memberCount - total number of outfit members
	 * @property {number} onlineCount - number of online members
	 * @property {number} world - server ID
	 * @property {number} outfitID - outfit ID
	 * @property {number} faction - the faction of the outfit
	 * @property {string[]} rankNames - all the rank names from highest to lowest
	 * @property {Object[]} onlineMembers - all the online members sorted by rank and then alphabetically
	 */
	const resObj = {
		name: outfit.name,
		alias: outfit.alias,
		memberCount: outfit.member_count,
		onlineCount: data === undefined ? 0 : data.members.length,
		world: leader.world_id,
		outfitID: outfit.outfit_id,
		faction: leader.faction_id,
		rankNames: ["","","","","","","",""],
		onlineMembers: [[],[],[],[],[],[],[],[]]
	}
	if (resObj.onlineCount === 0) {
		return resObj;
	}
	if(data.members[0].character.online_status == "service_unavailable"){
		resObj.onlineCount = -1;
		return resObj;
	}
	if(typeof(data.members[0].character.name) === 'undefined'){
		throw "API error: names not returned";
	}
	if (outfit.ranks !== undefined) {
		for(const rank of outfit.ranks){
			resObj.rankNames[parseInt(rank.ordinal) - 1] = rank.name;
		}
	} else {
		/**
		 * PS4 outfits rank names are all the same and the census doesn't return rank names for PS4
		 * Rank ordinals on PS4 are also completely random and don't a consistent pattern like PC.
		 * So we have to hardcode them.
		 */
		resObj.rankNames = ['Leader', 'Officer', 'Member', 'Private', 'Enlisted'];
	}
	for (const member of data.members) {
		const name = member.character.name.first
		const rank = member.rank;
		const position = resObj.rankNames.indexOf(rank);
		resObj.onlineMembers[position].push(`[${name}](${urlBase + name})`);
	}
	for(const i in resObj.onlineMembers){
		//This sorts ignoring case: https://stackoverflow.com/questions/8996963/how-to-perform-case-insensitive-sorting-in-javascript#9645447
		resObj.onlineMembers[i].sort((a, b) => a.localeCompare(b, {'sensitivity': 'base'}));
	}
	return resObj;
}

/**
 * Used to get total number of letters characters from online outfit members
 * @param {string[]} arr - array of online members
 * @returns the amount of characters in the array
 */
export function totalLength(arr){
	let len = 0;
	for(const i in arr){
		len += arr[i].length+1;
	}
	return len;
}

export const type = ['Base'];

export const data = {
	name: 'online',
	description: "Look up currently online members for a given outfit",
	options: [{
		name: 'tag',
		type: '3',
		description: 'Outfit tag or tags separated by spaces, no brackets',
		required: true,
	},
	{
		name: 'platform',
		type: '3',
		description: "Which platform is the outfit on?  Defaults to PC",
		required: false,
		choices: platforms
	}]
};

/**
 * Used to get the online members of an outfit
 * @param { ButtonInteraction } interaction - button interaction
 * @param { string } locale - locale of the user
 * @param { string[] } options - 
 */
export async function button(interaction, locale, options) {
	await interaction.deferReply();
	const oTag = '';
	const [outfitID, platform] = options;
	const res = await online(oTag, platform, outfitID, locale);
	await interaction.editReply({embeds: [res]});
}

/**
 * Runs the `/online` command
 * @param { ChatInteraction } interaction - command chat interaction
 * @param { string } locale - locale of the user
 */
export async function execute(interaction, locale) {
	const onlineTags = interaction.options.getString('tag').toLowerCase().replace(/\s\s+/g, ' ').split(' ');
	if(onlineTags.length > 10){
		await interaction.editReply({
			content: i18n.__({phrase: "This commands supports a maximum of 10 outfits per query", locale: locale}),
		});
		return;
	}
	const platform = interaction.options.getString('platform') || 'ps2:v2';
	const onlineLookups = await Promise.allSettled(
		onlineTags.map(outfit => online(outfit, platform, null, locale))
	);
	const messages = [];
	for(const res of onlineLookups){
		if(res.status === 'fulfilled'){
			messages.push({embeds: [res.value]});
		}
		else {
			if(typeof res.reason == 'string'){
				messages.push(res.reason);
			}
			else{
				messages.push(i18n.__({phrase: "Error occurred when handling command", locale: locale}));
				console.log(`Outfit online error ${locale}`);
				console.log(res.reason);
			}
		}
	}
	await interaction.editReply(messages.pop());
	for (const msg of messages) {
		await interaction.followUp(msg);
	}
}

/**
 * The online command
 * @param {string} oTag - outfit tag to check
 * @param {string} platform - platform the outfit is on
 * @param {string | null} outfitID - outfit ID to check
 * @param {string} locale - locale to use
 * @returns a discord embed of the online members of the outfit
 * @throws if `oTag` contains invalid characters or was incorrectly formatted
 */
async function online(oTag, platform, outfitID = null, locale = "en-US"){
	if(badQuery(oTag)){
		throw i18n.__({phrase: "Outfit search contains disallowed characters", locale: locale});
	}
	if(oTag.length > 4){
		throw i18n.__mf({phrase: "{tag} is longer than 4 letters, please enter a tag", locale: locale}, {tag: oTag});
	}

	const oInfo = await onlineInfo(oTag, platform, outfitID, locale);
	const resEmbed = new EmbedBuilder();

	resEmbed.setTitle(oInfo.name);
	resEmbed.setThumbnail(`https://www.outfit-tracker.com/outfit-logo/${oInfo.outfitID}.png`);
	resEmbed.setFooter({text: i18n.__({phrase: "outfitDecalSource", locale: locale})});
	resEmbed.setDescription(oInfo.alias+"\n"+i18n.__mf({phrase: "{online}/{total} online", locale: locale}, 
	{online: oInfo.onlineCount, total: oInfo.memberCount}));
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
	resEmbed.setColor(faction(oInfo.faction).color)
	if(oInfo.onlineCount === -1){
		resEmbed.addFields({name: i18n.__({phrase: "Online member count unavailable", locale: locale}), value: "-", inline: true});
		resEmbed.setDescription(oInfo.alias+"\n"+"?/"+oInfo.memberCount+" online");

		return resEmbed;
	}
	for(let i = 0; i < 8; i++){
		if(oInfo.onlineMembers[i].length > 0){
			if(totalLength(oInfo.onlineMembers[i]) <= 1024){
				resEmbed.addFields({name: oInfo.rankNames[i]+" ("+oInfo.onlineMembers[i].length+")", value: `${oInfo.onlineMembers[i]}`.replace(/,/g, '\n'), inline: true});
			}
			else{
				resEmbed.addFields({name: oInfo.rankNames[i]+" ("+oInfo.onlineMembers[i].length+")", value: i18n.__({phrase: "Too many to display", locale: locale}), inline: true});
			}
		}
	}
	return resEmbed;
}