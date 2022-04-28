# auraxis-bot

A Discord bot to look up stats and information from Planetside 2

## Invite

The bot can be added to your server with [this invite link](https://discord.com/api/oauth2/authorize?client_id=437756856774033408&permissions=1330192&scope=bot%20applications.commands).

## Structure

The main event listener for Discord messages is in `main.js`, it starts additional listeners in `unifiedWSListener.js` which each listen for events from the Daybreak Stream API for a given platform (PC, PS4US, PS4EU), as well as one in `twitterListener.js` for the Twitter Stream API.  Most commands have their functionality separated into their own files, and utilize async to support high message volume.  Database structure is defined in `dbStructure.sql`.

## Usage

The bot is designed to be simple to use.  Once added to your server with the [invite link](https://discord.com/api/oauth2/authorize?client_id=437756856774033408&permissions=1330192&scope=bot%20applications.commands), commands can be viewed with `/help`.  In order to get the most out of the bot, please grant it the "Read Messages", "Send Messages", "Embed Links", and "Use External Emoji" permissions.  In addition for slash commands to display emoji the @everyone role must have the "Use External Emoji" permission granted in that channel, regardless of the bot's permissions.

If you would like to deploy your own version of the bot, it is designed to run on Heroku.  When running locally a `.env` file is used for the environment variables, including the Discord Token, Daybreak Census API service ID, Postgres URL (optional), and Twitter API credentials (optional).  Subscription functionality will be disabled if a database URL is not present.

## Exclamation command deprecation

At the end of April Auraxis Bot will no longer support exclamation commands (e.g. !population), and all users must use slash commands.  If they are currently enabled in your server (type / to see if they appear) then you are all set!  Otherwise please re-authorize the bot using the [invite link](https://discord.com/api/oauth2/authorize?client_id=437756856774033408&permissions=1330192&scope=bot%20applications.commands).  *You do not need to kick then reinvite the bot*.

If you are a server owner and need exclamation commands for any reason (bot automations, etc.) please contact me at the locations below.

## Contact

For feedback or error reports, the best ways to contact are reddit (/u/RemainNA), Discord (RemainNA#0159), and the Auraxis bot [Discord server](https://discord.gg/Kf5P6Ut).

## Localization

Localization of the bot is managed through [Crowdin](https://crwd.in/auraxis-bot).  Please join there and the Discord server listed above to contribute translations.

If you notice a translation error please report it in the support server.

Thank you to the following translators for their contributions!

- Dutch: brakenium#9467
- German: Gretchen
- Korean: AlexKoala#0253
- Russian: Simacrus#9560
- Spanish: [1ITL] Facer

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

#### /asp [name] \<platform>

Returns the BR a character reached before joining ASP, as well as their current ASP points and skills.  Supports multiple characters per query.  Does not work with NSO.

### /auraxiums [name] \<platform>

Returns a chronological list of a character's Auraxiums.  Only 20 are displayed at first, but clicking the "View all" button will show the full list in an ephemeral message.

### /directives [name] \<platform>

Returns a chronological list of a character's completed directives.  Only 20 are displayed at first, but clicking the "View all" button will show the full list in an ephemeral message.

### /vehicle [name] [vehicle] \<platform>

Returns information about the character's vehicle usage, including play time, kills, roadkills, and top weapon.

#### /outfit [tag] \<platform>

Returns the details (Name, owner, faction, server, member count, etc.) of the specified outfit tag.  Supports multiple tags per query.

#### /online [tag] \<platform>

Returns the list of all online members for the specified outfit tag.  Supports multiple tags per query.

#### /population [server]

Returns the population per faction of the specified server.  Supports multiple servers per query.  Supports all platforms without prefixes

#### /territory [server]

Returns the territory control of each continent on the specified server.  Supports multiple servers per query.  Supports all platforms without prefixes

#### /alerts [server]

Returns ongoing alerts for the given server based on information from the ps2alerts api, including time remaining and current territory control.  Supports multiple servers per query.

### /leaderboard [type] [period] \<server>

Returns the specified leaderboard as reported by the Census API.

#### /status

Return the current status of all servers as reported by the Census API.  Takes no parameters.

#### /weapon [weapon name/id]

Currently in beta.  Returns information on a given weapon.  Accepts weapon IDs, exact names, or partial names.  Only supports one weapon per query.

#### /weaponsearch [name]

Returns a list of weapon names and ids matching the given search term.  Only supports one search term per query.

#### /implant [implant name]

Returns information on given implant.  Accepts exact or partial names.  Only supports one implant per query.

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

#### /subscribe unlocks [server]

Subscribes the channel to notifications of continent unlocks on the specified server.

#### /unsubscribe unlocks [server]

Unsubscribes the channel from the above notifications.Supports all platforms without prefixes.

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

### /config continent [continent] [enable/disable]

Enables or disables displaying alerts and unlocks for the given continent, or "other" for alerts such as Outfit Wars.

### /config autodelete [enable/disable]

Enables or disables automatically deleting alert notifications 5 minutes after they complete, and outfit activity notifications 5 minutes after they occur.

### /tracker server [server] [Population/Continents]

Creates a (by default) locked voice channel displaying server population or open continents.  The channel is automatically updated every 10 minutes.

### /tracker outfit [tag] \<platform>

Creates a (by default) locked voice channel displaying outfit online count.  The channel is automatically updated every 10 minutes.

### /dashboard server [server]

Posts a message with server population, territory control, and active alerts.  This message is automatically updated every 5 minutes.  Limit 1 dashboard per server per channel.

### /dashboard outfit [tag] \<platform>

Posts a message with outfit online members, owned bases, and resource generation.  This message is automatically updated every 5 minutes.  Limit 1 dashboard per outfit per channel.

## FAQ

### Why is the bot not posting in my server?

Please make sure you have granted it the "Read Messages" "Send Messages" and "Embed Links" permissions in the channel you are using it in.

### Why am I not seeing slash commands?

Certain servers will need to re-invite the bot to enable slash commands.  If you've done that, make sure that the "Use Application Commands" permission is granted for users in the appropriate channel.

### The bot is responding, but I'm not seeing any info

In your client settings, under "Text & Images" make sure "Show website preview info from links pasted into chat" is enabled

### Why am I seeing ":VS:", ":NC:", ":TR:", etc.?

The bot is not allowed to use external emoji in that channel, to fix this grant the Use External Emoji permission to the bot.

### What is IVI score?  How is it calculated?

IVI stands for "Infantry vs Infantry" and is one measure of "shooting skill" calculated by multiplying accuracy and headshot ratio.  Only weapons sanctioned under "infantry" in the community run sanction list and with more than 50 kills will be used in calculating IVI.  The stat as calculated per weapon is available in /stats as AHR (for Accuracy*Headshot Ratio) and is shown regardless of weapon sanction or number of kills.
