/**
 * This file implements functions which parse messages from the Stream API and send messages to the appropriate channels based on subscription status.
 * @module unifiedWSHandler
 * @typedef {import('pg').Client} pg.Client
 * @typedef {import('discord.js').Client} discord.Client
 */

import {EmbedBuilder, PermissionsBitField} from 'discord.js';
import { send } from './messageHandler.js';
import { unsubscribeAll } from './subscriptions.js';
import { initializeConfig } from './commands/config.js';
import { territoryInfo } from './commands/territory.js';
import alerts from './static/alerts.json' assert {type: 'json'};
import bases from './static/bases.json' assert {type: 'json'};
import {serverNames, censusRequest, faction} from './utils.js';

/**
 * @example
 * "ps2:v2": "pc" 
 * "ps2ps4us:v2": "ps4us"
 * "ps2ps4eu:v2": "ps4eu"
 */
const environmentToPlatform = {
    "ps2:v2": "pc",
    "ps2ps4us:v2": "ps4us",
    "ps2ps4eu:v2": "ps4eu"
}

/**
 * Tracks player login and logout events
 * @param payload - The payload from the Stream API
 * @param {string} environment - which enviorment to query for
 * @param {pg.Client} pgClient - postgres client to use
 * @param {discord.Client} discordClient - discord client to use
 * @throws if there are error in logEvent
 */
async function logEvent(payload, environment, pgClient, discordClient){
    let response = await censusRequest(environment, 'character_list', `/character/${payload.character_id}?c:resolve=outfit_member`);
    let platform = environmentToPlatform[environment];
    let playerEvent = payload.event_name.substring(6);
    if(response[0].outfit_member != null){
        let char = response[0];
        let result = {};
        try{
            result = await pgClient.query("SELECT a.id, a.color, a.alias, a.channel, a.platform, c.autoDelete\
            FROM outfitActivity a LEFT JOIN subscriptionConfig c ON a.channel = c.channel\
            WHERE a.id = $1 AND a.platform = $2;", [char.outfit_member.outfit_id, platform]);
        }
        catch(error){
            throw `Error in logEvent: ${error}`;
        }
        if (result.rows.length > 0){
            let sendEmbed = new EmbedBuilder();
            sendEmbed.setTitle(result.rows[0].alias+' '+playerEvent);
            sendEmbed.setDescription(char.name.first);
            sendEmbed.setColor(faction(char.faction_id).color);
            for (let row of result.rows){
                discordClient.channels.fetch(row.channel)
                    .then(resChann => {
                        if(typeof(resChann.guild) !== 'undefined'){
                            if(resChann.permissionsFor(resChann.guild.members.me).has([PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.EmbedLinks])){
                                send(resChann, {embeds: [sendEmbed]}, "Log event")
                                .then(messageId => {
                                    if(messageId != -1 && row.autodelete == true){
                                        const in5minutes = new Date((new Date()).getTime() + 300000);
                                        pgClient.query("INSERT INTO toDelete (channel, messageID, timeToDelete) VALUES ($1, $2, $3)", [row.channel, messageId, in5minutes])
                                            .catch(err => {console.log(err);});
                                    }
                                });
                                
                            }
                            else{
                                unsubscribeAll(pgClient, row.channel);
                                console.log('Unsubscribed from '+row.channel);
                            } 
                        }
                        else{ // DM
                            send(resChann, {embeds: [sendEmbed]}, "Log event")
                            .then(messageId => {
                                if(messageId != -1 && row.autodelete === true){
                                    const in5minutes = new Date((new Date()).getTime() + 30000);
                                    pgClient.query("INSERT INTO toDelete (channel, messageID, timeToDelete) VALUES ($1, $2, $3)", [row.channel, messageId, in5minutes])
                                        .catch(err => {console.log(err);});
                                }
                                else if(messageId == -1){
                                    unsubscribeAll(pgClient, row.channel);
                                    console.log('Unsubscribed from '+row.channel);
                                }
                            })
                        }                        
                    })
                    .catch(error => {
                        if(typeof(error.code) !== 'undefined'){
                            if(error.code == 10003){ //Unknown channel error, thrown when the channel is deleted
                                unsubscribeAll(pgClient, row.channel);
                                console.log('Unsubscribed from '+row.channel);
                            }
                        }
                        else{
                            console.log(error);
                        }
                    });
            }
        }
    }
}

