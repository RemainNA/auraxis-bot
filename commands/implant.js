/**
 * Search up implant information
 * @module implant
 * @typedef {import('discord.js').ChatInputCommandInteraction} ChatInteraction
 * @typedef {import('discord.js').AutocompleteInteraction} AutoComplete
 */
import { EmbedBuilder } from 'discord.js';
import implantsJSON from '../static/implants.json' assert {type: 'json'};
import { badQuery } from '../utils.js';

/**
 * Get implant information from implant.json
 * @param {string} name - the name of the implant to look up
 * @returns the implant information for `name`
 * @throws if `name` is not a valid implant
 */
async function implantInfo(name){
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

export const type = ['Base'];

export const data = {
	name: 'implant',
	description: "Look up implant information",
	options: [{
		name: 'query',
		type: '3',
		description: 'Implant name or partial name',
		autocomplete: true,
		required: true,
	}]
};

/**
 * Search for partial matches of implants
 * @param { AutoComplete } interaction - autocomplete interaction
 */
export async function partialMatches(interaction){
	let query = interaction.options.getString('query');
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

	await interaction.respond(matches);
}

/**
 * Creates a new embed with the implant information
 * @param { ChatInteraction } interaction - the name of the implant to look up
 * @param { string } locale - the locale to use
 * @returns a new embed with the implant information
 * @throw if `name` contains invalid characters
 */
export async function execute(interaction, locale){
	const name = interaction.options.getString('query')
	if(badQuery(name)){
		throw "Search contains disallowed characters";
	}
	
	const iInfo = await implantInfo(name);

	const resEmbed = new EmbedBuilder();
	resEmbed.setTitle(iInfo.name);
	resEmbed.setThumbnail(`http://census.daybreakgames.com/files/ps2/images/static/${iInfo.image}.png`);
	if(iInfo.desc !== undefined){
		resEmbed.addFields({name: "Description", value: iInfo.desc});
	}
	else{
		resEmbed.addFields(
			{name: "Rank 1", value: iInfo["1"]},
			{name: "Rank 2", value: iInfo["2"]},
			{name: "Rank 3", value: iInfo["3"]},
			{name: "Rank 4", value: iInfo["4"]},
			{name: "Rank 5", value: iInfo["5"]}
		);
	}

	await interaction.editReply({embeds: [resEmbed]});
}