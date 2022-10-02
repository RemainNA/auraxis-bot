/**
 * This file defines functions used in finding and returning the current territory control on a given server, broken up by continent
 * @module territory
 * @typedef {import('pg').Client} pg.Client
 * @typedef {import('discord.js').ChatInputCommandInteraction} ChatInteraction
 */

import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import { serverNames, serverIDs, censusRequest, continents, localeNumber, faction, servers, allServers } from '../utils.js';
import ignoredRegions from '../static/ignoredRegions.json' assert {type: 'json'};
import i18n from 'i18n';

/**
 * Used to get the correct fisu world control URL
 * @param {number} serverID - the server to check
 * @returns a fisu url for the correct platform for territory control on the server
 */
function fisuTerritory(serverID){
    if (serverID < 1000){
        return `https://ps2.fisu.pw/control/?world=${serverID}`;
    }
    else if(serverID == 1000){
        return 'https://ps4us.ps2.fisu.pw/control/?world=1000';
    }
    else if(serverID == 2000){
        return 'https://ps4eu.ps2.fisu.pw/control/?world=2000';
    }
    return null;
}

/**
 * Get the benefit of a continent in the correct locale
 * @param {string} continent - the continent to check
 * @param {string} locale - the locale to use 
 * @returns A string of the  benefit of the continent
 */
export function continentBenefit(continent, locale="en-US"){
    switch (continent){
        case "Indar":
            return i18n.__({phrase: "Increases heat efficiency of base Phalanx turrets", locale: locale});
        case "Hossin":
            return i18n.__({phrase: "Vehicle/Aircraft repair at ammo resupply towers/pads", locale: locale});
        case "Amerish":
            return i18n.__({phrase: "Base generators auto-repair over time", locale: locale});
        case "Esamir":
            return i18n.__({phrase: "Allied control points increase shield capacity", locale: locale});
        case "Oshur":
            return i18n.__({phrase: "-20% Air Vehicle Nanite cost", locale: locale});
        default:
            return i18n.__({phrase: "No benefit", locale: locale});
    }
}

const warpgatePositions = {
    "2201": "⬆",
    "2202": "⬅",
    "2203": "➡",
    "4230": "⬅",
    "4240": "➡",
    "4250": "⬇",
    "6001": "⬅",
    "6002": "➡",
    "6003": "⬇",
    "18029": "⬆",
    "18030": "⬇",
    "18062": "➡",
    "18303": "↗",
    "18304": "↖",
    "18305": "⬇"
};

/**
 * Gets current continent info on a server
 * @param {number} serverID 
 * @returns an object containing the current continent info on the server
 * @throws if there are API errors
 */
