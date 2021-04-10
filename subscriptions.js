// This file defines several functions used in subscribing or unsubscribing to server alerts and outfit activity

const got = require('got');
const messageHandler = require('./messageHandler.js');

const isValid = function(server){
    servers = ['connery', 'miller', 'cobalt', 'emerald', 'soltech', 'genudine', 'ceres', 'jaegar']
    if(servers.indexOf(server.toLowerCase()) > -1){
        return true;
    }
    return false;
}

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
        if(environment == "ps2:v2"){
            let count = await pgClient.query('SELECT COUNT(channel) FROM outfit WHERE id=$1 AND channel=$2', [outfit.ID, channel]);
            if (count.rows[0].count == 0){
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
                try{
                    pgClient.query("INSERT INTO outfit (id, alias, color, channel) VALUES ($1, $2, $3, $4)", [outfit.ID, outfit.alias, color, channel]);
                }
                catch(error){
                    console.log(error);
                    throw error;
                }
                return `Subscribed to ${outfit.alias}`;
            }

            throw `Already subscribed to ${outfit.alias}`;
        }
        if(environment == "ps2ps4us:v2"){
            let count = await pgClient.query('SELECT COUNT(channel) FROM ps4usoutfit WHERE id=$1 AND channel=$2', [outfit.ID, channel]);
            if (count.rows[0].count == 0){
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
                try{
                    pgClient.query("INSERT INTO ps4usoutfit (id, alias, color, channel) VALUES ($1, $2, $3, $4)", [outfit.ID, outfit.alias, color, channel]);
                }
                catch(error){
                    console.log(error);
                    throw error;
                }
                return `Subscribed to ${outfit.alias}`;
            }

            throw `Already subscribed to ${outfit.alias}`;
        }
        if(environment == "ps2ps4eu:v2"){
            let count = await pgClient.query('SELECT COUNT(channel) FROM ps4euoutfit WHERE id=$1 AND channel=$2', [outfit.ID, channel]);
            if (count.rows[0].count == 0){
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
                try{
                    pgClient.query("INSERT INTO ps4euoutfit (id, alias, color, channel) VALUES ($1, $2, $3, $4)", [outfit.ID, outfit.alias, color, channel]);
                }
                catch(error){
                    console.log(error);
                    throw error;
                }
                return `Subscribed to ${outfit.alias}`;
            }

            throw `Already subscribed to ${outfit.alias}`;
        }
    },

    unsubscribeActivity: async function(pgClient, channel, tag, environment){
        if(messageHandler.badQuery(tag)){
			throw "Outfit search contains disallowed characters";
		}
        let outfit = await outfitInfo(tag, environment);
        if(environment == "ps2:v2"){
            let count = await pgClient.query('SELECT COUNT(channel) FROM outfit WHERE id=$1 AND channel=$2', [outfit.ID, channel]);
            if(count.rows[0].count == 0){
                throw `Not subscribed to ${outfit.alias}`;
            }

            pgClient.query('DELETE FROM outfit WHERE channel=$1 AND id=$2', [channel, outfit.ID]);

            return `Unsubscribed from ${outfit.alias}`;
        }
        if(environment == "ps2ps4us:v2"){
            let count = await pgClient.query('SELECT COUNT(channel) FROM ps4usoutfit WHERE id=$1 AND channel=$2', [outfit.ID, channel]);
            if(count.rows[0].count == 0){
                throw `Not subscribed to ${outfit.alias}`;
            }

            pgClient.query('DELETE FROM ps4usoutfit WHERE channel=$1 AND id=$2', [channel, outfit.ID]);

            return `Unsubscribed from ${outfit.alias}`;
        }
        if(environment == "ps2ps4eu:v2"){
            let count = await pgClient.query('SELECT COUNT(channel) FROM ps4euoutfit WHERE id=$1 AND channel=$2', [outfit.ID, channel]);
            if(count.rows[0].count == 0){
                throw `Not subscribed to ${outfit.alias}`;
            }

            pgClient.query('DELETE FROM ps4euoutfit WHERE channel=$1 AND id=$2', [channel, outfit.ID]);

            return `Unsubscribed from ${outfit.alias}`;
        }
    },

    subscribeAlert: async function(pgClient, channel, server){
        if(messageHandler.badQuery(server)){
			throw "Server search contains disallowed characters";
		}
        if(isValid(server) == false){
            throw `${server} not recognized`;
        }
        let countQuery = "SELECT count(*) FROM "+server+" WHERE channel=$1"; //Only uses string concatenation after input validation
        let insertQuery = "INSERT INTO "+server+" VALUES ($1)";
        let count = await pgClient.query(countQuery, [channel]);
        if(count.rows[0].count == 0){
            pgClient.query(insertQuery, [channel]);

            return `Subscribed to ${standardizeName(server)} alerts`;
        }

        throw `Already subscribed to ${standardizeName(server)} alerts`;
    },

    unsubscribeAlert: async function(pgClient, channel, server){
        if(messageHandler.badQuery(server)){
			throw "Server search contains disallowed characters";
		}
        if(isValid(server) == false){
            throw `${server} not recognized`;
        }
        let countQuery = "SELECT count(*) FROM "+server+" WHERE channel=$1"; //Only uses string concatenation after input validation
        let deleteQuery = "DELETE FROM "+server+" WHERE channel=$1";
        let count = await pgClient.query(countQuery, [channel]);
        if(count.rows[0].count == 0){
            throw `Not subscribed to ${standardizeName(server)} alerts`;
        }

        pgClient.query(deleteQuery, [channel]);

        return `Unsubscribed from ${standardizeName(server)} alerts`;
    },

    subscribeCaptures: async function(pgClient, channel, tag, environment){
        if(messageHandler.badQuery(tag)){
			throw "Outfit search contains disallowed characters";
		}
        let outfit = await outfitInfo(tag, environment);
        if(environment == "ps2:v2"){
            let count = await pgClient.query('SELECT COUNT(channel) FROM outfitcaptures WHERE id=$1 AND channel=$2', [outfit.ID, channel]);
            if (count.rows[0].count == 0){
                try{
                    await pgClient.query("INSERT INTO outfitcaptures (id, alias, channel, name) VALUES ($1, $2, $3, $4)", [outfit.ID, outfit.alias, channel, outfit.name]);
                    return `Subscribed to ${outfit.alias} base captures`;
                }
                catch(error){
                    console.log(error);
                    throw error;
                }
            }
            else{
                throw "Already subscribed to "+outfit.alias+" base captures";
            }
        }
        else if(environment == "ps2ps4us:v2"){
            let count = await pgClient.query('SELECT COUNT(channel) FROM ps4usoutfitcaptures WHERE id=$1 AND channel=$2', [outfit.ID, channel]);
            if (count.rows[0].count == 0){
                try{
                    await pgClient.query("INSERT INTO ps4usoutfitcaptures (id, alias, channel, name) VALUES ($1, $2, $3, $4)", [outfit.ID, outfit.alias, channel, outfit.name]);
                    return `Subscribed to ${outfit.alias} base captures`;
                }
                catch(error){
                    console.log(error);
                    throw error;
                }
            }
            else{
                throw `Already subscribed to ${outfit.alias} base captures`;
            }
        }
        else if(environment == "ps2ps4eu:v2"){
            let count = await pgClient.query('SELECT COUNT(channel) FROM ps4euoutfitcaptures WHERE id=$1 AND channel=$2', [outfit.ID, channel]);
            if (count.rows[0].count == 0){
                try{
                    await pgClient.query("INSERT INTO ps4euoutfitcaptures (id, alias, channel, name) VALUES ($1, $2, $3, $4)", [outfit.ID, outfit.alias, channel, outfit.name]);
                    return `Subscribed to ${outfit.alias} base captures`;
                }
                catch(error){
                    console.log(error);
                    throw error;
                }
            }
            else{
                throw `Already subscribed to ${outfit.alias} base captures`;
            }
        }
    },

    unsubscribeCaptures: async function(pgClient, channel, tag, environment){
        if(messageHandler.badQuery(tag)){
			throw "Outfit search contains disallowed characters";
		}
        let outfit = await outfitInfo(tag, environment);
        if(environment == "ps2:v2"){
            let count = await pgClient.query('SELECT COUNT(channel) FROM outfitcaptures WHERE id=$1 AND channel=$2', [outfit.ID, channel]);
            if(count.rows[0].count == 0){
                throw `Not subscribed to ${outfit.alias} captures`;
            }
            else{
                pgClient.query('DELETE FROM outfitcaptures WHERE channel=$1 AND id=$2', [channel, outfit.ID]);
                return `Unsubscribed from ${outfit.alias} captures`;
            }
        }
        if(environment == "ps2ps4us:v2"){
            let count = await pgClient.query('SELECT COUNT(channel) FROM ps4usoutfitcaptures WHERE id=$1 AND channel=$2', [outfit.ID, channel]);
            if(count.rows[0].count == 0){
                throw `Not subscribed to ${outfit.alias} captures`;
            }
            else{
                pgClient.query('DELETE FROM ps4usoutfitcaptures WHERE channel=$1 AND id=$2', [channel, outfit.ID]);
                return `Unsubscribed from ${outfit.alias} captures`;
            }
        }
        if(environment == "ps2ps4eu:v2"){
            let count = await pgClient.query('SELECT COUNT(channel) FROM ps4euoutfitcaptures WHERE id=$1 AND channel=$2', [outfit.ID, channel]);
            if(count.rows[0].count == 0){
                throw `Not subscribed to ${outfit.alias} captures`;
            }
            else{
                pgClient.query('DELETE FROM ps4euoutfitcaptures WHERE channel=$1 AND id=$2', [channel, outfit.ID]);
                return `Unsubscribed from ${outfit.alias} captures`;
            }
        }
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
            "DELETE FROM connery WHERE channel = $1",
            "DELETE FROM miller WHERE channel = $1",
            "DELETE FROM cobalt WHERE channel = $1",
            "DELETE FROM emerald WHERE channel = $1",
            "DELETE FROM soltech WHERE channel = $1",
            "DELETE FROM genudine WHERE channel = $1",
            "DELETE FROM jaegar WHERE channel = $1",
            "DELETE FROM ceres WHERE channel = $1",
            "DELETE FROM outfit WHERE channel = $1",
            "DELETE FROM ps4usoutfit WHERE channel = $1",
            "DELETE FROM ps4euoutfit WHERE channel = $1",
            "DELETE FROM outfitcaptures WHERE channel = $1",
            "DELETE FROM ps4usoutfitcaptures WHERE channel = $1",
            "DELETE FROM ps4euoutfitcaptures WHERE channel = $1",
            "DELETE FROM news WHERE channel = $1",
        ]

        for(const command of commands){
            pgClient.query(command, [channelId])
                .catch(err => console.log(err))
        }

        return "Unsubscribed channel from all lists";
    }
}