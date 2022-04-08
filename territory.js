// This file defines functions used in finding and returning the current territory control on a given server, broken up by continent

const Discord = require('discord.js');
const { serverNames, serverIDs, badQuery, censusRequest, continents, localeNumber } = require('./utils');
const i18n = require('i18n');

const fisuTerritory = function(serverID){
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

const continentBenefit = function(continent, locale="en-US"){
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

// Zone (continent) IDs
// Indar: 2
// Hossin: 4
// Amerish: 6
// Esamir: 8

// Faction IDs
// VS: 1
// NC: 2
// TR: 3

module.exports = {
    territoryInfo: async function(serverID){
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
        let IndarObj = {vs:0, nc:0, tr:0, locked:-1};
        let HossinObj = {vs:0, nc:0, tr:0, locked:-1};
        let AmerishObj = {vs:0, nc:0, tr:0, locked:-1};
        let EsamirObj = {vs:0, nc:0, tr:0, locked:-1};
        let OshurObj = {vs:0, nc:0, tr:0, locked:-1};
        let KoltyrObj = {vs:0, nc:0, tr:0, locked:-1};
        for(const res of response){
            let vs = 0;
            let nc = 0;
            let tr = 0;
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
            }
            switch(res.ZoneId){
                case "2":
                    IndarObj = {vs:vs, nc:nc, tr:tr, locked:-1};
                    break;
                case "4":
                    HossinObj = {vs:vs, nc:nc, tr:tr, locked:-1};
                    break;
                case "6":
                    AmerishObj = {vs:vs, nc:nc, tr:tr, locked:-1};
                    break;
                case "8":
                    EsamirObj = {vs:vs, nc:nc, tr:tr, locked:-1};
                    break;
                case "14":
                    KoltyrObj = {vs:vs, nc:nc, tr:tr, locked:-1};
                    break;
                case "344":
                    OshurObj = {vs:vs, nc:nc, tr:tr, locked:-1};
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
    },

    territory: async function(serverName, locale="en-US"){
        if(badQuery(serverName)){
			throw "Server search contains disallowed characters";
        }

        if (!(serverName in serverIDs)){
            throw `${serverName} not found`;
        }

        const serverID = serverIDs[serverName];
        let terObj = await this.territoryInfo(serverID);
        let resEmbed = new Discord.MessageEmbed();
        resEmbed.setTitle(i18n.__mf({phrase: "{continent} territory", locale: locale}, {continent: i18n.__({phrase: serverNames[serverID], locale: locale})}));
        resEmbed.setTimestamp();
        resEmbed.setURL(fisuTerritory(serverID));
        for(let continent of continents){
            let Total = terObj[continent].vs + terObj[continent].nc + terObj[continent].tr;
            if(Total == 0){
                continue; // This accounts for Esamir being disabled on PS4
            }
            const vsPc = localeNumber((terObj[continent].vs/Total)*100, locale);
            const ncPc = localeNumber((terObj[continent].nc/Total)*100, locale);
            const trPc = localeNumber((terObj[continent].tr/Total)*100, locale);
            if(terObj[continent].locked == 1){
                resEmbed.addField(`${i18n.__({phrase: continent, locale: locale})} <:VS:818766983918518272> `, i18n.__mf({phrase: "Owned by the {faction}", locale: locale}, {faction: i18n.__({phrase: "VS", locale: locale})})+": "+continentBenefit(continent, locale));
            }
            else if(terObj[continent].locked == 2){
                resEmbed.addField(`${i18n.__({phrase: continent, locale: locale})} <:NC:818767043138027580> `, i18n.__mf({phrase: "Owned by the {faction}", locale: locale}, {faction: i18n.__({phrase: "NC", locale: locale})})+": "+continentBenefit(continent, locale));
            }
            else if(terObj[continent].locked == 3){
                resEmbed.addField(`${i18n.__({phrase: continent, locale: locale})} <:TR:818988588049629256> `, i18n.__mf({phrase: "Owned by the {faction}", locale: locale}, {faction: i18n.__({phrase: "TR", locale: locale})})+": "+continentBenefit(continent, locale));
            }
            else{
                resEmbed.addField(i18n.__({phrase: continent, locale: locale}), `\
                \n<:VS:818766983918518272> **${i18n.__({phrase: "VS", locale: locale})}**: ${terObj[continent].vs}  |  ${vsPc}%\
                \n<:NC:818767043138027580> **${i18n.__({phrase: "NC", locale: locale})}**: ${terObj[continent].nc}  |  ${ncPc}%\
                \n<:TR:818988588049629256> **${i18n.__({phrase: "TR", locale: locale})}**: ${terObj[continent].tr}  |  ${trPc}%`)
            }
        }

        return resEmbed;
    },

    continentBenefit: continentBenefit
}