# auraxis-bot

A Discord bot to look up stats and information from Planetside 2

## Invite

The bot can be added to your server with [this invite link](https://discordapp.com/oauth2/authorize?client_id=437756856774033408&scope=bot&permissions=19456).

## Structure

The main event listener for Discord messages is in main.js, it starts additional listeners in unifiedWSListener.js which each listen for events from the Daybreak Stream API for a given platform (PC, PS4US, PS4EU).  Most commands have their functionality separated into their own files, and utilize async to support high message volume.

## Usage

The bot is designed to be simple to use.  Once added to your server with the [invite link](https://discordapp.com/oauth2/authorize?client_id=437756856774033408&scope=bot&permissions=19456), commands can be viewed with "!help".  In order to get the most out of the bot, please grant it the "Read Messages", "Send Messages", and "Embed Links" permissions.

If you would like to deploy your own version of the bot, it is designed to run on Heroku.  Running locally is available, as long as you provide a Discord token, Daybreak Census API service ID, and a Postgres database URL in an auth.json file.  Subscription functionality will be disabled if a database URL is not present.

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

#### !help

Returns a list of commands and relevant links.

#### !<ps4us/ps4eu> character [character]

Returns the details (BR, Score, Server, Outfit, etc.) of the specified character.  Supports multiple characters per query.

#### !<ps4us/ps4eu> stats [character] \<weapon name/id>

Returns the stats of the specified character with the specified weapon.  If no weapon is entered it will fallback to the information provided by !character.

#### !<ps4us/ps4eu> outfit [tag]

Returns the details (Name, owner, faction, server, member count, etc.) of the specified outfit tag.  Supports multiple tags per query.

#### !<ps4us/ps4eu> online [tag]

Returns the list of all online members for the specified outfit tag.  Supports multiple tags per query.

#### !subscribe alerts [server]

Subscribes the channel to notifications of alerts starting on the specified servers.  Supports multiple servers per query.  Supports all platforms without prefixes.

#### !unsubscribe alerts [server]

Unsubscribes the channel from the above notifications.  Supports multiple servers per query.  Supports all platforms without prefixes.

#### !<ps4us/ps4eu> subscribe activity [outfit]

Subscribes the channel to notifications of logins and logouts of members in the specified outfit tag.  Supports multiple tags per query.

#### !<ps4us/ps4eu> unsubscribe activity [outfit]

Unsubscribes the channel from the above notifications.  Supports multiple tags per query.

#### !<ps4us/ps4eu> subscribe captures [outfit]

Subscribes the channel to notifications of bases captured by the specified tag.  Supports multiple tags per query.

#### !<ps4us/ps4eu> unsubscribe captures [outfit]

Unsubscribes the channel from the above notifications.  Supports multiple tags per query.

#### !unsubscribe all

Unsubscribes the channel from all outfit activity, capture, and server alert notifications.

#### !population [server]

Returns the population per faction of the specified server.  Supports multiple servers per query.  Supports all platforms without prefixes

#### !territory [server]

Returns the territory control of each continent on the specified server.  Supports multiple servers per query.  Supports all platforms without prefixes

#### !status

Return the current status of all servers as reported by the Census API.  Takes no parameters.

#### !weapon [weapon name/id]

Currently in beta.  Returns information on a given weapon.  Accepts weapon IDs, exact names, or partial names.  Only supports one weapon per query.

#### !implant [implant name]

Returns information on given implant.  Accepts exact or partial names.  Only supports one implant per query.

#### !<ps4us/ps4eu> asp [name]

Returns the BR a character reached before joining ASP.  Supports multiple characters per query.  Untested on PS4.  Does not work with NSO.
