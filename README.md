# auraxis-bot

A Discord bot to look up stats and information from Planetside 2

## Invite

The bot can be added to your server with [this invite link](https://discordapp.com/oauth2/authorize?client_id=437756856774033408&scope=bot&permissions=19456).

## Structure

The main event listener is in main.js, it starts additional listeners in unifiedWSListener.js which each listen for subscribe commands and events from the Daybreak Stream API for a given platform (PC, PS4US, PS4EU).  Most commands are separated into their own file, and utilize async to support multiple servers.

## Usage

The bot is designed to be simple to use.  Once added to your server, commands can be viewed with "!help".  In order to get the most out of the bot, please grant it the "Read Messages", "Send Messages", and "Embed Links" permissions.

If you would like to deploy your own version of the bot, it is designed to run on Heroku.  Running locally is available, as long as you provide a Discord token and Daybreak Census API service ID in an auth.json file.  Subscription functionality will be disabled if run this way.

## Contact

For feedback or error reports, the best ways to contact are reddit (/u/RemainNA), Discord (RemainNA#0159), and the Auraxis bot [Discord server](https://discord.gg/Kf5P6Ut).

## Support development

There are three main ways to support development:

If you identify a bug, report it in the [Discord server](https://discord.gg/Kf5P6Ut).  Github issues are not used in development, and are not closely monitored.

If you have experience programming in Node.js and would like to contribute code directly, consider reaching out on the platforms listed above.

Finally, if you would like to contribute financially, there is a Ko-fi associated with this project:  
[![ko-fi](https://www.ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/E1E61FBIV)

Any support, including just a few kind words, is greatly appreciated!