/**
 * Get the name and description of the alert from payload and environment
 * @param payload - The payload from the Stream API
 * @param {string} environment - which enviorment to query for
 * @returns {Promise<{name: string, description: string}>} - The name and description of the alert
 * @throws if there are error retrieving alert notfications
 */
async function alertInfo(payload, environment){
    if(typeof(alerts[payload.metagame_event_id]) !== 'undefined'){
        let resObj = {
            name: alerts[payload.metagame_event_id].name,
            description: alerts[payload.metagame_event_id].description
        };
        return resObj;
    }
    let response = await censusRequest(environment, "metagame_event_list", `/metagame_event/${payload.metagame_event_id}`);
    if(response.length == 0 || typeof(response) === 'undefined' || typeof(response[0]) == 'undefined'){
        console.log("Unable to find alert info for id "+payload.metagame_event_id);
        throw "Alert notification error";
    }
    return  {
        name: response[0].name.en,
        description: response[0].description.en
    };
}

/**
 * alerts for each continent
 */
const trackedAlerts = [
    147,
    148,
    149,
    150,
    151,
    152,
    153,
    154,
    155,
    156,
    157,
    158,
    176,
    177,
    178,
    179,
    186,
    187,
    188,
    189,
    190,
    191,
    192,
    193,
    211,
    212,
    213,
    214,
    222,
    223,
    224,
    226
];

/**
 * Sends an alert embed to all channels that are subscribed to `/alerts`
 * @param payload - The payload from the Stream API
 * @param {string} environment - which enviorment to query for
 * @param {pg.Client} pgClient - postgres client to use
 * @param {discord.Client} discordClient - discord client to use
 */
