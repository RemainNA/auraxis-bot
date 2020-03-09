const { Client } = require('pg');
var got = require('got');

isValid = function(server){
    servers = ['connery', 'miller', 'cobalt', 'emerald', 'soltech', 'genudine', 'ceres', 'jaegar']
    if(servers.indexOf(server.lower) > -1){
        return true;
    }
    return false;
}

standardizeName = function(server){
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

outfitInfo = async function(tag, environment){
    let uri = 'http://census.daybreakgames.com/s:'+process.env.serviceID+'/get/'+environment+'/outfit?alias_lower='+tag.toLowerCase()+'&c:join=character^on:leader_character_id^to:character_id';
    let response = await got(uri).json();
    if(response.error != undefined){
        return new Promise(function(resolve, reject){
            reject(response.error);
        })
    }
    if(response.statusCode == 404){
        return new Promise(function(resolve, reject){
            reject("API Unreachable");
        })
    }
    if(typeof(response.outfit_list[0]) != undefined && response.outfit_list[0]){
        let data = response.outfit_list[0];
        let resObj = {
            ID: data.outfit_ID,
            faction: data.leader_character_id_join_character.faction_id,
            alias: data.alias
        }
        return new Promise(function(resolve, reject){
            resolve(resObj);
        })
    }
    else{
        return new Promise(function(resolve, reject){
            reject("Not found");
        })
    }
}



module.exports = {
    subscribeActivity: async function(pgClient, channel, tag, environment){
        //pgClient is the pgClient object from main
        //channel is the discord channel ID
        //tag is the outfit tag
        //environment is ps2:v2, ps2ps4us:v2, or ps2ps4eu:v2
        try{
            let outfit = await outfitInfo(tag, environment);
        }
        catch(error){
            return new Promise(function(resolve, reject){
                reject(error);
            })
        }
        if(environment == "ps2:v2"){
            let count = pgClient.query('SELECT COUNT(channel) FROM outfit WHERE id=$1 AND channel=$2', [outfit.ID, channel]);
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
                    return new Promise(function(resolve, reject){
                        reject(error);
                    })
                }
                return new Promise(function(resolve, reject){
                    resolve("Subscribed to "+outfit.alias);
                })
            }
            else{
                return new Promise(function(resolve, reject){
                    reject("Already subscribed to "+outfit.alias);
                })
            }
        }
        if(environment == "ps2ps4us:v2"){
            let count = pgClient.query('SELECT COUNT(channel) FROM ps4usoutfit WHERE id=$1 AND channel=$2', [outfit.ID, channel]);
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
                    return new Promise(function(resolve, reject){
                        reject(error);
                    })
                }
                return new Promise(function(resolve, reject){
                    resolve("Subscribed to "+outfit.alias);
                })
            }
            else{
                return new Promise(function(resolve, reject){
                    reject("Already subscribed to "+outfit.alias);
                })
            }
        }
        if(environment == "ps2ps4us:v2"){
            let count = pgClient.query('SELECT COUNT(channel) FROM ps4euoutfit WHERE id=$1 AND channel=$2', [outfit.ID, channel]);
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
                    return new Promise(function(resolve, reject){
                        reject(error);
                    })
                }
                return new Promise(function(resolve, reject){
                    resolve("Subscribed to "+outfit.alias);
                })
            }
            else{
                return new Promise(function(resolve, reject){
                    reject("Already subscribed to "+outfit.alias);
                })
            }
        }
    },

    unsubscribeActivity: async function(pgClient, channel, tag, environment){
        try{
            let outfit = await outfitInfo(tag, environment);
        }
        catch(error){
            return new Promise(function(resolve, reject){
                reject(error);
            })
        }
        if(environment == "ps2:v2"){
            try{
                let count = pgClient.query('SELECT COUNT(channel) FROM outfit WHERE id=$1 AND channel=$2', [outfit.ID, channel]);
            }
            catch(error){
                return new Promise(function(resolve, reject){ 
                    reject(error);
                })
            }
            if(count.rows[0].count == 0){
                return new Promise(function(resolve, reject){ 
                    reject("Not subscribed to "+outfit.alias);
                })
            }
            else{
                try{
                    pgClient.query('DELETE FROM outfit WHERE channel=$1 AND id=$2', [channel, outfit.ID]);
                }
                catch(error){
                    return new Promise(function(resolve, reject){ 
                        reject(error);
                    })
                }
                return new Promise(function(resolve, reject){ 
                    resolve("Unsubscribed from "+outfit.alias);
                })
            }
        }
        if(environment == "ps2ps4us:v2"){
            try{
                let count = pgClient.query('SELECT COUNT(channel) FROM ps4usoutfit WHERE id=$1 AND channel=$2', [outfit.ID, channel]);
            }
            catch(error){
                return new Promise(function(resolve, reject){ 
                    reject(error);
                })
            }
            if(count.rows[0].count == 0){
                return new Promise(function(resolve, reject){ 
                    reject("Not subscribed to "+outfit.alias);
                })
            }
            else{
                try{
                    pgClient.query('DELETE FROM ps4usoutfit WHERE channel=$1 AND id=$2', [channel, outfit.ID]);
                }
                catch(error){
                    return new Promise(function(resolve, reject){ 
                        reject(error);
                    })
                }
                return new Promise(function(resolve, reject){ 
                    resolve("Unsubscribed from "+outfit.alias);
                })
            }
        }
        if(environment == "ps2ps4eu:v2"){
            try{
                let count = pgClient.query('SELECT COUNT(channel) FROM ps4euoutfit WHERE id=$1 AND channel=$2', [outfit.ID, channel]);
            }
            catch(error){
                return new Promise(function(resolve, reject){ 
                    reject(error);
                })
            }
            if(count.rows[0].count == 0){
                return new Promise(function(resolve, reject){ 
                    reject("Not subscribed to "+outfit.alias);
                })
            }
            else{
                try{
                    pgClient.query('DELETE FROM ps4euoutfit WHERE channel=$1 AND id=$2', [channel, outfit.ID]);
                }
                catch(error){
                    return new Promise(function(resolve, reject){ 
                        reject(error);
                    })
                }
                return new Promise(function(resolve, reject){ 
                    resolve("Unsubscribed from "+outfit.alias);
                })
            }
        }
    },

    subscribeAlert: async function(pgClient, channel, server){
        if(isValid(server) == false){
            return new Promise(function(resolve, reject){ 
                reject(server+" not recognized");
            })
        }
        let countQuery = "SELECT count(*) FROM "+server+" WHERE channel=$1"; //Only uses string concatenation after input validation
        let insertQuery = "INSERT INTO "+server+" VALUES ($1)";
        // try{
        //     let count = await pgClient.query(countQuery, [channel]);
        // }
        // catch(error){
        //     return new Promise(function(resolve, reject){ 
        //         reject(error);
        //     })
        // }
        let count = await pgClient.query(countQuery, [channel]);
        if(count.rows[0].count == 0){
            try{
                pgClient.query(insertQuery, [channel]);
            }
            catch(error){
                return new Promise(function(resolve, reject){ 
                    reject(error);
                })
            }
            return new Promise(function(resolve, reject){ 
                resolve("Subscribed to "+standardizeName(server)+" alerts");
            })
        }
        else{
            return new Promise(function(resolve, reject){ 
                reject("Already subscribed to "+standardizeName(server)+" alerts");
            })
        }
    },

    unsubscribeAlert: async function(pgClient, channel, server){
        console.log(server);
        if(isValid(server) == false){
            return new Promise(function(resolve, reject){ 
                reject(server+" not recognized");
            })
        }
        let countQuery = "SELECT count(*) FROM "+server+" WHERE channel=$1"; //Only uses string concatenation after input validation
        let deleteQuery = "DELETE FROM "+server+" WHERE channel=$1";
        // try{
        //     let count = await pgClient.query(countQuery, [channel]);
        // }
        // catch(error){
        //     return new Promise(function(resolve, reject){ 
        //         reject(error);
        //     })
        // }
        let count = await pgClient.query(countQuery, [channel]);
        if(count.rows[0].count == 0){
            return new Promise(function(resolve, reject){ 
                reject("Not subscribed to "+standardizeName(server)+" alerts");
            })
        }
        else{
            try{
                pgClient.query(deleteQuery, [channel]);
            }
            catch(error){
                return new Promise(function(resolve, reject){ 
                    reject(error);
                })
            }
            return new Promise(function(resolve, reject){ 
                resolve("Unsubscribed from "+standardizeName(server)+" alerts");
            })
        }
    }
}