export async function territoryInfo(serverID){
    let platform = 'ps2:v2';
    if(serverID == 1000){
        platform = 'ps2ps4us:v2';
    }
    else if(serverID == 2000){
        platform = 'ps2ps4eu:v2';
    }
    let response = await censusRequest(platform, 'map_list', `/map/?world_id=${serverID}&zone_ids=2,4,6,8,14,344`);
    if(response.length < 3){
        throw "API response missing continents";
    }
    if(typeof(response[0]) === 'undefined'){
        throw "API response improperly formatted";
    }
    if(typeof(response[0].Regions) === 'undefined'){
        throw "API response missing Regions field";
    }
    let IndarObj = {vs:0, nc:0, tr:0, locked:-1, unstable:false};
    let HossinObj = {vs:0, nc:0, tr:0, locked:-1, unstable:false};
    let AmerishObj = {vs:0, nc:0, tr:0, locked:-1, unstable:false};
    let EsamirObj = {vs:0, nc:0, tr:0, locked:-1, unstable:false};
    let OshurObj = {vs:0, nc:0, tr:0, locked:-1, unstable:false};
    let KoltyrObj = {vs:0, nc:0, tr:0, locked:-1, unstable:false};
    for(const res of response){
        let vs = 0;
        let nc = 0;
        let tr = 0;
        let unstable = false;
        let warpgates = {1:"", 2:"", 3:""}
        for(const row of res.Regions.Row){
            if(row.RowData.FactionId == "1"){
                vs += 1;
            }
            else if(row.RowData.FactionId == "2"){
                nc += 1;
            }
            else if(row.RowData.FactionId == "3"){
                tr += 1;
            }
            else if(!ignoredRegions.includes(row.RowData.RegionId)){
                // If faction is 0 and is not ignored mark continent as unstable
                // Some Oshur and Esamir regions have no associated facilities and as such are ignored
                unstable = true;
            }
            if(warpgatePositions[row.RowData.RegionId] != undefined){
                warpgates[row.RowData.FactionId] = warpgatePositions[row.RowData.RegionId];
            }
        }
        switch(res.ZoneId){
            case "2":
                IndarObj = {vs:vs, nc:nc, tr:tr, locked:-1, unstable: unstable, warpgates: warpgates};
                break;
            case "4":
                HossinObj = {vs:vs, nc:nc, tr:tr, locked:-1, unstable: unstable, warpgates: warpgates};
                break;
            case "6":
                AmerishObj = {vs:vs, nc:nc, tr:tr, locked:-1, unstable: unstable, warpgates: warpgates};
                break;
            case "8":
                EsamirObj = {vs:vs, nc:nc, tr:tr, locked:-1, unstable: unstable, warpgates: warpgates};
                break;
            case "14":
                KoltyrObj = {vs:vs, nc:nc, tr:tr, locked:-1, unstable: unstable, warpgates: warpgates};
                break;
            case "344":
                OshurObj = {vs:vs, nc:nc, tr:tr, locked:-1, unstable: unstable, warpgates: warpgates};
                break;
        }
    }
    // Check for lock status
    for(let obj of [IndarObj, HossinObj, AmerishObj, EsamirObj, OshurObj, KoltyrObj]){
        const total = obj.vs + obj.nc + obj.tr;
        if(obj.vs == total){
            obj.locked = 1;
        }
        else if(obj.nc == total){
            obj.locked = 2;
        }
        else if(obj.tr == total){
            obj.locked = 3;
        }
    }

    //Account for warpgates
    IndarObj.vs = Math.max(0, IndarObj.vs-1);
    IndarObj.nc = Math.max(0, IndarObj.nc-1);
    IndarObj.tr = Math.max(0, IndarObj.tr-1);
    HossinObj.vs = Math.max(0, HossinObj.vs-1);
    HossinObj.nc = Math.max(0, HossinObj.nc-1);
    HossinObj.tr = Math.max(0, HossinObj.tr-1);
    AmerishObj.vs = Math.max(0, AmerishObj.vs-1);
    AmerishObj.nc = Math.max(0, AmerishObj.nc-1);
    AmerishObj.tr = Math.max(0, AmerishObj.tr-1);
    EsamirObj.vs = Math.max(0, EsamirObj.vs-1);
    EsamirObj.nc = Math.max(0, EsamirObj.nc-1);
    EsamirObj.tr = Math.max(0, EsamirObj.tr-1);
    OshurObj.vs = Math.max(0, OshurObj.vs-1);
    OshurObj.nc = Math.max(0, OshurObj.nc-1);
    OshurObj.tr = Math.max(0, OshurObj.tr-1);
    KoltyrObj.vs = Math.max(0, KoltyrObj.vs-1);
    KoltyrObj.nc = Math.max(0, KoltyrObj.nc-1);
    KoltyrObj.tr = Math.max(0, KoltyrObj.tr-1);

    return {Indar: IndarObj, Hossin: HossinObj, Amerish: AmerishObj, Esamir: EsamirObj, Oshur: OshurObj, Koltyr: KoltyrObj};
}

export const data = {
    name: 'territory',
    description: "Look up the current territory control of a server",
    options: [{
        name: 'server',
        type: ApplicationCommandOptionType.String,
        description: 'Server name',
        required: true,
        choices: allServers
    }]
};

export const type = ['PGClient']

/**
 * Get the current continent info on a server to post in discord
 * @param { ChatInteraction } interaction - command chat interaction
 * @param {pg.Client} pgClient - postgres client
 * @param {string} locale - locale to use for translations
 */
