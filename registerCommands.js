/**
 * Run this file with `node registerCommands.js` to register all commands for the bot
 * @module registerCommands
 */
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

require('dotenv').config();

/**
 * all server options
 */
const allOption = {
	name: 'All',
	value: 'all'
}

/**
 * Different platforms PS2 servers are on
 */
const platforms = [
	{
		name: 'PC',
		value: 'ps2:v2'
	},
	{
		name: 'PS4 US',
		value: 'ps2ps4us:v2'
	},
	{
		name: 'PS4 EU',
		value: 'ps2ps4eu:v2'
	}
]

/**
 * All servers except for Jaeger
 */
const serversNoJaeger = [
	{
		name: "Connery",
		value: "connery"
	},
	{
		name: "Miller",
		value: "miller"
	},
	{
		name: "SolTech",
		value: "soltech"
	},
	{
		name: "Genudine",
		value: "genudine"
	},
	{
		name: "Ceres",
		value: "ceres"
	}
]

/**
 * All servers
 */
const servers = serversNoJaeger.concat([{name:"Jaeger", value: "jaeger"}]);

const commands = [
	new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Get the bot\'s current ping to Discord servers')
		.setIntegrationTypes([0, 1])
		.setContexts([0, 1, 2]),
	new SlashCommandBuilder()
		.setName('help')
		.setDescription('Get a list of bot commands and associated links')
		.setIntegrationTypes([0, 1])
		.setContexts([0, 1, 2]),
	new SlashCommandBuilder()
		.setName('character')
		.setDescription('Look up a character\'s stats and basic information')
		.setIntegrationTypes([0, 1])
		.setContexts([0, 1, 2])
		.addStringOption(option =>
			option.setName('name')
				.setDescription('Character name, or multiple separated by spaces')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('platform')
				.setDescription("Which platform is the character on?  Defaults to PC")
				.addChoices(platforms)),
	new SlashCommandBuilder()
		.setName('stats')
		.setDescription('Look up a character\'s stats, either with the specified weapon or overall')
		.setIntegrationTypes([0, 1])
		.setContexts([0, 1, 2])
		.addStringOption(option =>
			option.setName('name')
				.setDescription('Character name')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('weapon')
				.setDescription('Weapon name or id, can search with a partial name')
				.setRequired(false))
		.addStringOption(option =>
			option.setName('platform')
				.setDescription("Which platform is the character on?  Defaults to PC")
				.addChoices(platforms)),
	new SlashCommandBuilder()
		.setName('outfit')
		.setDescription('Look up an outfit\'s basic information, including recent activity and bases owned')
		.setIntegrationTypes([0, 1])
		.setContexts([0, 1, 2])
		.addStringOption(option =>
			option.setName('tag')
				.setDescription('Outfit tag or tags separated by spaces, no brackets')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('platform')
				.setDescription("Which platform is the outfit on?  Defaults to PC")
				.addChoices(platforms)),
	new SlashCommandBuilder()
		.setName('online')
		.setDescription('Look up currently online members for a given outfit')
		.setIntegrationTypes([0, 1])
		.setContexts([0, 1, 2])
		.addStringOption(option =>
			option.setName('tag')
				.setDescription('Outfit tag or tags separated by spaces, no brackets')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('platform')
				.setDescription("Which platform is the outfit on?  Defaults to PC")
				.addChoices(platforms)),
	new SlashCommandBuilder()
		.setName('subscribe')
		.setDescription('Subscribe to various different real time events')
		.setIntegrationTypes([0])
		.setContexts([0, 1])
		.addSubcommand(subcommand =>
			subcommand
				.setName('alerts')
				.setDescription('Receive alert notifications when an alert starts on a server')
				.addStringOption(option =>
					option.setName('server')
						.setDescription('Server name')
						.setRequired(true)
						.addChoices(servers)))
		.addSubcommand(subcommand =>
			subcommand
				.setName('activity')
				.setDescription('Receive notifications whenever an outfit member logs in or out')
				.addStringOption(option =>
					option.setName('tag')
						.setDescription('Tag of outfit to subscribe to, no brackets')
						.setRequired(true))
				.addStringOption(option =>
					option.setName('platform')
						.setDescription("Which platform is the outfit on?  Defaults to PC")
						.addChoices(platforms)))
		.addSubcommand(subcommand =>
			subcommand
				.setName('captures')
				.setDescription('Receive a notification whenever an outfit captures a base')
				.addStringOption(option =>
					option.setName('tag')
						.setDescription('Tag of outfit to subscribe to, no brackets')
						.setRequired(true))
				.addStringOption(option =>
					option.setName('platform')
						.setDescription("Which platform is the outfit on?  Defaults to PC")
						.addChoices(platforms)))
		.addSubcommand(subcommand =>
			subcommand
				.setName('unlocks')
				.setDescription('Receive a notification when a continent unlocks on a server')
				.addStringOption(option =>
					option.setName('server')
						.setDescription('Server name')
						.setRequired(true)
						.addChoices(servers))),
	new SlashCommandBuilder()
		.setName('unsubscribe')
		.setDescription('Subscribe to various different real time events')
		.setIntegrationTypes([0])
		.setContexts([0, 1])
		.addSubcommand(subcommand =>
			subcommand
				.setName('alerts')
				.setDescription('Remove active alert subscriptions')
				.addStringOption(option =>
					option.setName('server')
						.setDescription('Server name')
						.setRequired(true)
						.addChoices(servers)))
		.addSubcommand(subcommand =>
			subcommand
				.setName('activity')
				.setDescription('Remove active outfit activity subscriptions')
				.addStringOption(option =>
					option.setName('tag')
						.setDescription('Tag of outfit to remove, no brackets')
						.setRequired(true))
				.addStringOption(option =>
					option.setName('platform')
						.setDescription("Which platform is the outfit on?  Defaults to PC")
						.addChoices(platforms)))
		.addSubcommand(subcommand =>
			subcommand
				.setName('captures')
				.setDescription('Remove active outfit base capture subscriptions')
				.addStringOption(option =>
					option.setName('tag')
						.setDescription('Tag of outfit to remove.  No brackets')
						.setRequired(true))
				.addStringOption(option =>
					option.setName('platform')
						.setDescription("Which platform is the outfit on?  Defaults to PC")
						.addChoices(platforms)))
		.addSubcommand(subcommand =>
			subcommand
				.setName('unlocks')
				.setDescription('Remove active continent unlock subscriptions')
				.addStringOption(option =>
					option.setName('server')
						.setDescription('Server name')
						.setRequired(true)
						.addChoices(servers)))
		.addSubcommand(subcommand =>
			subcommand
				.setName('all')
				.setDescription('Remove all active subscriptions and settings from the channel')),
	new SlashCommandBuilder()
		.setName('config')
		.setDescription('Modify subscription settings')
		.setIntegrationTypes([0])
		.setContexts([0, 1])
		.addSubcommand(subcommand =>
			subcommand
				.setName('view')
				.setDescription('View current subscription settings')
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('audit')
				.setDescription('Check for errors in subscription settings')
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('continent')
				.setDescription('Enable or disable alert and unlock notifications for a given continent')
				.addStringOption(option =>
					option.setName('continent')
						.setDescription('The continent to change the setting for')
						.setRequired(true)
						.addChoices([
							{
								name: 'Koltyr',
								value: 'koltyr'
							},
							{
								name: 'Indar',
								value: 'indar'
							},
							{
								name: 'Hossin',
								value: 'hossin'
							},
							{
								name: 'Amerish',
								value: 'amerish'
							},
							{
								name: 'Esamir',
								value: 'esamir'
							},
							{
								name: 'Oshur',
								value: 'oshur'
							},
							{
								name: 'Other',
								value: 'other'
							}
						])
				)
				.addStringOption(option =>
					option.setName('setting')
						.setDescription("Show alerts and unlocks for specified continent")
						.setRequired(true)
						.addChoices([
							{
								name: 'Enable',
								value: 'enable'
							},
							{
								name: 'Disable',
								value: 'disable'
							}
						])
				)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('autodelete')
				.setDescription('Automatically delete alerts and outfit activity notifications')
				.addStringOption(option =>
					option.setName('setting')
						.setDescription('Delete notifications in this channel')
						.setRequired(true)
						.addChoices([
							{
								name: 'Enable',
								value: 'enable'
							},
							{
								name: 'Disable',
								value: 'disable'
							}
						])
				)
		)
		.addSubcommand(subcommand => 
			subcommand
				.setName('alert-types')
				.setDescription('Whether to show different types of alerts')
				.addStringOption(option =>
					option.setName('type')
						.setDescription('The type of alert')
						.setRequired(true)
						.addChoices([
							{
								name: 'Territory alerts',
								value: 'territory'
							},
							{
								name: 'Non-territory alerts',
								value: 'nonterritory'
							},
						])
				)),
	new SlashCommandBuilder()
		.setName('population')
		.setDescription('Look up the current population of a server')
		.setIntegrationTypes([0, 1])
		.setContexts([0, 1, 2])
		.addStringOption(option =>
			option.setName('server')
				.setDescription('Server name')
				.setRequired(true)
				.addChoices(servers.concat([allOption]))),
	new SlashCommandBuilder()
		.setName('territory')
		.setDescription('Look up the current territory control of a server')
		.setIntegrationTypes([0, 1])
		.setContexts([0, 1, 2])
		.addStringOption(option =>
			option.setName('server')
				.setDescription('Server name')
				.setRequired(true)
				.addChoices(servers)),
	new SlashCommandBuilder()
		.setName('alerts')
		.setDescription('Look up ongoing alerts on a server')
		.setIntegrationTypes([0, 1])
		.setContexts([0, 1, 2])
		.addStringOption(option =>
			option.setName('server')
				.setDescription('Server name')
				.setRequired(true)
				.addChoices(serversNoJaeger)),
	new SlashCommandBuilder()
		.setName('status')
		.setDescription('Look up server status as provided by the API')
		.setIntegrationTypes([0, 1])
		.setContexts([0, 1, 2]),
	new SlashCommandBuilder()
		.setName('weapon')
		.setDescription('Look up weapon stats')
		.setIntegrationTypes([0, 1])
		.setContexts([0, 1, 2])
		.addStringOption(option =>
			option.setName('query')
				.setDescription('Weapon name, partial name, or id')
				.setRequired(true)
				.setAutocomplete(true)),
	new SlashCommandBuilder()
		.setName('weaponsearch')
		.setDescription('Look up a list of weapons matching your search')
		.setIntegrationTypes([0, 1])
		.setContexts([0, 1, 2])
		.addStringOption(option =>
			option.setName('query')
				.setDescription('Weapon name or partial name')
				.setRequired(true)),
	new SlashCommandBuilder()
		.setName('implant')
		.setDescription('Look up implant information')
		.setIntegrationTypes([0, 1])
		.setContexts([0, 1, 2])
		.addStringOption(option =>
			option.setName('query')
				.setDescription('Implant name or partial name')
				.setRequired(true)
				.setAutocomplete(true)),
	new SlashCommandBuilder()
		.setName('asp')
		.setDescription('Look up ASP specific information for a character')
		.setIntegrationTypes([0, 1])
		.setContexts([0, 1, 2])
		.addStringOption(option =>
			option.setName('name')
				.setDescription('Character name')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('platform')
				.setDescription("Which platform is the character on?  Defaults to PC")
				.addChoices(platforms)),
	new SlashCommandBuilder()
		.setName('dashboard')
		.setDescription('Create an automatically updating dashboard')
		.setIntegrationTypes([0])
		.setContexts([0, 1])
		.addSubcommand(subcommand =>
			subcommand
				.setName('server')
				.setDescription('Create an automatically updating dashboard displaying server status')
				.addStringOption(option =>
					option.setName('server')
						.setDescription('Server name')
						.setRequired(true)
						.addChoices(servers))
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('outfit')
				.setDescription('Create an automatically updating dashboard displaying outfit status')
				.addStringOption(option =>
					option.setName('tag')
						.setDescription('Outfit tag')
						.setRequired(true))
				.addStringOption(option =>
					option.setName('platform')
						.setDescription("Which platform is the outfit on?  Defaults to PC")
						.addChoices(platforms))),
	new SlashCommandBuilder()
		.setName('tracker')
		.setDescription('Create an automatically updating voice channel')
		.setIntegrationTypes([0])
		.setContexts([0])
		.addSubcommand(subcommand =>
			subcommand
				.setName('server')
				.setDescription('Create an automatically updating voice channel displaying server info')
				.addStringOption(option =>
					option.setName('server')
						.setDescription('Server name')
						.setRequired(true)
						.addChoices(servers))
				.addStringOption(option =>
					option.setName('type')
						.setDescription('Type of tracker channel')
						.setRequired(true)
						.addChoices([
							{
								name: 'Population',
								value: 'population'
							},
							{
								name: 'Continents',
								value: 'territory'
							}
						])
				)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('outfit')
				.setDescription('Create an automatically updating voice channel displaying outfit online count')
				.addStringOption(option =>
					option.setName('tag')
						.setDescription('Outfit tag')
						.setRequired(true))
				.addBooleanOption(option =>
					option.setName('show-faction')
						.setDescription('Display a faction indicator in channel name? ex: 🟣/🔵/🔴/⚪')
						.setRequired(true))
				.addStringOption(option =>
					option.setName('platform')
						.setDescription("Which platform is the outfit on?  Defaults to PC")
						.addChoices(platforms))),
	new SlashCommandBuilder()
		.setName('auraxiums')
		.setDescription('Lookup a list of a character\'s Auraxium medals')
		.setIntegrationTypes([0, 1])
		.setContexts([0, 1, 2])
		.addStringOption(option =>
			option.setName('name')
				.setDescription('Character name')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('platform')
				.setDescription("Which platform is the character on?  Defaults to PC")
				.addChoices(platforms)),
	new SlashCommandBuilder()
		.setName('leaderboard')
		.setDescription('Lookup current leaderboard')
		.setIntegrationTypes([0, 1])
		.setContexts([0, 1, 2])
		.addStringOption(option =>
			option.setName('type')
				.setDescription('Type of leaderboard to look up')
				.setRequired(true)
				.addChoices([
					{
						name: 'Kills',
						value: 'Kills'
					},
					{
						name: 'Score',
						value: 'Score'
					},
					{
						name: 'Time',
						value: 'Time'
					},
					{
						name: 'Deaths',
						value: 'Deaths'
					}
				])
		)
		.addStringOption(option =>
			option.setName('period')
				.setDescription('Time period of the leaderboard')
				.setRequired(true)
				.addChoices([
					{
						name: 'Forever',
						value: 'Forever'
					},
					{
						name: 'Monthly',
						value: 'Monthly'
					},
					{
						name: 'Weekly',
						value: 'Weekly'
					},
					{
						name: 'Daily',
						value: 'Daily'
					},
					{
						name: 'One Life',
						value: 'OneLife'
					}
				])
		)
		.addStringOption(option =>
			option.setName('server')
				.setDescription('Server name')
				.setRequired(false)
				.addChoices(servers)),
	new SlashCommandBuilder()
		.setName('directives')
		.setDescription('Lookup a list of a character\'s Auraxium medals')
		.setIntegrationTypes([0, 1])
		.setContexts([0, 1, 2])
		.addStringOption(option =>
			option.setName('name')
				.setDescription('Character name')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('platform')
				.setDescription("Which platform is the character on?  Defaults to PC")
				.addChoices(platforms)),
	new SlashCommandBuilder()
		.setName('vehicle')
		.setDescription('Lookup a character\'s stats with a given vehicle')
		.setIntegrationTypes([0, 1])
		.setContexts([0, 1, 2])
		.addStringOption(option =>
			option.setName('name')
				.setDescription('Character name')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('vehicle')
				.setDescription('Vehicle name')
				.setRequired(true)
				.setAutocomplete(true))
		.addStringOption(option =>
			option.setName('platform')
				.setDescription("Which platform is the character on?  Defaults to PC")
				.addChoices(platforms)),
	new SlashCommandBuilder()
		.setName('owned-implants')
		.setDescription('Lookup a list of a character\'s implants')
		.setIntegrationTypes([0, 1])
		.setContexts([0, 1, 2])
		.addStringOption(option =>
			option.setName('name')
				.setDescription('Character name')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('platform')
				.setDescription("Which platform is the character on?  Defaults to PC")
				.addChoices(platforms))
]

const commandsJSON = commands.map(command => command.toJSON());

const rest = new REST().setToken(process.env.token);

(async () => {
	try {
		console.log('Started refreshing application (/) commands.');

		const data = await rest.put(
			Routes.applicationCommands(process.env.clientID),
			{ body: commandsJSON },
		);

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		console.error(error);
	}
}

)();