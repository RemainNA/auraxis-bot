/**
 * This file implements functions to look up and report server status
 * @module status
 * @typedef {import('discord.js').ChatInputCommandInteraction} ChatInteraction
 */
import { EmbedBuilder } from 'discord.js';
import { censusRequest } from '../utils.js';
import i18n from 'i18n';

/**
 * Get the population status of each server
 * @returns an object contianing the population status of each server
 * @throws if there are API errors
 */
async function info(){	
	const data = await censusRequest('global', 'game_server_status_list', '/game_server_status?game_code=ps2&c:limit=100');
	if(data === undefined){
		throw "API Error";
	}

	const status = {
		'Connery': 'Unknown',
		'Miller': 'Unknown',
		'Cobalt': 'Unknown',
		'Emerald': 'Unknown',
		'SolTech': 'Unknown',
		'Jaeger': 'Unknown',
		'Genudine': 'Unknown',
		'Ceres': 'Unknown'
	};
	
	for(const world of data){
		/**
		 * the server name format by the census API is inconsistent
		 * but the first word is always the server name.
		 */
		const server = world.name.split(' ')[0];
		status[server] = world.last_reported_state;
	}

	return status;
}

export const data = {
	name: 'status',
	description: 'Get the status of each server',
};

export const type = ['Base'];

/**
 * runs the `/status` command
 * @param { ChatInteraction } interaction - chat interaction object
 * @param { string } locale - locale of the user
 */
export async function execute(interaction, locale) {
	const status = await info();
	const resEmbed = new EmbedBuilder()
		.setTitle(i18n.__({phrase: 'Server Status', locale: locale}));
	for(const server in status){
		resEmbed.addFields(
			{name: i18n.__({phrase: server, locale: locale}), value: i18n.__({phrase: status[server], locale: locale}), inline: true}
		);
	}
	resEmbed.setTimestamp();
	await interaction.editReply({embeds: [resEmbed]});
}