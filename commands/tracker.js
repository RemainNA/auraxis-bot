/**
 * This file implements functions to create and update server tracker channels, showing total population and active continents
 * @module tracker
 * @typedef {import('pg').Client} pg.Client
 * @typedef {import('discord.js').Client} discord.Client
 * @typedef {import('discord.js').Guild} discord.Guild
 * @typedef {import('discord.js').ChatInputCommandInteraction} ChatInteraction
 */

import { getPopulation } from './population.js';
import { territoryInfo } from './territory.js';
import { onlineInfo } from './online.js';
import { serverNames, serverIDs, servers, continents, faction, platforms, allServers } from '../utils.js';
import { ChannelType, PermissionFlagsBits } from 'discord.js';

/**
 * Get a string of the name and total population of a server
 * @param {number} serverID - the server to check population
 * @returns the name and population of the server
 */
async function populationName(serverID){
	const pop = await getPopulation();
	return `${serverNames[serverID]}: ${pop[serverID].global.all} online`;
}

/**
 * Get open continents on server
 * @param {number} serverID - the server to check open continents
 * @returns which continents are open on the  server
 */
async function territoryName(serverID){
	const territory = await territoryInfo(serverID);
	let openList = [];
	for (const cont of continents){
		if(territory[cont].locked == -1){
			openList.push(cont);
		}
	}
	return `${serverNames[serverID]}: ${openList}`;
}

/**
 * Get the number of online members in an outfit
 * @param {string} outfitID - the outfit to check
 * @param {string} platform -  the platform of the outfit
 * @returns an object containing the number of online members in the outfit
 */
async function outfitName(outfitID, platform){
	const oInfo = await onlineInfo("", platform, outfitID);
	if(oInfo.onlineCount == -1){
		return {
			faction: `${faction(oInfo.faction).tracker} ${oInfo.alias}: ? online`,
			noFaction: `${oInfo.alias}: ? online`
		};
	}
	return {
		faction: `${faction(oInfo.faction).tracker} ${oInfo.alias}: ${oInfo.onlineCount} online`,
		noFaction: `${oInfo.alias}: ${oInfo.onlineCount} online`
	};
}

export const data = {
	name: 'tracker',
	description: "Create an automatically updating voice channel",
	dm_permission: false,
	options: [{
		name: "server",
		description: "Create an automatically updating voice channel displaying server info",
		type: '1',
		options: [{
			name: 'server',
			type: '3',
			description: 'Server name',
			required: true,
			choices: allServers
		},
		{
			name: 'type',
			type: '3',
			description: 'Type of tracker channel',
			required: true,
			choices:[
				{
					name: 'Population',
					value: 'population'
				},
				{
					name: 'Continents',
					value: 'territory'
				}
			]
		}]
		},
		{
			name: "outfit",
			description: "Create an automatically updating voice channel displaying outfit online count",
			type: '1',
			options: [{
				name: 'tag',
				type: '3',
				description: 'Outfit tag',
				required: true
			},
			{
				name: 'show-faction',
				type: '5',
				description: 'Display a faction indicator in channel name? ex: 🟣/🔵/🔴/⚪',
				required: true
			},
			{
				name: 'platform',
				type: '3',
				description: "Which platform is the outfit on?  Defaults to PC",
				required: false,
				choices: platforms
			}
			]
		}
	]
};

export const type = ['PGClient'];

/**
 * runs the `/tracker` command
 * @param { ChatInteraction } interaction - command chat interaction 
 * @param { string } locale - locale of the user
 * @param { pg.Client } pgClient - postgres client
 */
export async function execute(interaction, locale, pgClient) {
	if (interaction.channel.type === ChannelType.DM) {
		await interaction.editReply({content: 'Cannot create trackers in DMs'});
	}
	const options = interaction.options.getSubcommand();
	if (options === 'server') {
		const type =  interaction.options.getString('type');
		const server = interaction.options.getString('server');
		const guild = interaction.guild;
		const client = interaction.client;
		const res = await create(type, server, guild, client, pgClient);
		await interaction.editReply(res);
	} else if (options === 'outfit') {
		const tag = interaction.options.getString('tag').toLowerCase();
		const platform = interaction.options.getString('platform') || 'ps2:v2';
		const showFaction = interaction.options.getBoolean('show-faction');
		const guild = interaction.guild;
		const client = interaction.client;
		const res = await createOutfit(tag, platform, showFaction, guild, client, pgClient);
		await interaction.editReply(res);
	}
	
}

/**
 * Update channels names of channels the are trackers
 * @param {string} name - the name to update the channel with
 * @param {string} channelID - the channel to update
 * @param {discord.Client} discordClient - the discord Client
 * @param {pg.Client} pgClient - the postgres client
 */
async function updateChannelName(name, channelID, discordClient, pgClient){
	try{
		const channel = await discordClient.channels.fetch(channelID);
		if(name != channel.name){ //Just avoid unneeded edits
			await channel.setName(name, "Scheduled tracker update");
		}
	}
	catch(err){
		if(err.code == 10003){ //Deleted/unknown channel
			console.log(`Removed tracker channel ${channelID}`);
			pgClient.query("DELETE FROM tracker WHERE channel = $1;", [channelID]);
			pgClient.query("DELETE FROM outfittracker WHERE channel = $1;", [channelID]);
		}
		else if(err.code == 50013 || err.code == 50001){ //Missing permissions, missing access
			//Ignore in case permissions are updated
		}
		else{
			console.log("Error in updateChannelName");
			console.log(err);
		}
	}
}

/**
 * Used to create tracker channels for server population and territory
 * @param {string} type - the type of tracker to create
 * @param {string} serverName - the server to check
 * @param {discord.Guild} guild - the discord guild
 * @param {discord.Client} discordClient - the discord Client
 * @param {pg.Client} pgClient - the postgres client
 * @returns A string saying the tracker channel was created
 * @throws if bot is missing permissions to create channels
 */
