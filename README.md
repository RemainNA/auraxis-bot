# auraxis-bot
A discord bot to look up stats and information from Planetside 2 and Planetside Arena

# Invite
The bot can be added to your server with this link: https://discordapp.com/oauth2/authorize?client_id=437756856774033408&scope=bot&permissions=19456

# Structure
The main event listener is in main.js, it starts three separate event listeners in subscribeAlert.js which each listen for subscribe commands and events from the Daybreak Stream API for a given platform (PC, PS4US, PS4EU).  Most commands are separated into their own file, and utilize a queue async.

# Usage
The bot is designed to be simple to use.  Once added to your server, commands can be viewed with "!help".  In order to get the most out of the bot, please grant it the "Read Messages", "Send Messages", and "Embed Links" permissions.

# Contact
For feedback or error reports, the best ways to contact are reddit (/u/RemainNA), Discord (RemainNA#0159), and the Auraxis bot server (https://discord.gg/Kf5P6Ut)
