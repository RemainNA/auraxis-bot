// This file implements functions which parse messages from the Stream API and send messages to the appropriate channels based on subscription status.
// Login and logout events are also tracked for use in population queries

var got = require('got');
const Discord = require('discord.js');
const { Client } = require('pg');
var messageHandler = require('./messageHandler.js');
var subscriptions = require('./subscriptions.js');
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
    if(payload.event_name == "PlayerLogout"){
        recordLogout(payload, pgClient);
    }
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
            let sendEmbed = new Discord.MessageEmbed();
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
                discordClient.channels.fetch(row.channel)
                    .then(resChann => {
                        if(typeof(resChann.guild) !== 'undefined'){
                            if(resChann.permissionsFor(resChann.guild.me).has(['SEND_MESSAGES','VIEW_CHANNEL', 'EMBED_LINKS'])){
                                messageHandler.send(resChann, sendEmbed, "Log event");
                            }
                            else{
                                subscriptions.unsubscribeAll(pgClient, row.channel);
                                console.log('Unsubscribed from '+row.channel);
                            } 
                        }
                        else{ // DM
                            messageHandler.send(resChann, sendEmbed, "Log event");
                        }                        
                    })
                    .catch(error => {
                        if(typeof(error.code) !== 'undefined'){
                            if(error.code == 10003){ //Unknown channel error, thrown when the channel is deleted
                                subscriptions.unsubscribeAll(pgClient, row.channel);
                                console.log('Unsubscribed from '+row.channel);
                            }
                        }
                        else{
                            console.log(error);
                        }
                    })
            }
        }
    }
}

idToName = function(server){
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
        let server = idToName(payload.world_id);
        let queryText = "SELECT * FROM "+server;
        let removeQueryText = "DELETE FROM "+server+" WHERE channel=$1";
        let response = await alertInfo(payload, environment);
        if(typeof(response.name) != undefined && response.name){
            let sendEmbed = new Discord.MessageEmbed();
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
                discordClient.channels.fetch(row.channel)
                    .then(resChann => {
                        if(typeof(resChann.guild) !== 'undefined'){
                            if(resChann.permissionsFor(resChann.guild.me).has(['SEND_MESSAGES','VIEW_CHANNEL', 'EMBED_LINKS'])){
                                messageHandler.send(resChann, sendEmbed, "Alert notification");
                            }
                            else{
                                subscriptions.unsubscribeAll(pgClient, row.channel);
                                console.log('Unsubscribed from '+row.channel);
                            } 
                        }
                        else{ // DM
                            messageHandler.send(resChann, sendEmbed, "Alert notification");
                        } 
                    })
                    .catch(error => {
                        if(typeof(error.code) !== 'undefined'){
                            if(error.code == 10003){ //Unknown channel error, thrown when the channel is deleted
                                subscriptions.unsubscribeAll(pgClient, row.channel);
                                console.log('Unsubscribed from '+row.channel);
                            }
                        }
                        else{
                            console.log(error);
                        }
                    })
            }
        }
    }
}

