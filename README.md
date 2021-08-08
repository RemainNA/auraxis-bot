# auraxis-bot

A Discord bot to look up stats and information from Planetside 2

## Invite

The bot can be added to your server with [this invite link](https://discord.com/api/oauth2/authorize?client_id=437756856774033408&permissions=281616&scope=bot%20applications.commands).

## Structure

The main event listener for Discord messages is in `main.js`, it starts additional listeners in `unifiedWSListener.js` which each listen for events from the Daybreak Stream API for a given platform (PC, PS4US, PS4EU), as well as one in `twitterListener.js` for the Twitter Stream API.  Most commands have their functionality separated into their own files, and utilize async to support high message volume.  Database structure is defined in `dbStructure.sql`.

## Usage

The bot is designed to be simple to use.  Once added to your server with the [invite link](https://discord.com/api/oauth2/authorize?client_id=437756856774033408&permissions=281616&scope=bot%20applications.commands), commands can be viewed with `/help`.  In order to get the most out of the bot, please grant it the "Read Messages", "Send Messages", "Embed Links", and "Use External Emoji" permissions.

If you would like to deploy your own version of the bot, it is designed to run on Heroku.  When running locally a `.env` file is used for the environment variables, including the Discord Token, Daybreak Census API service ID, Postgres URL (optional), and Twitter API credentials (optional).  Subscription functionality will be disabled if a database URL is not present.

## Contact

For feedback or error reports, the best ways to contact are reddit (/u/RemainNA), Discord (RemainNA#0159), and the Auraxis bot [Discord server](https://discord.gg/Kf5P6Ut).

## Support development

There are three main ways to support development:

If you identify a bug, report it in the [Discord server](https://discord.gg/Kf5P6Ut).  Github issues are not used in development, and are not closely monitored.

If you have experience programming in Node.js and would like to contribute code directly, consider reaching out on the platforms listed above.

Finally, if you would like to contribute financially, there is a Ko-fi associated with this project:  
[![ko-fi](https://www.ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/E1E61FBIV)

Any support, including just a few kind words, is greatly appreciated!

## Commands

### <> = optional, [] = required

#### /help

Returns a list of commands and relevant links.

#### /character [character] \<platform>

Returns the details (BR, Score, Server, Outfit, etc.) of the specified character.  Supports multiple characters per query.

#### /stats [character] \<weapon name/id> \<platform>

Returns the stats of the specified character with the specified weapon.  If no weapon is entered it will fallback to the information provided by /character.

#### /outfit [tag] \<platform>

Returns the details (Name, owner, faction, server, member count, etc.) of the specified outfit tag.  Supports multiple tags per query.

#### /online [tag] \<platform>

Returns the list of all online members for the specified outfit tag.  Supports multiple tags per query.

#### /population [server]

Returns the population per faction of the specified server.  Supports multiple servers per query.  Supports all platforms without prefixes

#### /territory [server]

Returns the territory control of each continent on the specified server.  Supports multiple servers per query.  Supports all platforms without prefixes

#### /alerts [server]

Returns ongoing alerts for the given server based on information from the ps2alerts api, including time remaining and current territory control.  Supports multiple servers per query.  Currently only supports PC servers.

#### /status

Return the current status of all servers as reported by the Census API.  Takes no parameters.

#### /weapon [weapon name/id]

Currently in beta.  Returns information on a given weapon.  Accepts weapon IDs, exact names, or partial names.  Only supports one weapon per query.

#### /weaponsearch [name]

Returns a list of weapon names and ids matching the given search term.  Only supports one search term per query.

#### /implant [implant name]

Returns information on given implant.  Accepts exact or partial names.  Only supports one implant per query.

#### /asp [name] \<platform>

Returns the BR a character reached before joining ASP, as well as their current ASP points and skills.  Supports multiple characters per query.  Does not work with NSO.

## Commands requiring manage channel permissions

### These commands will only run if the user has Manage Channel permissions in the current channel

#### /subscribe alerts [server]

Subscribes the channel to notifications of alerts starting on the specified servers.  Supports multiple servers per query.  Supports all platforms without prefixes.

#### /unsubscribe alerts [server]

Unsubscribes the channel from the above notifications.  Supports multiple servers per query.  Supports all platforms without prefixes.

#### /subscribe activity [outfit] \<platform>

Subscribes the channel to notifications of logins and logouts of members in the specified outfit tag.  Supports multiple tags per query.

#### /unsubscribe activity [outfit] \<platform>

Unsubscribes the channel from the above notifications.  Supports multiple tags per query.

#### /subscribe captures [outfit] \<platform>

Subscribes the channel to notifications of bases captured by the specified tag.  Supports multiple tags per query.

#### /unsubscribe captures [outfit] \<platform>

Unsubscribes the channel from the above notifications.  Supports multiple tags per query.

#### /subscribe twitter [wrel/planetside]

Subscribes the channel to live Tweet notifications from the specified account.  Supports multiple users per query.

#### /unsubscribe twitter [wrel/planetside]

Unsubscribes the channel from the above notifications.  Supports multiple users per query.

#### /unsubscribe all

Unsubscribes the channel from all outfit activity, capture, and server alert notifications.

### /config view

Displays current subscription configuration options for the channel.

### /config audit

Attempts to fix issues with configuration options if they are missing.

### /config alerts [continent] [enable/disable]

Enables or disables displaying alerts for the given continent, or "other" for alerts such as Outfit Wars.

### /config autodelete [enable/disable]

Enables or disables automatically deleting alert notifications 5 minutes after they complete, and outfit activity notifications 5 minutes after they occur.

### /tracker [server] [Population/Continents]

Creates a (by default) locked voice channel displaying server population or open continents.  The channel is automatically updated every 10 minutes.

### /dashboard [server]

Posts a message with server population, territory control, and active alerts.  This message is automatically updated every 5 minutes.  Limit 1 dashboard per server per channel.

## FAQ

### Why is the bot not posting in my server?

Please make sure you have granted it the "Read Messages" "Send Messages" and "Embed Links" permissions in the channel you are using it in.

### Why am I not seeing slash commands?

Certain servers will need to re-invite the bot to enable slash commands.  If you've done that, make sure that the "Use Slash Commands" permission is granted for users in the appropriate channel.

### The bot is responding, but I'm not seeing any info

In your client settings, under "Text & Images" make sure "Show website preview info from links pasted into chat" is enabled

### Why am I seeing ":VS:", ":NC:", ":TR:", etc.?

The bot is not allowed to use external emoji in that channel, to fix this grant the Use External Emoji permission to the bot.

### What is IAHR?

IAHR score is "Infantry Accuracy * Headshot Ratio" score.  It is calculated by taking the cumulative accuracy and headshot ratios of all infantry weapons except for abilities, knives, grenades, rocket launchers, MAX AA and AV, explosives, and rocklet rifles, multiplying them together, then multiplying by 10,000.  AHR is the same, but per weapon instead of an aggregate across most infantry weapons.

### Why not use IVI score?

IVI score is not as standard as it seems.  When I attempted to implement it I discovered that different sources listed different IVI scores for the same character, and no standard formula was publicly available.  Because of that I decided it would be best to introduce an obviously distinct metric instead of adding to the confusion.