async function alertEvent(payload, environment, pgClient, discordClient){
    if(payload.metagame_event_state_name == "started"){
        let server = serverNames[payload.world_id];
        let response = await alertInfo(payload, environment);
        if(typeof(response.name) != undefined && response.name){
            let sendEmbed = new EmbedBuilder();
            sendEmbed.setTitle(response.name);
            if(trackedAlerts.indexOf(Number(payload.metagame_event_id)) == -1){
                sendEmbed.setDescription(response.description);
            }
            else{
                sendEmbed.setDescription('['+response.description+'](https://ps2alerts.com/alert/'+payload.world_id+'-'+payload.instance_id+"?utm_source=auraxis-bot&utm_medium=discord&utm_campaign=partners)");
            }
            sendEmbed.setTimestamp();
            if (response.name.includes('Enlightenment')){
                sendEmbed.setColor('Purple');
            }
            else if (response.name.includes('Liberation')){
                sendEmbed.setColor('Blue');
            }
            else if (response.name.includes('Superiority')){
                sendEmbed.setColor('Red');
            }
            sendEmbed.addFields({name: 'Server', value: server, inline: true});
            sendEmbed.addFields({name: 'Status', value: `Started <t:${Math.floor(Date.now()/1000)}:R>`, inline: true});
            let terObj = undefined;
            try{
                terObj = await territoryInfo(payload.world_id);
            }
            catch{
                
            }
            let continent = "Other";
            let showTerritory = false;
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
            else if(response.name.toLowerCase().indexOf("oshur") > -1){
                continent = "Oshur";
                showTerritory = true;
            }
            else if(response.name.toLowerCase().indexOf("koltyr") > -1){
                continent = "Koltyr";
                showTerritory = true;
            }
            if(response.name.toLowerCase().indexOf("anomalies") > -1){
                showTerritory = false;
            }
            if(showTerritory && terObj != undefined && continent != "Koltyr"){
                let Total = terObj[continent].vs + terObj[continent].nc + terObj[continent].tr;
                let vsPc = ((terObj[continent].vs/Total)*100).toPrecision(3);
                let ncPc = ((terObj[continent].nc/Total)*100).toPrecision(3);
                let trPc = ((terObj[continent].tr/Total)*100).toPrecision(3);
                sendEmbed.addFields({name: 'Territory Control', value: `\
                \n<:VS:818766983918518272> **VS**: ${terObj[continent].vs}  |  ${vsPc}%\
                \n<:NC:818767043138027580> **NC**: ${terObj[continent].nc}  |  ${ncPc}%\
                \n<:TR:818988588049629256> **TR**: ${terObj[continent].tr}  |  ${trPc}%`});
            }
            else if(showTerritory){
                let vsPc = Number.parseFloat(payload.faction_vs).toPrecision(3);
                let ncPc = Number.parseFloat(payload.faction_nc).toPrecision(3);
                let trPc = Number.parseFloat(payload.faction_tr).toPrecision(3);
                sendEmbed.addFields({name: 'Territory Control', value: `\
                \n<:VS:818766983918518272> **VS**: ${vsPc}%\
                \n<:NC:818767043138027580> **NC**: ${ncPc}%\
                \n<:TR:818988588049629256> **TR**: ${trPc}%`});
            }
            const  rows = await pgClient.query("SELECT a.channel, c.Koltyr, c.Indar, c.Hossin, c.Amerish, c.Esamir, c.Oshur, c.Other, c.autoDelete, c.territory, c.nonTerritory\
            FROM alerts a LEFT JOIN subscriptionConfig c on a.channel = c.channel\
            WHERE a.world = $1;", [server.toLowerCase()]);
            for (let row of rows.rows){
                if(row[continent.toLowerCase()] == null){
                    // If config is not successfully set then display alert and attempt to initialize config
                    initializeConfig(row.channel, pgClient);
                }
                else if(!row[continent.toLowerCase()] || (showTerritory && !row['territory']) || (!showTerritory && !row['nonterritory'])){
                    // Skip alerts configured to not show
                    continue;
                }
                discordClient.channels.fetch(row.channel)
                    .then(resChann => {
                        if(typeof(resChann.guild) !== 'undefined'){
                            if(resChann.permissionsFor(resChann.guild.members.me).has([PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.EmbedLinks])){
                                send(resChann, {embeds: [sendEmbed]}, "Alert notification")
                                .then(messageId => {
                                    if(messageId != -1 && trackedAlerts.indexOf(Number(payload.metagame_event_id)) > -1){
                                        pgClient.query("INSERT INTO alertMaintenance (alertID, messageID, channelID) VALUES ($1, $2, $3);", [`${payload.world_id}-${payload.instance_id}`, messageId, row.channel])
                                            .catch(err => {console.log(err);});
                                    }
                                    if(messageId != -1 && row.autodelete === true){
                                        const in50minutes = new Date((new Date()).getTime() + 3000000);
                                        const in95minutes = new Date((new Date()).getTime() + 5700000);
                                        if(['Indar', 'Hossin', 'Esamir', 'Amerish', 'Oshur'].includes(continent) && response.name.indexOf("Unstable Meltdown") == -1){
                                            pgClient.query("INSERT INTO toDelete (channel, messageID, timeToDelete) VALUES ($1, $2, $3)", [row.channel, messageId, in95minutes])
                                            .catch(err => {console.log(err);});
                                        }
                                        else{
                                            pgClient.query("INSERT INTO toDelete (channel, messageID, timeToDelete) VALUES ($1, $2, $3)", [row.channel, messageId, in50minutes])
                                            .catch(err => {console.log(err);});
                                        }    
                                    }
                                });
                            }
                            else{
                                unsubscribeAll(pgClient, row.channel);
                                console.log('Unsubscribed from '+row.channel);
                            } 
                        }
                        else{ // DM
                            send(resChann, {embeds: [sendEmbed]}, "Alert notification")
                            .then(messageId => {
                                if(messageId != -1 && trackedAlerts.indexOf(Number(payload.metagame_event_id)) > -1){
                                    pgClient.query("INSERT INTO alertMaintenance (alertID, messageID, channelID) VALUES ($1, $2, $3);", [`${payload.world_id}-${payload.instance_id}`, messageId, row.channel])
                                        .catch(err => {console.log(err);})
                                }
                                if(messageId != -1 && row.autodelete === true){
                                    const in50minutes = new Date((new Date()).getTime() + 3000000);
                                    const in95minutes = new Date((new Date()).getTime() + 5700000);
                                    if(['Indar', 'Hossin', 'Esamir', 'Amerish', 'Oshur'].includes(continent) && response.name.indexOf("Unstable Meltdown") == -1){
                                        pgClient.query("INSERT INTO toDelete (channel, messageID, timeToDelete) VALUES ($1, $2, $3)", [row.channel, messageId, in95minutes])
                                        .catch(err => {console.log(err);});
                                    }
                                    else{
                                        pgClient.query("INSERT INTO toDelete (channel, messageID, timeToDelete) VALUES ($1, $2, $3)", [row.channel, messageId, in50minutes])
                                        .catch(err => {console.log(err);});
                                    }    
                                }
                                else if(messageId == -1){
                                    unsubscribeAll(pgClient, row.channel);
                                    console.log('Unsubscribed from '+row.channel);
                                }
                            });
                        } 
                    })
                    .catch(error => {
                        if(typeof(error.code) !== 'undefined'){
                            if(error.code == 10003){ //Unknown channel error, thrown when the channel is deleted
                                unsubscribeAll(pgClient, row.channel);
                                console.log('Unsubscribed from '+row.channel);
                            }
                        }
                        else{
                            console.log(error);
                        }
                    });
            }
        }
    }
}

