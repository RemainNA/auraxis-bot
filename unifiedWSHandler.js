// This file implements functions which parse messages from the Stream API and send messages to the appropriate channels based on subscription status.

const {MessageEmbed, Permissions} = require('discord.js');
const messageHandler = require('./messageHandler.js');
const subscriptions = require('./subscriptions.js');
const config = require('./subscriptionConfig.js');
const territory = require('./territory.js');
const alerts = require('./static/alerts.json');
const bases = require('./static/bases.json');
const {serverNames, censusRequest} = require('./utils.js');

const wait = require('util').promisify(setTimeout);

const environmentToPlatform = {
    "ps2:v2": "pc",
    "ps2ps4us:v2": "ps4us",
    "ps2ps4eu:v2": "ps4eu"
}

const logEvent = async function(payload, environment, pgClient, discordClient){
    let response = await censusRequest(environment, 'character_list', `/character/${payload.character_id}?c:resolve=outfit_member`);
    let platform = environmentToPlatform[environment];
    let playerEvent = payload.event_name.substring(6);
    if(response[0].outfit_member != null){
        let char = response[0];
        let result = "";
        try{
            result = await pgClient.query("SELECT a.id, a.color, a.alias, a.channel, a.platform, c.autoDelete\
            FROM outfitActivity a LEFT JOIN subscriptionConfig c ON a.channel = c.channel\
            WHERE a.id = $1 AND a.platform = $2;", [char.outfit_member.outfit_id, platform]);
        }
        catch(error){
            throw `Error in logEvent: ${error}`;
        }
        if (result.rows.length > 0){
            let sendEmbed = new MessageEmbed();
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
                            if(resChann.permissionsFor(resChann.guild.me).has([Permissions.FLAGS.SEND_MESSAGES, Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.EMBED_LINKS])){
                                messageHandler.send(resChann, {embeds: [sendEmbed]}, "Log event")
                                .then(messageId => {
                                    if(messageId != -1 && row.autodelete == true){
                                        const in5minutes = new Date((new Date()).getTime() + 300000);
                                        pgClient.query("INSERT INTO toDelete (channel, messageID, timeToDelete) VALUES ($1, $2, $3)", [row.channel, messageId, in5minutes])
                                            .catch(err => {console.log(err);})
                                    }
                                })
                                
                            }
                            else{
                                subscriptions.unsubscribeAll(pgClient, row.channel);
                                console.log('Unsubscribed from '+row.channel);
                            } 
                        }
                        else{ // DM
                            messageHandler.send(resChann, {embeds: [sendEmbed]}, "Log event")
                            .then(messageId => {
                                if(messageId != -1 && row.autodelete === true){
                                    const in5minutes = new Date((new Date()).getTime() + 30000);
                                    pgClient.query("INSERT INTO toDelete (channel, messageID, timeToDelete) VALUES ($1, $2, $3)", [row.channel, messageId, in5minutes])
                                        .catch(err => {console.log(err);})
                                }
                                else if(messageId == -1){
                                    subscriptions.unsubscribeAll(pgClient, row.channel);
                                    console.log('Unsubscribed from '+row.channel);
                                }
                            })
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

const alertInfo = async function(payload, environment){
    if(typeof(alerts[payload.metagame_event_id]) !== 'undefined'){
        let resObj = {
            name: alerts[payload.metagame_event_id].name,
            description: alerts[payload.metagame_event_id].description
        }
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
    }
}

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
];

const alertEvent = async function(payload, environment, pgClient, discordClient){
    if(payload.metagame_event_state_name == "started"){
        let server = serverNames[payload.world_id];
        let response = await alertInfo(payload, environment);
        if(typeof(response.name) != undefined && response.name){
            let sendEmbed = new MessageEmbed();
            sendEmbed.setTitle(response.name);
            if(trackedAlerts.indexOf(Number(payload.metagame_event_id)) == -1){
                sendEmbed.setDescription(response.description);
            }
            else{
                sendEmbed.setDescription('['+response.description+'](https://ps2alerts.com/alert/'+payload.world_id+'-'+payload.instance_id+"?utm_source=auraxis-bot&utm_medium=discord&utm_campaign=partners)");
            }
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
            sendEmbed.addField('Status', `Started <t:${Math.floor(Date.now()/1000)}:R>`, true);
            let terObj = "";
            try{
                terObj = await territory.territoryInfo(payload.world_id);
            }
            catch{
                
            }
            let continent = "Other"
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
            else if(response.name.toLowerCase().indexOf("oshur") > -1){
                continent = "Oshur";
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
                sendEmbed.addField('Territory Control', `\
                \n<:VS:818766983918518272> **VS**: ${terObj[continent].vs}  |  ${vsPc}%\
                \n<:NC:818767043138027580> **NC**: ${terObj[continent].nc}  |  ${ncPc}%\
                \n<:TR:818988588049629256> **TR**: ${terObj[continent].tr}  |  ${trPc}%`)
            }
            else if(showTerritory){
                let vsPc = Number.parseFloat(payload.faction_vs).toPrecision(3);
                let ncPc = Number.parseFloat(payload.faction_nc).toPrecision(3);
                let trPc = Number.parseFloat(payload.faction_tr).toPrecision(3);
                sendEmbed.addField('Territory Control', `\
                \n<:VS:818766983918518272> **VS**: ${vsPc}%\
                \n<:NC:818767043138027580> **NC**: ${ncPc}%\
                \n<:TR:818988588049629256> **TR**: ${trPc}%`)
            }
            let rows = await pgClient.query("SELECT a.channel, c.Koltyr, c.Indar, c.Hossin, c.Amerish, c.Esamir, c.Oshur, c.Other, c.autoDelete\
            FROM alerts a LEFT JOIN subscriptionConfig c on a.channel = c.channel\
            WHERE a.world = $1;", [server.toLowerCase()]);
            for (let row of rows.rows){
                if(row[continent.toLowerCase()] == null){
                    config.initializeConfig(row.channel, pgClient);
                }
                else if(row[continent.toLowerCase()] == false){
                    continue;
                }
                discordClient.channels.fetch(row.channel)
                    .then(resChann => {
                        if(typeof(resChann.guild) !== 'undefined'){
                            if(resChann.permissionsFor(resChann.guild.me).has([Permissions.FLAGS.SEND_MESSAGES, Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.EMBED_LINKS])){
                                messageHandler.send(resChann, {embeds: [sendEmbed]}, "Alert notification")
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
                                            .catch(err => {console.log(err);})
                                        }
                                        else{
                                            pgClient.query("INSERT INTO toDelete (channel, messageID, timeToDelete) VALUES ($1, $2, $3)", [row.channel, messageId, in50minutes])
                                            .catch(err => {console.log(err);})
                                        }    
                                    }
                                })
                            }
                            else{
                                subscriptions.unsubscribeAll(pgClient, row.channel);
                                console.log('Unsubscribed from '+row.channel);
                            } 
                        }
                        else{ // DM
                            messageHandler.send(resChann, {embeds: [sendEmbed]}, "Alert notification")
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
                                        .catch(err => {console.log(err);})
                                    }
                                    else{
                                        pgClient.query("INSERT INTO toDelete (channel, messageID, timeToDelete) VALUES ($1, $2, $3)", [row.channel, messageId, in50minutes])
                                        .catch(err => {console.log(err);})
                                    }    
                                }
                                else if(messageId == -1){
                                    subscriptions.unsubscribeAll(pgClient, row.channel);
                                    console.log('Unsubscribed from '+row.channel);
                                }
                            })
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

const outfitResources = {
    "Small Outpost": "5 Auraxium <:Auraxium:818766792376713249>",
    "Large Outpost": "25 Auraxium <:Auraxium:818766792376713249>",
    "Construction Outpost": "3 Synthium <:Synthium:818766858865475584>",
    "Bio Lab": "8 Synthium <:Synthium:818766858865475584>",
    "Amp Station": "8 Synthium <:Synthium:818766858865475584>",
    "Tech Plant": "8 Synthium <:Synthium:818766858865475584>",
    "Containment Site": "8 Synthium <:Synthium:818766858865475584>",
    "Central base": "2 Polystellarite <:Polystellarite:818766888238448661>",
    "Interlink": "None",
    "Trident": "None"
}

const centralBases = [
    '6200', // The Crown
    '222280', // The Ascent
    '254000', // Eisa
    '298000' // Nason's Defiance
]

const baseEvent = async function(payload, environment, pgClient, discordClient){
    if(payload.new_faction_id == payload.old_faction_id){
        return; //Ignore defended bases
    }
    let platform = environmentToPlatform[environment];
    if(payload.zone_id == '2' || payload.zone_id == '4' || payload.zone_id == '6' || payload.zone_id == '8'){ //Don't track bases outside the main continents 
        await pgClient.query("INSERT INTO bases VALUES ($1, $2, $3, $4, $5, $6)\
        ON CONFLICT(concatKey) DO UPDATE SET outfit = $5, faction = $6;",
        [`${payload.world_id}-${payload.facility_id}`, payload.zone_id, payload.world_id, payload.facility_id, payload.outfit_id, payload.new_faction_id]);
    }
    //check if outfit is in db, construct and send info w/ facility id
    let result = await pgClient.query("SELECT * FROM outfitcaptures WHERE id=$1 AND platform = $2;", [payload.outfit_id, platform]);
    if(result.rowCount > 0){
        let sendEmbed = new MessageEmbed();
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
        else if(payload.zone_id == "344"){
            sendEmbed.addField("Continent", "Oshur", true);
        }
        if(centralBases.includes(payload.facility_id)){
            sendEmbed.addField("Facility Type", base.type+"\n(Central base)", true);
            sendEmbed.addField("Outfit Resources", "2 Polystellarite <:Polystellarite:818766888238448661>", true);
        }
        else if(base.type in outfitResources){
            sendEmbed.addField("Facility Type", base.type, true);
            sendEmbed.addField("Outfit Resources", outfitResources[base.type], true);
        }
        else{
            sendEmbed.addField("Facility Type", base.type, true);
            sendEmbed.addField("Outfit Resources", "Unknown", true);
        }
        if(payload.old_faction_id == "1"){
            sendEmbed.addField("Captured From", "<:VS:818766983918518272> VS", true);
        }
        else if(payload.old_faction_id == "2"){
            sendEmbed.addField("Captured From", "<:NC:818767043138027580> NC", true);
        }
        else if(payload.old_faction_id == "3"){
            sendEmbed.addField("Captured From", "<:TR:818988588049629256> TR", true);
        }
        const contributions = await captureContributions(payload.outfit_id, payload.facility_id, payload.timestamp, environment);
        if(contributions.length > 0){
            sendEmbed.addField("<:Merit:890295314337136690> Contributors", `${contributions}`.replace(/,/g, ', '), true);
        }
        for (let row of result.rows){
            discordClient.channels.fetch(row.channel).then(resChann => {
                if(typeof(resChann.guild) !== 'undefined'){
                    if(resChann.permissionsFor(resChann.guild.me).has([Permissions.FLAGS.SEND_MESSAGES, Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.EMBED_LINKS])){
                        messageHandler.send(resChann, {embeds: [sendEmbed]}, "Base capture event");
                    }
                    else{
                        subscriptions.unsubscribeAll(pgClient, row.channel);
                        console.log('Unsubscribed from '+row.channel);
                    }
                }
                else{ // DM
                    messageHandler.send(resChann, {embeds: [sendEmbed]}, "Base capture event");
                }
            }).catch(error => {
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

const captureContributions = async function(outfitID, baseID, timestamp, platform){
    try{
        const response = await censusRequest(platform, 'outfit_list', `/outfit/${outfitID}?c:resolve=member_online_status`);
        let contributions = []
        if(response[0]?.members[0].online_status == "service_unavailable"){
            return ["Unable to determine contributors"];
        }
        await wait(2000); // Just waiting to make sure all values fill in in the characters_event collection
        for(const member of response[0].members){
            if(member.online_status > 0){
                try{
                    const eventResponse = await censusRequest(platform, 'characters_event_list', `characters_event?id=${member.character_id}&type=FACILITY_CHARACTER&c:resolve=character_name`);
                    if(eventResponse[0].facility_id == baseID && eventResponse[0].timestamp == timestamp){
                        contributions.push(eventResponse[0].character.name.first);
                    }
                }
                catch(err){
                    continue;
                }
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

const objectEquality = function(a, b){
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

const baseInfo = async function(facilityID, environment){
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

const queue = ["","","","",""];
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
}