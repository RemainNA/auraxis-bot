/**
 * This file defines several functions used in subscribing or unsubscribing to server alerts and outfit activity
 * @module subscriptions
 */
/**
 * @typedef {import('pg').Client} pg.Client
 * @typedef {import('discord.js').User} discord.User 
 */

const config = require('./subscriptionConfig.js');
const { censusRequest, badQuery, faction } = require('./utils.js')
const { PermissionFlagsBits } = require('discord-api-types/v10');
const i18n = require('i18n');

/**
 * Case insensitive way of getting server names
 * @param {string} server - server name to standardize
 * @returns capitalized server name
 */
const standardizeName = function(server){
    switch(server.toLowerCase()){
        case "connery":
            return "Connery";
        case "miller":
            return "Miller";
        case "cobalt":
            return "Cobalt";
        case "emerald":
            return "Emerald";
        case "jaeger":
            return "Jaeger";
        case "soltech":
            return "SolTech";
        case "genudine":
            return "Genudine";
        case "ceres":
            return "Ceres";
    }
}

/**
 * Get an overview of outfit information
 * @param {string} tag - the tag of the outfit  to check
 * @param {string} platform - the platform of the outfit
 * @returns {Promise<{ID: string, faction: string, alias: string, name: string}>}
 * @throws if `tag` is not a valid outfit tag
 */
const outfitInfo = async function(tag, platform){
    const response = await censusRequest(platform, 'outfit_list', `/outfit?alias_lower=${tag.toLowerCase()}&c:join=character^on:leader_character_id^to:character_id`);
    if(typeof(response[0]) != undefined && response[0]){
        let resObj = {
            ID: response[0].outfit_id,
            faction: response[0].leader_character_id_join_character.faction_id,
            alias: response[0].alias,
            name: response[0].name
        };
        return resObj;
    }

    throw `${tag} not found`;
}

/**
 * Get the encoding scheme of twitter users in the database
 *  @param {string} user - twitter user to check, is case insensitive
 * @returns the encoding scheme of the user
 */
const twitterUsers = function(user){
    switch(user.toLowerCase()){
        case "remainna":
            return "Remain_NA-twitter";
        case "wrel":
            return "WrelPlays-twitter";
        case "planetside":
            return "planetside2-twitter";
        default:
            return false;
    }
}

/**
 * environment: platform
 * @example
 * "ps2:v2": "pc",
 * "ps2ps4us:v2": "ps4us",
 * "ps2ps4eu:v2": "ps4eu"
 */
const environmentToPlatform = {
    "ps2:v2": "pc",
    "ps2ps4us:v2": "ps4us",
    "ps2ps4eu:v2": "ps4eu"
}