baseEvent = async function(payload, environment, pgClient, discordClient){
    if(payload.new_faction_id == payload.old_faction_id){
        return; //Ignore defended bases
    }
    //check if outfit is in db, construct and send info w/ facility id
    let queryText = "SELECT * FROM outfitcaptures WHERE id=$1";
    if(environment == "ps2ps4us:v2"){
        queryText = "SELECT * FROM ps4usoutfitcaptures WHERE id=$1";
    }
    else if(environment == "ps2ps4eu:v2"){
        queryText = "SELECT * FROM ps4euoutfitcaptures WHERE id=$1";
    }
    let queryValues = [payload.outfit_id];
    try{
        let result = await pgClient.query(queryText, queryValues);
        if(result.rowCount > 0){
            let sendEmbed = new Discord.MessageEmbed();
            let base = await baseInfo(payload.facility_id, environment);
            sendEmbed.setTitle("["+result.rows[0].alias+"] "+result.rows[0].name+' captured '+base.name);
            sendEmbed.setTimestamp();
            if(payload.new_faction_id == "1"){ //Color cannot be dependent on outfit due to NSO outfits
                sendEmbed.setColor("PURPLE");
            }
            else if(payload.new_faction_id == "2"){
                sendEmbed.setColor("BLUE");
            }
            else if(payload.new_faction_id == "3"){
                sendEmbed.setColor("RED");
            }
            if(payload.zone_id == "2"){
                sendEmbed.addField("Continent", "Indar", true);
            }
            else if(payload.zone_id == "4"){
                sendEmbed.addField("Continent", "Hossin", true);
            }
            else if(payload.zone_id == "6"){
                sendEmbed.addField("Continent", "Amerish", true);
            }
            else if(payload.zone_id == "8"){
                sendEmbed.addField("Continent", "Esamir", true);
            }
            sendEmbed.addField("Facility Type", base.type, true);
            if(payload.old_faction_id == "1"){
                sendEmbed.addField("Captured From", "VS", true);
            }
            else if(payload.old_faction_id == "2"){
                sendEmbed.addField("Captured From", "NC", true);
            }
            else if(payload.old_faction_id == "3"){
                sendEmbed.addField("Captured From", "TR", true);
            }
            for (let row of result.rows){
                discordClient.channels.fetch(row.channel)
                .then(resChann => {
                    if(typeof(resChann.guild) !== 'undefined'){
                        if(resChann.permissionsFor(resChann.guild.me).has(['SEND_MESSAGES','VIEW_CHANNEL','EMBED_LINKS'])){
                            messageHandler.send(resChann, sendEmbed, "Base capture event");
                        }
                        else{
                            subscriptions.unsubscribeAll(pgClient, row.channel);
                            console.log('Unsubscribed from '+row.channel);
                        } 
                    }
                    else{ // DM
                        messageHandler.send(resChann, sendEmbed, "Base capture event");
                    }                        
                })
                .catch(error => {
                    if(typeof(error.code) !== 'undefined'){
                        if(error.code == 10003){ //Unknown channel error, thrown when the channel is deleted
                            subscriptions.unsubscribeAll(pgClient, row.channel);
                            console.log('Unsubscribed from '+row.channel);
                        }
                    }
                    else{
                        console.log(error);
                    }
                })
            }
        }
    }
    catch(error){
        return new Promise(function(resolve, reject){
            reject(error);
        })
    }
}

var objectEquality = function(a, b){
    if(typeof(a.character_id) !== 'undefined' && typeof(b.character_id) !== 'undefined'){
        return a.character_id == b.character_id && a.event_name == b.event_name;
    }
    else if(typeof(a.metagame_event_id) !== 'undefined' && typeof(b.metagame_event_id) !== 'undefined'){
        return a.metagame_event_id == b.metagame_event_id && a.world_id == b.world_id;
    }
    else if(typeof(a.facility_id) !== 'undefined' && typeof(b.facility_id) !== 'undefined'){
        return a.facility_id == b.facility_id && a.world_id == b.world_id && a.duration_held == b.duration_held;
    }
    return false
}

var ps4WebRequest = function(facilityID, environment){
    if(environment == 'ps2:v2'){
        return false; // No need for web requests on PC
    }
    var bases = require('./bases.json');
    if(typeof(bases[facilityID]) === 'undefined'){
        return true; // If the base cannot be found, make a request
    }
    if(bases[facilityID].continent == '8'){
        return true; //If it is a ps4 base on Esamir, check for correct info
    }
    return false; // Else stored info is ok
}

var baseInfo = async function(facilityID, environment){
    var bases = require('./bases.json');
    if(typeof(bases[facilityID]) !== 'undefined' && !ps4WebRequest(facilityID, environment)){
        return new Promise(function(resolve, reject){
            resolve(bases[facilityID]);
        })
    }
    else{ //backup web request
        let uri = 'http://census.daybreakgames.com/s:'+process.env.serviceID+'/get/'+environment+'/map_region?facility_id='+facilityID;
        let response = await got(uri).json();
        if(typeof(response.error) !== 'undefined'){
            return new Promise(function(resolve, reject){
                reject(response.error);
            })
        }
        if(response.statusCode == 404){
            return new Promise(function(resolve, reject){
                reject("API Unreachable");
            })
        }
        if(response.returned == "0"){
            return new Promise(function(resolve, reject){
                reject("No result for FacilityID: "+facilityID);
            })
        }
        if(typeof(response.map_region_list) === 'undefined' || typeof(response.map_region_list[0]) === 'undefined'){
            return new Promise(function(resolve, reject){
                reject("API response improperly formatted, FacilityID: "+facilityID);
            })
        }
        let resObj = {
            "continent": response.map_region_list[0].zone_id,
            "name": response.map_region_list[0].facility_name,
            "type": response.map_region_list[0].facility_type
        }
        return new Promise(function(resolve, reject){
            resolve(resObj);
        })
    }
    
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
        else if(payload.duration_held != null){
            baseEvent(payload, environment, pgClient, discordClient)
                .catch(error => console.log(error));
        }
    }
}