/**
 * "outpost type": "resource generated (resource emoji)"
 */
const outfitResources = {
    "Small Outpost": "5 Auraxium <:Auraxium:818766792376713249>",
    "Large Outpost": "25 Auraxium <:Auraxium:818766792376713249>",
    "Construction Outpost": "3 Synthium <:Synthium:818766858865475584>",
    "Bio Lab": "8 Synthium <:Synthium:818766858865475584>",
    "Amp Station": "8 Synthium <:Synthium:818766858865475584>",
    "Tech Plant": "8 Synthium <:Synthium:818766858865475584>",
    "Containment Site": "8 Synthium <:Synthium:818766858865475584>",
    "Interlink": "8 Synthium <:Synthium:818766858865475584>",
    "Trident": "1 Polystellarite <:Polystellarite:818766888238448661>",
    "Central base": "2 Polystellarite <:Polystellarite:818766888238448661>"
};

/**
 * the base id for the central base on each continent
 */
const centralBases = [
    '6200', // The Crown
    '222280', // The Ascent
    '254000', // Eisa
    '298000' // Nason's Defiance
];

/**
 * Send base event notification to all subscribed channels whenever a tracked outfit captures a base
 * @param payload - the payload from the event
 * @param {string} environment - the environment the outfit is in
 * @param {pg.Client} pgClient - postgres client to use
 * @param {discord.Client} discordClient - discord client to use
 * @returns 
 */
