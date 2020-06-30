// This file implements functions which parse messages from the Stream API and send messages to the appropriate channels based on subscription status.
// Login and logout events are also tracked for use in population queries

var got = require('got');
const Discord = require('discord.js');
const { Client } = require('pg');
var messageHandler = require('./messageHandler.js');
var territory = require('./territory.js');

recordLogin = async function(payload, faction, pgClient){
    pgClient.query("INSERT INTO population (id, world, faction, continent) \
    VALUES ($1, $2, $3, $4)", [payload.character_id, payload.world_id, faction, null])
        .catch(error => {
            if(typeof(error) == "string"){
                console.log(error);
            }
        });
}

recordLogout = async function(payload, pgClient){
    pgClient.query("DELETE FROM population WHERE id = $1", [payload.character_id])
        .catch(error => {
            if(typeof(error) == "string"){
                console.log(error);
            }
        });
}

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
    if(payload.event_name == "PlayerLogin"){
        recordLogin(payload, response.character_list[0].faction_id, pgClient);
    }
    else{
        recordLogout(payload, pgClient);
    }
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
                    messageHandler.send(resChann, sendEmbed, "Log event");
                }
                //in case channel is deleted or otherwise inaccessible
                else{
                    removeQueryText = "DELETE FROM "+table+" WHERE id=$1 AND channel=$2;";
                    pgClient.query(removeQueryText, [char.outfit_member.outfit_id, row.channel], (err, res) => {
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

alertInfo = async function(payload, environment){
    let url = 'https://census.daybreakgames.com/s:'+process.env.serviceID+'/get/'+environment+'/metagame_event/'+payload.metagame_event_id;
    let response = await got(url).json();
    if(response.returned == 0 || typeof(response.metagame_event_list) === 'undefined' || typeof(response.metagame_event_list[0]) == 'undefined'){
        var alerts = require('./alerts.json');
        if(typeof(alerts[payload.metagame_event_id]) === 'undefined'){
            console.log("Unable to find alert info for id "+payload.metagame_event_id);
            return new Promise(function(resolve, reject){
                reject("Alert notification error");
            })
        }
        let resObj = {
            name: alerts[payload.metagame_event_id].name,
            description: alerts[payload.metagame_event_id].description
        }
        return new Promise(function(resolve, reject){
            resolve(resObj);
        })
    }
    if(response.error != undefined){
        return new Promise(function(resolve, reject){
            reject(response.error);
        })
    }
    let resObj = {
        name: response.metagame_event_list[0].name.en,
        description: response.metagame_event_list[0].description.en
    }
    return new Promise(function(resolve, reject){
        resolve(resObj);
    })
}

alertEvent = async function(payload, environment, pgClient, discordClient){
    if(payload.metagame_event_state_name == "started"){
        let server = serverIdToName(payload.world_id);
        let queryText = "SELECT * FROM "+server;
        let removeQueryText = "DELETE FROM "+server+" WHERE channel=$1";
        let response = await alertInfo(payload, environment);
        if(typeof(response.name) != undefined && response.name){
            let sendEmbed = new Discord.RichEmbed();
            sendEmbed.setTitle(response.name);
            sendEmbed.setDescription(response.description);
            sendEmbed.setTimestamp();
            if (response.name.includes('Enlightenment')){
                sendEmbed.setColor('PURPLE');
            }
            else if (response.name.includes('Liberation')){
                sendEmbed.setColor('BLUE');
            }
            else if (response.name.includes('Superiority')){
                sendEmbed.setColor('RED');
            }
            sendEmbed.addField('Server', server, true);
            let terObj = "";
            try{
                terObj = await territory.territoryInfo(server);
            }
            catch{
                
            }
            let continent = ""
            let showTerritory = false
            if(response.name.toLowerCase().indexOf("indar") > -1){
                continent = "Indar";
                showTerritory = true;
            }
            else if(response.name.toLowerCase().indexOf("esamir") > -1){
                continent = "Esamir";
                showTerritory = true;
            }
            else if(response.name.toLowerCase().indexOf("amerish") > -1){
                continent = "Amerish";
                showTerritory = true;
            }
            else if(response.name.toLowerCase().indexOf("hossin") > -1){
                continent = "Hossin";
                showTerritory = true;
            }
            else if(response.name.toLowerCase().indexOf("koltyr") > -1){
                continent = "Koltyr";
                showTerritory = true;
            }
            if(showTerritory && terObj != "" && continent != "Koltyr"){
                let Total = terObj[continent].vs + terObj[continent].nc + terObj[continent].tr;
                let vsPc = (terObj[continent].vs/Total)*100;
                vsPc = Number.parseFloat(vsPc).toPrecision(3);
                let ncPc = (terObj[continent].nc/Total)*100;
                ncPc = Number.parseFloat(ncPc).toPrecision(3);
                let trPc = (terObj[continent].tr/Total)*100;
                trPc = Number.parseFloat(trPc).toPrecision(3);
                sendEmbed.addField('Territory % (Bases owned)', 'VS: '+vsPc+'% ('+terObj[continent].vs+') | NC: '+ncPc+'% ('+terObj[continent].nc+') | TR: '+trPc+'% ('+terObj[continent].tr+')');
            }
            else if(showTerritory){
                let vsPc = Number.parseFloat(payload.faction_vs).toPrecision(3);
                let ncPc = Number.parseFloat(payload.faction_nc).toPrecision(3);
                let trPc = Number.parseFloat(payload.faction_tr).toPrecision(3);
                sendEmbed.addField('Territory %', 'VS: '+vsPc+"% | "+'NC: '+ncPc+"% | "+'TR: '+trPc+"%")
            }
            let rows = await pgClient.query(queryText);
            for (let row of rows.rows){
                resChann = discordClient.channels.get(row.channel);
                if(resChann != undefined){
                    messageHandler.send(resChann, sendEmbed, "Alert notification");
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

var objectEquality = function(a, b){
    if(typeof(a.character_id) !== 'undefined' && typeof(b.character_id) !== 'undefined'){
        return a.character_id == b.character_id && a.event_name == b.event_name;
    }
    else if(typeof(a.event_name) !== 'undefined' && typeof(b.event_name) !== 'undefined'){
        return a.metagame_event_id == b.metagame_event_id && a.world_id == b.world_id;
    }
    return false
}

queue = ["","","","",""]
module.exports = {
    router: async function(payload, environment, pgClient, discordClient){
        for(let message of queue){
            if(objectEquality(message, payload)){
                return;
            }
        }
        queue.push(payload);
        queue.shift();

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