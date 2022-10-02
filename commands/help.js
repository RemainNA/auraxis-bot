/**
 * This file implements the help slash command
 * @module help
 * @typedef {import('discord.js').ChatInputCommandInteraction} ChatInteraction
 */
import { EmbedBuilder } from 'discord.js';
import i18n from 'i18n';

export const data = {
name: 'help',
description: 'Get a list of commands',
};

export const type = ['Base'];

/**
 * Runs the `/help` command
 * @param { ChatInteraction } interaction - chat command interaction 
 * @param { string } locale - locale to use
 */
export async function execute(interaction, locale) {
    /**
     * Due to Discord API limitations, values for field bodies can only be 1024 characters long
     * and indentations include new tabs and spaces as part of the character limit
     * any field with multiple lines cannot be indented.
     */
    const listOfCommands = 
`/help

/character [name] <platform>
/stats [name] <weapon name/id> <platform>
/asp [name] <platform>
/auraxiums [name] <platform>
/directives [name] <platform>
/vehicle [name] [vehicle] <platform>
/outfit [tag] <platform>
/online [tag] <platform>
/population [server]
/territory [server]
/alerts [server]
/leaderboard [type] [period] <server>
/status
/weapon [weapon name/id]
/weaponSearch [name]
/implant [implant name]
/(un)subscribe alerts [server]
/(un)subscribe activity [tag] <platform>
/(un)subscribe captures [tag] <platform>
/(un)subscribe unlocks [server]
/(un)subscribe twitter [wrel/planetside]
/unsubscribe all
/config view
/config audit
/config continent [continent] [enable/disable]
/config autodelete [enable/disable]
/tracker server [server] [Population/Continents]
/tracker outfit [tag] <platform>
/dashboard server [server]
/dashboard outfit [tag] <platform>`;
    const links = 
`[${i18n.__({phrase: "GitHub page & FAQ", locale: locale})}](https://github.com/RemainNA/auraxis-bot)
[${i18n.__({phrase: "Support server", locale: locale})}](https://discord.gg/Kf5P6Ut)
[${i18n.__({phrase: "Invite bot", locale: locale})}](https://discord.com/api/oauth2/authorize?client_id=437756856774033408&permissions=1330192&scope=bot%20applications.commands)
[${i18n.__({phrase: "Donate on Ko-fi", locale: locale})}](https://ko-fi.com/remainna)
[${i18n.__({phrase: "Translate on Crowdin", locale: locale})}](https://crowdin.com/project/auraxis-bot)`;
    const embed = new EmbedBuilder()
        .setTitle('Auraxis Bot')
        .setColor('Blue')
        .addFields(
            {name: i18n.__({phrase: "Commands", locale: locale}), value: listOfCommands},
            {name: i18n.__({phrase: "Links", locale: locale}), value: links}
        )
        .setFooter(
            {text: i18n.__({phrase: "<> = Optional, [] = Required", locale: locale})}
        );
    await interaction.editReply({embeds: [embed]});
}