async function baseEvent(payload, environment, pgClient, discordClient){
    if(payload.new_faction_id == payload.old_faction_id){
        return; //Ignore defended bases
    }
    let platform = environmentToPlatform[environment];
    if(payload.zone_id == '2' || payload.zone_id == '4' || payload.zone_id == '6' || payload.zone_id == '8' || payload.zone_id == '344'){ //Don't track bases outside the main continents 
        await pgClient.query("INSERT INTO bases VALUES ($1, $2, $3, $4, $5, $6)\
        ON CONFLICT(concatKey) DO UPDATE SET outfit = $5, faction = $6;",
        [`${payload.world_id}-${payload.facility_id}`, payload.zone_id, payload.world_id, payload.facility_id, payload.outfit_id, payload.new_faction_id]);
    }
    //check if outfit is in db, construct and send info w/ facility id
    let result = await pgClient.query("SELECT * FROM outfitcaptures WHERE id=$1 AND platform = $2;", [payload.outfit_id, platform]);
    if(result.rowCount > 0){
        let sendEmbed = new EmbedBuilder();
        let base = await baseInfo(payload.facility_id, environment);
        sendEmbed.setTitle("["+result.rows[0].alias+"] "+result.rows[0].name+' captured '+base.name);
        sendEmbed.setTimestamp();
        sendEmbed.setColor(faction(payload.new_faction_id).color) //Color cannot be dependent on outfit due to NSO outfits
        if(payload.zone_id == "2"){
            sendEmbed.addFields({name: "Continent", value: "Indar", inline: true});
        }
        else if(payload.zone_id == "4"){
            sendEmbed.addFields({name: "Continent", value: "Hossin", inline: true});
        }
        else if(payload.zone_id == "6"){
            sendEmbed.addFields({name: "Continent", value: "Amerish", inline: true});
        }
        else if(payload.zone_id == "8"){
            sendEmbed.addFields({name: "Continent", value: "Esamir", inline: true});
        }
        else if(payload.zone_id == "344"){
            sendEmbed.addFields({name: "Continent", value: "Oshur", inline: true});
        }
        if(centralBases.includes(payload.facility_id)){
            sendEmbed.addFields({name: "Facility Type", value: base.type+"\n(Central base)", inline: true});
            sendEmbed.addFields({name: "Outfit Resources", value: "2 Polystellarite <:Polystellarite:818766888238448661>", inline: true});
        }
        else if(base.type in outfitResources){
            sendEmbed.addFields({name: "Facility Type", value: base.type, inline: true});
            sendEmbed.addFields({name: "Outfit Resources", value: outfitResources[base.type], inline: true});
        }
        else{
            sendEmbed.addFields({name: "Facility Type", value: base.type, inline: true});
            sendEmbed.addFields({name: "Outfit Resources", value: "Unknown", inline: true});
        }

        const factionInfo = faction(payload.old_faction_id);
        sendEmbed.addFields({name: "Captured From", value: `${factionInfo.decal} ${factionInfo.initial}`, inline: true});
        
        const contributions = await captureContributions(payload.outfit_id, payload.facility_id, payload.timestamp, environment);
        if(contributions.length > 0){
            sendEmbed.addFields({name: "<:Merit:890295314337136690> Contributors", value: `${contributions}`.replace(/,/g, ', '), inline: true});
        }
        for (let row of result.rows){
            discordClient.channels.fetch(row.channel).then(resChann => {
                if(typeof(resChann.guild) !== 'undefined'){
                    if(resChann.permissionsFor(resChann.guild.members.me).has([PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.EmbedLinks])){
                        send(resChann, {embeds: [sendEmbed]}, "Base capture event");
                    }
                    else{
                        unsubscribeAll(pgClient, row.channel);
                        console.log('Unsubscribed from '+row.channel);
                    }
                }
                else{ // DM
                    send(resChann, {embeds: [sendEmbed]}, "Base capture event");
                }
            }).catch(error => {
                if(typeof(error.code) !== 'undefined'){
                    if(error.code == 10003){ //Unknown channel error, thrown when the channel is deleted
                        unsubscribeAll(pgClient, row.channel);
                        console.log('Unsubscribed from '+row.channel);
                    }
                }
                else{
                    console.log(error);
                }
            });
        }
    }
}

