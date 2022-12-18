/**
 * This file implements the help slash command
 * @module help
 * @typedef {import('discord.js').Interaction} Interaction
 */

const Discord = require('discord.js');
const i18n = require('i18n');

const listOfCommands = 
"/help\n\
\n\
/character [name] <platform>\n\
/stats [name] <weapon name/id> <platform>\n\
/asp [name] <platform>\n\
/auraxiums [name] <platform>\n\
/directives [name] <platform>\n\
/vehicle [name] [vehicle] <platform>\n\
/outfit [tag] <platform>\n\
/online [tag] <platform>\n\
/population [server]\n\
/territory [server]\n\
/alerts [server]\n\
/leaderboard [type] [period] <server>\n\
/status\n\
/weapon [weapon name/id]\n\
/weaponSearch [name]\n\
/implant [implant name]\n\
/(un)subscribe alerts [server]\n\
/(un)subscribe activity [tag] <platform>\n\
/(un)subscribe captures [tag] <platform>\n\
/(un)subscribe unlocks [server]\n\
/(un)subscribe twitter [wrel/planetside]\n\
/unsubscribe all\n\
/config view\n\
/config audit\n\
/config continent [continent] [enable/disable]\n\
/config autodelete [enable/disable]\n\
/tracker server [server] [Population/Continents]\n\
/tracker outfit [tag] <platform>\n\
/dashboard server [server]\n\
/dashboard outfit [tag] <platform>";

/**
 * Runs the `/help` command
 * @param { Interaction } interaction chat command interaction
 * @param { string } locale locale of the user
 */
async function execute(interaction, locale) {
    let helpEmbed = new Discord.MessageEmbed();
    helpEmbed.setTitle("Auraxis bot");
    helpEmbed.setColor("BLUE");
    helpEmbed.addField(i18n.__({phrase: "Commands", locale: locale}), listOfCommands);
    const links = `\
    \n[${i18n.__({phrase: "GitHub page & FAQ", locale: locale})}](https://github.com/RemainNA/auraxis-bot)\
    \n[${i18n.__({phrase: "Support server", locale: locale})}](https://discord.gg/Kf5P6Ut)\
    \n[${i18n.__({phrase: "Invite bot", locale: locale})}](https://discord.com/api/oauth2/authorize?client_id=437756856774033408&permissions=1330192&scope=bot%20applications.commands)\
    \n[${i18n.__({phrase: "Donate on Ko-fi", locale: locale})}](https://ko-fi.com/remainna)\
    \n[${i18n.__({phrase: "Translate on Crowdin", locale: locale})}](https://crowdin.com/project/auraxis-bot)`
    helpEmbed.addField(i18n.__({phrase: "Links", locale: locale}), links);
    helpEmbed.setFooter({text: i18n.__({phrase: "<> = Optional, [] = Required", locale: locale})});
    await interaction.reply({embeds: [helpEmbed]});
}

module.exports = {
    execute
}