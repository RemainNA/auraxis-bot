# auraxis-bot
A discord bot to look up stats and information from Planetside 2

# Structure
The main event listener is in main.js, it starts a separate event listener in subscribeAlert.js which listens for subscribe commands and events from the Daybreak Stream API.  Most commands are separated into their own file, and utilize a queue async.

# Usage
The bot is designed to be simple to use.  Once added to your server, commands can be viewed with "!help".  In order to get the most out of the bot, please grant it the "embed link" and "manage messages" permissions.

# Contact
For feedback or error reports, the best ways to contact are reddit (/u/ultimatestormer) and Discord (Ultimastorm#8013)