/**
 * Get the players who contributed to the capture of a base
 * @param {string} outfitID - the outfit id of the outfit that capture the base
 * @param {string} baseID - the base id of the base that was captured
 * @param {string} timestamp - the timestamp of the capture
 * @param {string} platform - the platform the outfit is on
 * @returns an array of outfit members that contributed to the capture
 */
async function captureContributions(outfitID, baseID, timestamp, platform){
    try{
        const response = await censusRequest(platform, 'outfit_list', `/outfit/${outfitID}?c:resolve=member_online_status`);
        let contributions = [];
        let online = [];
        if(response[0]?.members[0].online_status == "service_unavailable"){
            return ["Unable to determine contributors"];
        }
        for(const member of response[0].members){
            if(member.online_status > 0){
                online.push(member.character_id);
            }
        }
        // Just waiting to make sure all values fill in in the characters_event collection
        await  new Promise(resolve => setTimeout(resolve, 2000));
        const onlineEvents = await Promise.allSettled(Array.from(online, x => 
            censusRequest(platform, 'characters_event_list', `characters_event?id=${x}&type=FACILITY_CHARACTER&c:resolve=character_name`)));
        for(const event of onlineEvents){
            if(event.status == "fulfilled" && event.value[0]?.facility_id == baseID && event.value[0].timestamp == timestamp){
                contributions.push(event.value[0]?.character.name.first);
            }
        }
        return contributions;
    }
    catch(err){
        console.log("Capture contributions error");
        console.log(err);
        return ["Error occurred when retrieving contributors"];
    }
}

/**
 * Checks for equality between object properties
 * @param a - first object
 * @param b - second object
 * @returns {boolean} true if the objects properties are equal, false otherwise
 */
function objectEquality(a, b){
    if(typeof(a.character_id) !== 'undefined' && typeof(b.character_id) !== 'undefined'){
        return a.character_id == b.character_id && a.event_name == b.event_name;
    }
    else if(typeof(a.metagame_event_id) !== 'undefined' && typeof(b.metagame_event_id) !== 'undefined'){
        return a.metagame_event_id == b.metagame_event_id && a.world_id == b.world_id;
    }
    else if(typeof(a.facility_id) !== 'undefined' && typeof(b.facility_id) !== 'undefined'){
        return a.facility_id == b.facility_id && a.world_id == b.world_id && a.duration_held == b.duration_held;
    }
    return false;
}

/**
 * Get basic information on a facility
 * @param {string} facilityID - the facility id to get information of
 * @param {string} environment - environment to check in
 * @returns {Promise<{continent: string, name: string, type: string}>} - the continent, name, and type of the facility
 * @throws if the facility is not found or there are errors when retrieving the information
 */
async function baseInfo(facilityID, environment){
    if(typeof(bases[facilityID]) !== 'undefined'){
        return bases[facilityID];
    }
    else{ //backup web request
        let response = await censusRequest(environment, "map_region_list", `/map_region?facility_id=${facilityID}`);
        if(response.length == "0"){
            throw `No result for FacilityID: ${facilityID}`;
        }
        if(typeof(response) === 'undefined' || typeof(response[0]) === 'undefined'){
            throw `API response improperly formatted, FacilityID: ${facilityID}`;
        }

        return {
            "continent": response[0].zone_id,
            "name": response[0].facility_name,
            "type": response[0].facility_type
        };
    }
    
}

/**
 * a queue of events to be processed
 */
const queue = ["","","","",""];
/**
 * Send an alert, base, login or logout event to all subscribed channels
 * @param payload - the payload of the event
 * @param {string} environment - the environment the event was sent from
 * @param {pg.Client} pgClient - the postgres client to use
 * @param {discord.Client} discordClient - the discord client to use
 */
export async function router(payload, environment, pgClient, discordClient){
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
                if(typeof(error) == "string" && error != "Census API currently unavailable" && error != "Census API unavailable: Redirect"){
                    console.log("Login error: "+error);
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