async function create(type, serverName, guild, discordClient, pgClient){
	try{
		let name = "";
		if(type == "population"){
			name = await populationName(serverIDs[serverName]);
		}
		else if(type == "territory"){
			name = await territoryName(serverIDs[serverName]);
		}
		
		const newChannel = await guild.channels.create({
			name: name,
			type: ChannelType.GuildVoice,
			reason: 'New tracker channel',
			permissionOverwrites: [
				{
					id: guild.id,
					deny: [PermissionFlagsBits.Connect],
					allow: [PermissionFlagsBits.ViewChannel]
				},
				{
					id: discordClient.user.id,
					allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ViewChannel]
				}
			]
		});

		await pgClient.query("INSERT INTO tracker (channel, trackerType, world) VALUES ($1, $2, $3);",
		[newChannel.id, type, serverName]);

		return `Tracker channel created as ${newChannel.toString()}. This channel will automatically update once every 10 minutes. If you move the channel or edit permissions make sure to keep the "Manage Channel" and "Connect" permissions enabled for Auraxis Bot.`;
	}
	catch(err){
		if(err.message == "Missing Permissions"){
			throw "Unable to create channel due to missing permissions. Ensure the bot has both \"Manage Channels\" and \"Connect\" permissions granted.";
		}
		else{
			throw(err);
		}		
	}
}

/**
 * Used to create tracker channels for outfits
 * @param {string} tag - the tag of the outfit to check
 * @param {string} platform - the platform of the outfit
 * @param {boolean} showFaction - if true, show faction indicator in tracker
 * @param {discord.Guild} guild - the discord guild
 * @param {discord.Client} discordClient - the discord Client
 * @param {pg.Client} pgClient - the postgres client
 * @returns a string saying the tracker channel for outfits was created
 * @throws if bot is missing permissions to create channels
 */
async function createOutfit(tag, platform, showFaction, guild, discordClient, pgClient){
	try{
		const oInfo = await onlineInfo(tag, platform);
		let name = await outfitName(oInfo.outfitID, platform);
		if(showFaction){
			name = name.faction;
		}
		else{
			name = name.noFaction;
		}
					
		const newChannel = await guild.channels.create({
			name: name,
			type: ChannelType.GuildVoice,
			reason: 'New tracker channel',
			permissionOverwrites: [
				{
					id: guild.id,
					deny: [PermissionFlagsBits.Connect],
					allow: [PermissionFlagsBits.ViewChannel]
				},
				{
					id: discordClient.user.id,
					allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ViewChannel]
				}
			]
		});

		await pgClient.query("INSERT INTO outfittracker (channel, outfitid, showfaction, platform) VALUES ($1, $2, $3, $4);",
		[newChannel.id, oInfo.outfitID, showFaction, platform]);

		return `Tracker channel created as ${newChannel}. This channel will automatically update once every 10 minutes. If you move the channel or edit permissions make sure to keep the "Manage Channel" and "Connect" permissions enabled for Auraxis Bot.`;
	}
	catch(err){
		if(err.message == "Missing Permissions"){
			throw "Unable to create channel due to missing permissions. Ensure the bot has both \"Manage Channels\" and \"Connect\" permissions granted.";
		}
		else{
			throw(err);
		}		
	}
}

/**
 * Used to update the tracker channels
 * @param {pg.Client} pgClient - the postgres client
 * @param {discord.Client} discordClient - the discord Client
 * @param {boolean} continentOnly - if false only update population and outfits
 */
export async function update(pgClient, discordClient, continentOnly = false){
	for(const serverName of servers){
		if(!continentOnly){
			try{
				const popName = await populationName(serverIDs[serverName]);
				const channels = await pgClient.query("SELECT channel FROM tracker WHERE trackertype = $1 AND world = $2;", ["population", serverName]);
				for(const row of channels.rows){
					await updateChannelName(popName, row.channel, discordClient, pgClient);
				}
			}
			catch(err){
				console.log(`Error updating ${serverName} population tracker`);
				console.log(err);
			}
		}
		try{
			const terName = await territoryName(serverIDs[serverName]);
			const channels = await pgClient.query("SELECT channel FROM tracker WHERE trackertype = $1 AND world = $2;", ["territory", serverName]);
			for(const row of channels.rows){
				await updateChannelName(terName, row.channel, discordClient, pgClient);
			}
		}
		catch(err){
			console.log(`Error updating ${serverName} territory tracker`);
			console.log(err);
		}
	}
	if(!continentOnly){
		try{
			const outfits = await pgClient.query("SELECT DISTINCT outfitid, platform FROM outfittracker;");
			for(const row of outfits.rows){
				try{
					const oName = await outfitName(row.outfitid, row.platform);
					const channels = await pgClient.query("SELECT channel, showfaction FROM outfittracker WHERE outfitid = $1 AND platform = $2;", [row.outfitid, row.platform]);
					for(const channelRow of channels.rows){
						if(channelRow.showfaction){
							await updateChannelName(oName.faction, channelRow.channel, discordClient, pgClient);
						}
						else{
							await updateChannelName(oName.noFaction, channelRow.channel, discordClient, pgClient);
						}
					}
				}
				catch(err){
					console.log(`Error updating outfit tracker ${row.outfitid}`);
					console.log(err);
					if(err == " not found"){
						await pgClient.query("DELETE FROM outfittracker WHERE outfitid = $1;", [row.outfitid]);
						console.log(`Deleted ${row.outfitid} from tracker table`);
					}
				}
				
			}
		}catch(err){
			console.log(`Error pulling outfit trackers`);
			console.log(err);
		}
	}
}