export async function execute(interaction, locale="en-US", pgClient){
    const serverName = interaction.options.getString("server");

    const serverID = serverIDs[serverName];
    const terObj = await territoryInfo(serverID);
    const resEmbed = new EmbedBuilder()
        .setTitle(i18n.__mf({phrase: "{continent} territory", locale: locale}, {continent: i18n.__({phrase: serverNames[serverID], locale: locale})}))
        .setTimestamp()
        .setURL(fisuTerritory(serverID));
    const recordedStatus = await pgClient.query("SELECT * FROM openContinents WHERE world = $1;", [serverName]);
    const openContinents = [];
    const lockedContinents = [];
    for(const continent of continents){
        let Total = terObj[continent].vs + terObj[continent].nc + terObj[continent].tr;
        if(Total == 0){
            continue; // This accounts for Esamir being disabled on PS4
        }
        const timestamp = Date.parse(recordedStatus.rows[0][`${continent.toLowerCase()}change`])/1000;
        const vsPc = localeNumber((terObj[continent].vs/Total)*100, locale);
        const ncPc = localeNumber((terObj[continent].nc/Total)*100, locale);
        const trPc = localeNumber((terObj[continent].tr/Total)*100, locale);
        const owningFaction = faction(terObj[continent].locked);
        if(terObj[continent].locked != -1){
            lockedContinents.push({
                title: `${i18n.__({phrase: continent, locale: locale})} ${owningFaction.decal}`,
                body: `${i18n.__mf({phrase: "Locked {timestamp} ({relative})", locale: locale}, {timestamp: `<t:${timestamp}:t>`, relative: `<t:${timestamp}:R>`})}\n${continentBenefit(continent, locale)}`,
                lastChange: timestamp
            })
        }
        else if(terObj[continent].unstable){
            openContinents.push({
                title: `${i18n.__({phrase: continent, locale: locale})} <:Unstable:1000661319663497217>`,
                body: `${i18n.__mf({phrase: "Unlocked {timestamp} ({relative})", locale: locale}, {timestamp: `<t:${timestamp}:t>`, relative: `<t:${timestamp}:R>`})}\
                \n*${i18n.__({phrase: "currentlyUnstable", locale: locale})}*\
                \n${terObj[continent].warpgates[1]} <:VS:818766983918518272> **${i18n.__({phrase: "VS", locale: locale})}**: ${terObj[continent].vs}  |  ${vsPc}%\
                \n${terObj[continent].warpgates[2]} <:NC:818767043138027580> **${i18n.__({phrase: "NC", locale: locale})}**: ${terObj[continent].nc}  |  ${ncPc}%\
                \n${terObj[continent].warpgates[3]} <:TR:818988588049629256> **${i18n.__({phrase: "TR", locale: locale})}**: ${terObj[continent].tr}  |  ${trPc}%`,
                lastChange: timestamp
            })
        }
        else{
            openContinents.push({
                title: i18n.__({phrase: continent, locale: locale}),
                body: `${i18n.__mf({phrase: "Unlocked {timestamp} ({relative})", locale: locale}, {timestamp: `<t:${timestamp}:t>`, relative: `<t:${timestamp}:R>`})}\
                \n${terObj[continent].warpgates[1]} <:VS:818766983918518272> **${i18n.__({phrase: "VS", locale: locale})}**: ${terObj[continent].vs}  |  ${vsPc}%\
                \n${terObj[continent].warpgates[2]} <:NC:818767043138027580> **${i18n.__({phrase: "NC", locale: locale})}**: ${terObj[continent].nc}  |  ${ncPc}%\
                \n${terObj[continent].warpgates[3]} <:TR:818988588049629256> **${i18n.__({phrase: "TR", locale: locale})}**: ${terObj[continent].tr}  |  ${trPc}%`,
                lastChange: timestamp
            })
        }
    }
    openContinents.sort(function (a,b) {return a.lastChange-b.lastChange});
    lockedContinents.sort(function (a,b) {return a.lastChange-b.lastChange});

    for(const continent of openContinents){
        resEmbed.addFields({name: continent.title, value: continent.body});
    }
    for(const continent of lockedContinents){
        resEmbed.addFields({name: continent.title, value: continent.body});
    }
    await interaction.editReply({embeds: [resEmbed]});
}