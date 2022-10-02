/**
 * This file implements the ping command.
 * @module ping
 * @typedef {import('discord.js').ChatInputCommandInteraction} ChatInteraction
 */
import i18n from 'i18n';

export const data = {
    name: 'ping',
    description: `Get the bot's current ping to Discord servers`,
};

export const type = ['Base'];

/**
 * Runs the `/ping` command
 * @param { ChatInteraction } interaction - command chat interaction
 * @param { string } locale - The locale of the user 
 */
export async function execute(interaction, locale) {
    await interaction.editReply(`Bot's ping to Discord is ${interaction.client.ws.ping}ms`);
}