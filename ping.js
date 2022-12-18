/**
 * This file implements the ping command.
 * @module ping
 * @typedef {import('discord.js').Interaction} Interaction
 */

const i18n = require('i18n');

/**
 * Runs the `/ping` command
 * @param { Interaction } interaction - command chat interaction
 * @param { string } locale - The locale of the user 
 */
async function execute(interaction, locale) {
    await interaction.editReply(`Bot's ping to Discord is ${interaction.client.ws.ping}ms`);
}

module.exports = {
    execute
}