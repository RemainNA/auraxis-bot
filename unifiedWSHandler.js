var got = require('got');
const Discord = require('discord.js');
const { Client } = require('pg');

environmentToTable = function(environment){
    if(environment == "ps2:v2"){
        return "outfit";
    }
    else if(environment == "ps2ps4us:v2"){
        return "ps4usoutfit";
    }
    else if(environment == "ps2ps4eu:v2"){
        return "ps4euoutfit";
    }
}

logEvent = async function(payload, environment, pgClient, discordClient){
    let uri = 'https://census.daybreakgames.com/s:'+process.env.serviceID+'/get/'+environment+'/character/'+payload.character_id+'?c:resolve=outfit_member';
    let response = await got(uri).json();
    if(typeof(response.character_list) === 'undefined'){
        return new Promise(function(resolve, reject){
            reject(null);
        })
    }
    let table = environmentToTable(environment); //helper function used for scope management
    let playerEvent = payload.event_name.substring(6);
    if(response.character_list[0].outfit_member != null){
        let char = response.character_list[0];
        try{
            result = await pgClient.query("SELECT * FROM "+table+" WHERE id=$1;", [char.outfit_member.outfit_id]);
        }
        catch(error){
            return new Promise(function(resolve, reject){
                reject("1"+error);
            })
        }
        if (result.rows.length > 0){
            let sendEmbed = new Discord.RichEmbed();
            sendEmbed.setTitle(result.rows[0].alias+' '+playerEvent);
            sendEmbed.setDescription(char.name.first);
            if (char.faction_id == "1"){ //vs
                sendEmbed.setColor('PURPLE');
            }
            else if (char.faction_id == "2"){ //nc
                sendEmbed.setColor('BLUE');
            }
            else if (char.faction_id == "3"){ //tr
                sendEmbed.setColor('RED');
            }
            else{ //nso
                sendEmbed.setColor('GREY');
            }
            for (let row of result.rows){
                let resChann = discordClient.channels.get(row.channel);
                if(resChann != undefined){
                    resChann.send(sendEmbed).then(function(result){
                        
                    }, function(err){
                        console.log(err);
                    });
                }
                //in case channel is deleted or otherwise inaccessible
                else{
                    removeQueryText = "DELETE FROM "+table+" WHERE id=$1 AND channel=$2;";
                    SQLclient.query(removeQueryText, [char.outfit_member.outfit_id, row.channel], (err, res) => {
                        if (err){
                            console.log("2"+err);
                        } 
                    });
                }
            }
        }
    }
}

serverIdToName = function(server){
    switch(server.toLowerCase()){
        case "1":
            return "Connery";
        case "10":
            return "Miller";
        case "13":
            return "Cobalt";
        case "17":
            return "Emerald";
        case "19":
            return "Jaegar";
        case "40":
            return "SolTech";
        case "1000":
            return "Genudine";
        case "2000":
            return "Ceres";
    }
}

alertEvent = async function(payload, environment, pgClient, discordClient){
    if(payload.metagame_event_state_name == "started"){
        let url = 'https://census.daybreakgames.com/s:'+process.env.serviceID+'/get/'+environment+'/metagame_event/'+payload.metagame_event_id;
        let server = serverIdToName(payload.world_id);
        let queryText = "SELECT * FROM "+server;
        let removeQueryText = "DELETE FROM "+server+" WHERE channel=$1";
        let response = await got(url).json();
        if(response.error != undefined){
            return new Promise(function(resolve, reject){
                console.log("B");
                reject(response.error);
            })
        }
        if(typeof(response.metagame_event_list[0]) != undefined && response.metagame_event_list[0]){
            let event = response.metagame_event_list[0];
            let sendEmbed = new Discord.RichEmbed();
            sendEmbed.setTitle(event.name.en);
            sendEmbed.setDescription(event.description.en);
            sendEmbed.setTimestamp();
            if (event.name.en.includes('Enlightenment')){
                sendEmbed.setColor('PURPLE');
            }
            else if (event.name.en.includes('Liberation')){
                sendEmbed.setColor('BLUE');
            }
            else if (event.name.en.includes('Superiority')){
                sendEmbed.setColor('RED');
            }
            sendEmbed.addField('Server', server, true);
            let rows = await pgClient.query(queryText);
            for (let row of rows.rows){
                resChann = discordClient.channels.get(row.channel);
                if(resChann != undefined){
                    resChann.send(sendEmbed).then(function(result){
                        
                    }, function(err){
                        console.log(err);
                    });
                }
                else{
                    pgClient.query(removeQueryText, [row.channel], (err, res) => {
                        if(err){
                            console.log("3"+err);
                        }
                    });
                }
            }
        }
    }
}


module.exports = {
    router: async function(payload, environment, pgClient, discordClient){
        if(payload.character_id != null){
            logEvent(payload, environment, pgClient, discordClient)
                .catch(error => {
                    if(typeof(error) == "string"){
                        console.log(error);
                    }
                });
        }
        else if(payload.metagame_event_state_name != null){
            alertEvent(payload, environment, pgClient, discordClient)
                .catch(error => console.log(error));
        }
    }
}