module.exports = {
    /**
     * Subscribes to outfit member login and logouts
     * @param {pg.Client} pgClient - Postgres client to use
     * @param {string} channel - the id of the channel to update
     * @param {string} tag - the tag of the outfit to subscribe to
     * @param {string} environment - the platform of the outfit 
     * @returns a message of the outcome of the subscription
     * @throws if `tag` contains invalid characters
     */
    subscribeActivity: async function(pgClient, channel, tag, environment){
        //pgClient is the pgClient object from main
        //channel is the discord channel ID
        //tag is the outfit tag
        //environment is ps2:v2, ps2ps4us:v2, or ps2ps4eu:v2
        if(badQuery(tag)){
			throw "Outfit search contains disallowed characters";
		}
        let outfit = await outfitInfo(tag, environment);
        let platform = environmentToPlatform[environment];
        let count = await pgClient.query('SELECT COUNT(channel) FROM outfitactivity WHERE id=$1 AND channel=$2 AND platform=$3', [outfit.ID, channel, platform]);
        if(count.rows[0].count > 0){
            throw `Already subscribed to ${outfit.alias}`;
        }
        const color = faction(outfit.faction).color
        pgClient.query("INSERT INTO outfitactivity (id, alias, color, channel, platform) VALUES ($1, $2, $3, $4, $5)", [outfit.ID, outfit.alias, color, channel, platform]);
        try{
            await config.initializeConfig(channel, pgClient)
            return `Subscribed to ${outfit.alias} activity`;
        }
        catch(err){
            return `Subscribed to ${outfit.alias} activity.  Configuration step failed, using default config.`;
        }
    },

    /**
     * Unsubscribes from outfit member login and logouts
     * @param {pg.Client} pgClient - Postgres client to use
     * @param {string} channel - the id of the channel to unsubscribe from
     * @param {string} tag - the tag of the outfit to unsubscribe from
     * @param {string} environment - the platform of the outfit 
     * @returns a message of the outcome of the unsubscription
     * @throws if `tag` contains invalid characters or if the outfit is not subscribed to
     */
    unsubscribeActivity: async function(pgClient, channel, tag, environment){
        if(badQuery(tag)){
			throw "Outfit search contains disallowed characters";
		}
        let outfit = await outfitInfo(tag, environment);
        let platform = environmentToPlatform[environment];
        let count = await pgClient.query('SELECT COUNT(channel) FROM outfitactivity WHERE id=$1 AND channel=$2 AND platform=$3;', [outfit.ID, channel, platform]);
        if(count.rows[0].count == 0){
            throw `Not subscribed to ${outfit.alias}`;
        }
        pgClient.query('DELETE FROM outfitactivity WHERE channel=$1 AND id=$2 AND platform=$3;', [channel, outfit.ID, platform]);
        return `Unsubscribed from ${outfit.alias} activity`;
    },

    /**
     * Subscribe to alerts on a server
     * @param {pg.Client} pgClient - Postgres client to use
     * @param {string} channel - the id of the channel to send messages to
     * @param {string} server - the server of the alerts to get
     * @returns a message of the outcome of the subscription
     * @throws if already subscribed to the `server` alert
     */
    subscribeAlert: async function(pgClient, channel, server){
        let count = await pgClient.query("SELECT count(*) FROM alerts WHERE channel=$1 AND world=$2;", [channel, server]);
        if(count.rows[0].count == 0){
            pgClient.query("INSERT INTO alerts (channel, world) VALUES ($1, $2);", [channel, server]);

            try{
                await config.initializeConfig(channel, pgClient);
                return `Subscribed to ${standardizeName(server)} alerts`;
            }
            catch(err){
                return `Subscribed to ${standardizeName(server)} alerts.  Configuration step failed, using default config.`;
            }
        }
        
        throw `Already subscribed to ${standardizeName(server)} alerts`;
    },

    /**
     * Unsubscribe from alerts on a Server
     * @param {pg.Client} pgClient - Postgres client to use 
     * @param {string} channel - the id of the channel to unsubscribe from
     * @param {string} server - the server of the alerts to unsubscribe from
     * @returns the message of the outcome of the unsubscription
     * @throws if not subscribed to the `server` alert
     */
    unsubscribeAlert: async function(pgClient, channel, server){
        let count = await pgClient.query("SELECT COUNT(*) FROM alerts WHERE channel = $1 AND world=$2", [channel, server]);
        if(count.rows[0].count == 0){
            throw `Not subscribed to ${standardizeName(server)} alerts`;
        }

        pgClient.query("DELETE FROM alerts WHERE channel=$1 AND world=$2", [channel, server]);

        return `Unsubscribed from ${standardizeName(server)} alerts`;
    },

    /**
     * Get updates on when an outfit captures a base
     * @param {pg.Client} pgClient - Postgres client to use
     * @param {string} channel - the id of the channel to send messages to
     * @param {string} tag - the tag of the outfit
     * @param {string} environment - the platform of the outfit 
     * @returns the message of the outcome of the subscription
     * @throws if `tag` contains invalid characters or if the outfit is already subscribed to
     */
    subscribeCaptures: async function(pgClient, channel, tag, environment){
        if(badQuery(tag)){
			throw "Outfit search contains disallowed characters";
		}
        let outfit = await outfitInfo(tag, environment);
        let platform = environmentToPlatform[environment];
        let count = await pgClient.query('SELECT COUNT(channel) FROM outfitcaptures WHERE id=$1 AND channel=$2 AND platform=$3;', [outfit.ID, channel, platform]);
        if (count.rows[0].count > 0){
            throw `Already subscribed to ${outfit.alias} base captures`;
        }
        await pgClient.query("INSERT INTO outfitcaptures (id, alias, channel, name, platform) VALUES ($1, $2, $3, $4, $5)", [outfit.ID, outfit.alias, channel, outfit.name, platform]);
        try{
            await config.initializeConfig(channel, pgClient)
            return `Subscribed to ${outfit.alias} base captures`;
        }
        catch(err){
            return `Subscribed to ${outfit.alias} base captures.  Configuration step failed, using default config.`;
        }
    },

    /**
     * Unsubscribe from updates on when an outfit captures a base
     * @param {pg.Client} pgClient - Postgres client to use
     * @param {string} channel - the id of the channel to unsubscribe from
     * @param {string} tag - the tag of the outfit
     * @param {string} environment - the platform of the outfit 
     * @returns the message of the outcome of the unsubscription
     * @throws if `tag` contains invalid characters or if the outfit is not subscribed to
     */
    unsubscribeCaptures: async function(pgClient, channel, tag, environment){
        if(badQuery(tag)){
			throw "Outfit search contains disallowed characters";
		}
        let outfit = await outfitInfo(tag, environment);
        let platform = environmentToPlatform[environment];
        let count = await pgClient.query('SELECT COUNT(channel) FROM outfitcaptures WHERE id=$1 AND channel=$2 AND platform=$3;', [outfit.ID, channel, platform]);
        if(count.rows[0].count == 0){
            throw `Not subscribed to ${outfit.alias} captures`;
        }
        pgClient.query('DELETE FROM outfitcaptures WHERE channel=$1 AND id=$2 AND platform=$3;', [channel, outfit.ID, platform]);
        return `Unsubscribed from ${outfit.alias} captures`;
    },

    /**
     * Subscribes to updates when a tracked twitter user posts a tweet
     * @param {pg.Client} pgClient - Postgres client to use 
     * @param {string} channelId - the id of the channel to send messages to
     * @param {string} user - the twitter user to subscribe to
     * @returns the message of the outcome of the subscription
     * @throws if `user` contains invalid characters or if there is a query error or already subscribed to the twitter user
     */
    subscribeTwitter: async function(pgClient, channelId, user){
        if(badQuery(user)){
			throw "User contains disallowed characters";
		}
        let source = twitterUsers(user);
        if(!source){
            throw "User not found";
        }
        let count = await pgClient.query('SELECT COUNT(channel) FROM news WHERE source=$1 AND channel=$2', [source, channelId]);
        if(count.rows[0].count == 0){
            try{
                pgClient.query("INSERT INTO news (channel, source) VALUES ($1, $2);", [channelId, source]);
            }
            catch(error){
                console.log(error);
                throw error;
            }
            try{
                await config.initializeConfig(channelId, pgClient);
                return `Subscribed to ${user} Twitter`;
            }
            catch(err){
                return `Subscribed to ${user} Twitter.  Configuration step failed, using default config.`;
            }
        }

        throw "Already subscribed to "+user+" Twitter";
    },

    /**
     * Unsubscribe from updates when a tracked twitter user posts a tweet
     * @param {pg.Client} pgClient - Postgres client to use
     * @param {string} channelId - the id of the channel to unsubscribe from
     * @param {string} user - the twitter user to unsubscribe from
     * @returns the message of the outcome of the unsubscription
     * @throws if `user` contains invalid characters or if the twitter user is not subscribed to
     */
    unsubscribeTwitter: async function(pgClient, channelId, user){
        if(badQuery(user)){
			throw "User contains disallowed characters";
		}
        let source = twitterUsers(user);
        if(!source){
            throw "User not found";
        }
        let count = await pgClient.query('SELECT COUNT(channel) FROM news WHERE source=$1 AND channel=$2;', [source, channelId]);
        if(count.rows[0].count > 0){
            try{
                pgClient.query("DELETE FROM news WHERE channel= $1 AND source = $2;", [channelId, source]);
            }
            catch(error){
                console.log(error);
                throw error;
            }
            return `Unsubscribed from ${user} Twitter`;
        }

        throw `Not subscribed to ${user} Twitter`;
    },

    /**
     * Subscribes to updates when a continent is unlocked on a server
     * @param {pg.Client} pgClient - Postgres client to use
     * @param {string} channel - the id of the channel to send messages to
     * @param {string} server - the server to subscribe to
     * @returns the message of the outcome of the subscription
     * @throws if already subscribed to `server`
     */
    subscribeUnlocks: async function(pgClient, channel, server){
        let count = await pgClient.query("SELECT count(*) FROM unlocks WHERE channel=$1 AND world=$2;", [channel, server]);
        if(count.rows[0].count == 0){
            pgClient.query("INSERT INTO unlocks (channel, world) VALUES ($1, $2);", [channel, server]);
            try{
                await config.initializeConfig(channel, pgClient)
                return `Subscribed to ${standardizeName(server)} unlocks.  Configure which continents are shown using /config continents`;
            }
            catch(err){
                return `Subscribed to ${standardizeName(server)} unlocks.  Configuration step failed, using default config.`;
            }
        }
        
        throw `Already subscribed to ${standardizeName(server)} unlocks`;
    },

    /**
     * Unsubscribe from updates when a continent is unlocked on a server
     * @param {pg.Client} pgClient - Postgres client to use
     * @param {string} channel - the id of the channel to unsubscribe from
     * @param {string} server - the server to unsubscribe from
     * @returns the outcome of the unsubscription
     * @throws if not subscribed to `server`
     */
    unsubscribeUnlocks: async function(pgClient, channel, server){
        let count = await pgClient.query("SELECT COUNT(*) FROM unlocks WHERE channel = $1 AND world=$2", [channel, server]);
        if(count.rows[0].count == 0){
            throw `Not subscribed to ${standardizeName(server)} unlocks`;
        }

        pgClient.query("DELETE FROM unlocks WHERE channel=$1 AND world=$2", [channel, server]);

        return `Unsubscribed from ${standardizeName(server)} unlocks`;
    },

    /**
     * Unsubscribe from all subscriptions
     * @param {pg.Client} pgClient - Postgres client to use
     * @param {string} channelId - the id of the channel to unsubscribe from
     * @returns a message of the outcome of the unsubscription
     */
    unsubscribeAll: async function(pgClient, channelId){
        const commands = [
            "DELETE FROM alerts WHERE channel = $1",
            "DELETE FROM outfitactivity WHERE channel = $1",
            "DELETE FROM outfitcaptures WHERE channel = $1",
            "DELETE FROM news WHERE channel = $1",
            "DELETE FROM subscriptionConfig WHERE channel = $1",
            "DELETE FROM unlocks WHERE channel = $1"
        ];

        for(const command of commands){
            pgClient.query(command, [channelId])
                .catch(err => console.log(err));
        }

        return "Unsubscribed channel from all lists";
    },

    /**
     * Ensure that the channel has the correct permissions to allow the bot to send messages
     * @param interaction - the interaction to check
     * @param {discord.User} user - the user to check
     * @param {string} locale - the locale of the channel 
     */
    permissionCheck: async function(interaction, user, locale="en-US"){
        if(interaction.channel.type == 'DM'){
            return;
        }
        let channel = interaction.channel;
        if(channel.isThread()){
            channel = interaction.channel.parent;
        }
        if(!await channel.permissionsFor(user).has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])){
            await interaction.followUp({
                content: i18n.__({phrase: "insufficientPermissions", locale: locale})
            });
        }
    }
}