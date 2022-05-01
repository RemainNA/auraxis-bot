// This file defines several functions used in subscribing or unsubscribing to server alerts and outfit activity

const config = require('./subscriptionConfig.js');
const { servers, censusRequest, badQuery } = require('./utils.js')

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

const outfitInfo = async function(tag, platform){
    const response = await censusRequest(platform, 'outfit_list', `/outfit?alias_lower=${tag.toLowerCase()}&c:join=character^on:leader_character_id^to:character_id`);
    if(typeof(response[0]) != undefined && response[0]){
        let resObj = {
            ID: response[0].outfit_id,
            faction: response[0].leader_character_id_join_character.faction_id,
            alias: response[0].alias,
            name: response[0].name
        }
        return resObj;
    }

    throw `${tag} not found`;
}

const twitterUsers = function(user){
    switch(user.toLowerCase()){
        case "remainna":
            return "Remain_NA-twitter"
        case "wrel":
            return "WrelPlays-twitter"
        case "planetside":
            return "planetside2-twitter"
        default:
            return false
    }
}

const environmentToPlatform = {
    "ps2:v2": "pc",
    "ps2ps4us:v2": "ps4us",
    "ps2ps4eu:v2": "ps4eu"
}

module.exports = {
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
        if(outfit.faction == "1"){
            color = 'PURPLE';
        }
        else if(outfit.faction == "2"){
            color = 'BLUE';
        }
        else if(outfit.faction == "3"){
            color = 'RED';
        }
        else{
            color = 'GREY';
        }
        pgClient.query("INSERT INTO outfitactivity (id, alias, color, channel, platform) VALUES ($1, $2, $3, $4, $5)", [outfit.ID, outfit.alias, color, channel, platform]);
        try{
            await config.initializeConfig(channel, pgClient)
            return `Subscribed to ${outfit.alias} activity`;
        }
        catch(err){
            return `Subscribed to ${outfit.alias} activity.  Configuration step failed, using default config.`;
        }
    },

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

    subscribeAlert: async function(pgClient, channel, server){
        let count = await pgClient.query("SELECT count(*) FROM alerts WHERE channel=$1 AND world=$2;", [channel, server]);
        if(count.rows[0].count == 0){
            pgClient.query("INSERT INTO alerts (channel, world) VALUES ($1, $2);", [channel, server]);

            try{
                await config.initializeConfig(channel, pgClient)
                return `Subscribed to ${standardizeName(server)} alerts`;
            }
            catch(err){
                return `Subscribed to ${standardizeName(server)} alerts.  Configuration step failed, using default config.`;
            }
        }
        
        throw `Already subscribed to ${standardizeName(server)} alerts`;
    },

    unsubscribeAlert: async function(pgClient, channel, server){
        let count = await pgClient.query("SELECT COUNT(*) FROM alerts WHERE channel = $1 AND world=$2", [channel, server]);
        if(count.rows[0].count == 0){
            throw `Not subscribed to ${standardizeName(server)} alerts`;
        }

        pgClient.query("DELETE FROM alerts WHERE channel=$1 AND world=$2", [channel, server]);

        return `Unsubscribed from ${standardizeName(server)} alerts`;
    },

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
                await config.initializeConfig(channelId, pgClient)
                return `Subscribed to ${user} Twitter`;
            }
            catch(err){
                return `Subscribed to ${user} Twitter.  Configuration step failed, using default config.`;
            }
        }

        throw "Already subscribed to "+user+" Twitter";
    },

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

    unsubscribeUnlocks: async function(pgClient, channel, server){
        let count = await pgClient.query("SELECT COUNT(*) FROM unlocks WHERE channel = $1 AND world=$2", [channel, server]);
        if(count.rows[0].count == 0){
            throw `Not subscribed to ${standardizeName(server)} unlocks`;
        }

        pgClient.query("DELETE FROM unlocks WHERE channel=$1 AND world=$2", [channel, server]);

        return `Unsubscribed from ${standardizeName(server)} unlocks`;
    },

    unsubscribeAll: async function(pgClient, channelId){
        const commands = [
            "DELETE FROM alerts WHERE channel = $1",
            "DELETE FROM outfitactivity WHERE channel = $1",
            "DELETE FROM outfitcaptures WHERE channel = $1",
            "DELETE FROM news WHERE channel = $1",
            "DELETE FROM subscriptionConfig WHERE channel = $1",
            "DELETE FROM unlocks WHERE channel = $1"
        ]

        for(const command of commands){
            pgClient.query(command, [channelId])
                .catch(err => console.log(err))
        }

        return "Unsubscribed channel from all lists";
    }
}