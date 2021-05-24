// This file defines several functions used in subscribing or unsubscribing to server alerts and outfit activity

const got = require('got');
const messageHandler = require('./messageHandler.js');
const servers = ['connery', 'miller', 'cobalt', 'emerald', 'soltech', 'genudine', 'ceres', 'jaegar']

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
        case "jaegar":
            return "Jaegar";
        case "soltech":
            return "SolTech";
        case "genudine":
            return "Genudine";
        case "ceres":
            return "Ceres";
    }
}

const outfitInfo = async function(tag, environment){
    let uri = 'http://census.daybreakgames.com/s:'+process.env.serviceID+'/get/'+environment+'/outfit?alias_lower='+tag.toLowerCase()+'&c:join=character^on:leader_character_id^to:character_id';
    let response = await got(uri).json();
    if(response.error != undefined){
        if(response.error == "service_unavailable"){
            throw "Census API currently unavailable";
        }
        throw response.error;
    }
    if(response.statusCode == 404){
        throw "API Unreachable";
    }
    if(typeof(response.outfit_list[0]) != undefined && response.outfit_list[0]){
        let data = response.outfit_list[0];
        let resObj = {
            ID: data.outfit_id,
            faction: data.leader_character_id_join_character.faction_id,
            alias: data.alias,
            name: data.name
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
        if(messageHandler.badQuery(tag)){
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
        return `Subscribed to ${outfit.alias}`;
    },

    unsubscribeActivity: async function(pgClient, channel, tag, environment){
        if(messageHandler.badQuery(tag)){
			throw "Outfit search contains disallowed characters";
		}
        let outfit = await outfitInfo(tag, environment);
        let platform = environmentToPlatform[environment];
        let count = await pgClient.query('SELECT COUNT(channel) FROM outfitactivity WHERE id=$1 AND channel=$2 AND platform=$3;', [outfit.ID, channel, platform]);
        if(count.rows[0].count == 0){
            throw `Not subscribed to ${outfit.alias}`;
        }
        pgClient.query('DELETE FROM outfitactivity WHERE channel=$1 AND id=$2 AND platform=$3;', [channel, outfit.ID, platform]);
        return `Unsubscribed from ${outfit.alias}`;
    },

    subscribeAlert: async function(pgClient, channel, server){
        if(messageHandler.badQuery(server)){
			throw "Server search contains disallowed characters";
		}
        if(!servers.includes(server)){
            throw `${server} not recognized`;
        }
        let count = await pgClient.query("SELECT count(*) FROM alerts WHERE channel=$1 AND world=$2;", [channel, server]);
        if(count.rows[0].count == 0){
            pgClient.query("INSERT INTO alerts (channel, world) VALUES ($1, $2);", [channel, server]);

            return `Subscribed to ${standardizeName(server)} alerts`;
        }
        
        throw `Already subscribed to ${standardizeName(server)} alerts`;
    },

    unsubscribeAlert: async function(pgClient, channel, server){
        if(messageHandler.badQuery(server)){
			throw "Server search contains disallowed characters";
		}
        if(!servers.includes(server)){
            throw `${server} not recognized`;
        }
        let count = await pgClient.query("SELECT COUNT(*) FROM alerts WHERE channel = $1 AND world=$2", [channel, server]);
        if(count.rows[0].count == 0){
            throw `Not subscribed to ${standardizeName(server)} alerts`;
        }

        pgClient.query("DELETE FROM alerts WHERE channel=$1 AND world=$2", [channel, server]);

        return `Unsubscribed from ${standardizeName(server)} alerts`;
    },

    subscribeCaptures: async function(pgClient, channel, tag, environment){
        if(messageHandler.badQuery(tag)){
			throw "Outfit search contains disallowed characters";
		}
        let outfit = await outfitInfo(tag, environment);
        let platform = environmentToPlatform[environment];
        let count = await pgClient.query('SELECT COUNT(channel) FROM outfitcaptures WHERE id=$1 AND channel=$2 AND platform=$3;', [outfit.ID, channel, platform]);
        if (count.rows[0].count > 0){
            throw `Already subscribed to ${outfit.alias} base captures`;
        }
        await pgClient.query("INSERT INTO outfitcaptures (id, alias, channel, name, platform) VALUES ($1, $2, $3, $4, $5)", [outfit.ID, outfit.alias, channel, outfit.name, platform]);
        return `Subscribed to ${outfit.alias} base captures`;
    },

    unsubscribeCaptures: async function(pgClient, channel, tag, environment){
        if(messageHandler.badQuery(tag)){
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
        if(messageHandler.badQuery(user)){
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
            return `Subscribed to ${user} Twitter`;
        }

        throw "Already subscribed to "+user+" Twitter";
    },

    unsubscribeTwitter: async function(pgClient, channelId, user){
        if(messageHandler.badQuery(user)){
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

    unsubscribeAll: async function(pgClient, channelId){
        const commands = [
            "DELETE FROM alerts WHERE channel = $1",
            "DELETE FROM outfitactivity WHERE channel = $1",
            "DELETE FROM outfitcaptures WHERE channel = $1",
            "DELETE FROM news WHERE channel = $1",
        ]

        for(const command of commands){
            pgClient.query(command, [channelId])
                .catch(err => console.log(err))
        }

        return "Unsubscribed channel from all lists";
    }
}