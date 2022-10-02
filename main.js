/**
 * This file implements the main event listener of the bot, which picks up messages, parses them for commands, and calls the appropriate functions.
 * @module main
 */

import 'dotenv/config.js';

import i18n from 'i18n';
import pg from 'pg';
import { Client, GatewayIntentBits, Partials, Collection, InteractionType } from 'discord.js';

import { readdirSync } from 'fs';
import { join,  dirname } from 'path';
import { fileURLToPath } from 'url';

import { update as trackerUpdate} from './commands/tracker.js';
import { update as dashboardUpdate } from './commands/dashboard.js'
import { update as outfitUpdate } from './outfitMaintenance.js';
import { update as alertUpdate } from './alertMaintenance.js';
import { run as runDeleteMessages } from './deleteMessages.js';
import { check as checkOpenContinents} from './openContinents.js';
import { start as startListener } from './unifiedWSListener.js';
import { init, connect, latestTweet } from './twitterListener.js';


i18n.configure({
	directory: './locales/responses',
	defaultLocale: 'en-US',
	retryInDefaultLocale: true,
	updateFiles: false,
	objectNotation: true,
});

const twitter = process.env.TWITTER_CONSUMER_KEY !== undefined;
const DB = process.env.DATABASE_URL !== undefined;
const SQLclient = new pg.Client({
	connectionString: process.env.DATABASE_URL,
	ssl: {rejectUnauthorized: false}
});

const intentsList = [
	GatewayIntentBits.GuildMessages,
	GatewayIntentBits.DirectMessages,
	GatewayIntentBits.Guilds
];
const client = new Client({
	intents: intentsList,
	allowedMentions: { parse: ['users'] },
	partials: [Partials.Channel]
});

client.commands = new Collection();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const commandsPath = join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = join(commandsPath, file);
	const command = await import(filePath);
	client.commands.set(command.data.name, command);
}
client.on('ready', async () => {
	console.log(`Running on ${client.guilds.cache.size} servers`);
	if (DB) {
		await SQLclient.connect();

		startListener(SQLclient, client);
		if(twitter) {
			init();
			connect(SQLclient, client.channels);
			latestTweet(SQLclient, client.channels);
		}

		/** The bot cycles every 24 hours, so these will be called every 24 hours */
		dashboardUpdate(SQLclient, client);
		trackerUpdate(SQLclient, client);
		outfitUpdate(SQLclient);
		alertUpdate(SQLclient, client);
		runDeleteMessages(SQLclient, client);
		checkOpenContinents(SQLclient, client);

		setInterval(() => {
			runDeleteMessages(SQLclient, client);
			checkOpenContinents(SQLclient, client);
		}, 60000); //Update alerts every minute
		setInterval(() => {
			alertUpdate(SQLclient, client);
			dashboardUpdate(SQLclient, client);
		}, 300000); //Update dashboards every 5 minutes
		setInterval(() => {
			trackerUpdate(SQLclient, client);
		}, 600000); // Update trackers every 10 minutes
	}
	client.user.setActivity('/help');
});

client.on('interactionCreate', async interaction => {
	const command = client.commands.get(interaction.commandName);
	const locale = interaction.locale;
	if (interaction.type === InteractionType.ApplicationCommand) {
		await interaction.deferReply();
		try {
			if (command.type.includes('PGClient')) {
				await command.execute(interaction, locale, SQLclient);
			} else {
				await command.execute(interaction, locale);
			}
		} catch (error) {
			try {
				if (typeof error !== 'string') {
					console.log(`Error in ${interaction.commandName} ${locale}`);
					if (error.code == 10062) { // "Unknown Interaction"
						console.log('Unknown Interaction');
						console.log(interaction.options);
						return
					}
					else if (error.code == 10008) { // "Unknown Message"
						console.log('Unknown Message');
						console.log(interaction.options);
						return
					}
					console.log(error);
					await interaction.editReply(i18n.__({ phrase: 'Error occurred when handling command', locale: locale }));
				}
				else {
					await interaction.editReply(error);
				}
			} catch (error) {
				console.log('Error handling slash command error');
				console.log(error);
			}
		}
	}
	else if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
		try {
			await command.partialMatches(interaction);
		} catch (error) {
			if (error.code == 10062) {
				return;
			}
			console.log('Autocomplete error');
			console.log(error);
		}
	}
	else if (interaction.type === InteractionType.MessageComponent) {
		try {
			const options = interaction.customId.split('%');
			const command = client.commands.get(options.shift());
			if (command.type.includes('PGClient')) {
				await command.button(interaction, locale, options, SQLclient);
			} else {
				await command.button(interaction, locale, options);
			}
		} catch (error) {
			try{
				if(typeof error !== 'string'){
					console.log(`Error in ${interaction.customId} button ${locale}`);
					if(error.code == 10062){ //"Unknown interaction"
						console.log("Unknown interaction");
						return;
					}
					else if(error.code == 10008){ //"Unknown Message"
						console.log("Unknown Message");
						return;
					}
					console.log(error);
					await interaction.editReply(i18n.__({phrase: "Error occurred when handling command", locale: locale}));
				}
				else{
					await interaction.editReply(error);
				}
			}
			catch(error){
				console.log("Error handling button error");
				console.log(error);
			}
		}
	}
});

client.login(process.env.token);