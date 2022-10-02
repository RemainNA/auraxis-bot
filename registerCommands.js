/**
 * Run this file with `node registerCommands.js` to register all commands for the  discord bot
 * @module registerCommands
 */
import { REST, Routes } from 'discord.js';
import * as dotenv from 'dotenv';

import  { readdirSync } from 'fs';
import { dirname, join } from 'path';

dotenv.config()

import i18n from 'i18n';
import { fileURLToPath } from 'url';
i18n.configure({
	directory: './locales/commands',
	defaultLocale: 'en-us',
	updateFiles: false,
	objectNotation: true
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const commands = [];
const commandsPath = join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = join(commandsPath, file);
	const command = await import(filePath);
	commands.push(command.data);
}

const rest = new REST({ version: '10'}).setToken(process.env.token);

try{
	await rest.put(
		Routes.applicationCommands(process.env.clientID),
		{ body: commands },
	);
	console.log('Commands registered');
}
catch(err){
	console.log(err);
}