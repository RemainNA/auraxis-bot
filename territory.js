// This file defines functions used in finding and returning the current territory control on a given server, broken up by continent

const Discord = require('discord.js');
const got = require('got');
const { serverNames, serverIDs, badQuery } = require('./utils');

const serverToUrl = function(serverID){
    if (serverID < 1000){
        return `https://census.daybreakgames.com/s:${process.env.serviceID}/get/ps2:v2/map/?world_id=${serverID}&zone_ids=2,4,6,8`;
    }
    else if(serverID == 1000){
        return `https://census.daybreakgames.com/s:${process.env.serviceID}/get/ps2ps4us:v2/map/?world_id=1000&zone_ids=2,4,6,8`;
    }
    else if(serverID == 2000){
        return `https://census.daybreakgames.com/s:${process.env.serviceID}/get/ps2ps4eu:v2/map/?world_id=2000&zone_ids=2,4,6,8`;
    }
    return null;
}

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

const continentBenefit = function(continent){
    switch (continent){
        case "Indar":
            return "Increases heat efficiency of base Phalanx turrets"
        case "Hossin":
            return "Vehicle/Aircraft repair at ammo resupply towers/pads"
        case "Amerish":
            return "Base generators auto-repair over time"
        case "Esamir":
            return "Allied control points increase shield capacity"
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
        let uri = serverToUrl(serverID)
        if(uri == null){
            throw `Server not recognized`;
        }
        let response = await got(uri).json();
        if(typeof(response.error) !== 'undefined'){
            throw response.error;
        }
        if(response.statusCode == 404){
            throw "API Unreachable";
        }
        if(response.returned < 4){
            throw "API response missing continents";
        }
        if(typeof(response.map_list) === 'undefined'){
            throw "API response improperly formatted";
        }
        if(typeof(response.map_list[0].Regions) === 'undefined'){
            throw "API response missing Regions field";
        }
        let IndarData = response.map_list[0].Regions.Row;
        let HossinData = response.map_list[1].Regions.Row;
        let AmerishData = response.map_list[2].Regions.Row;
        let EsamirData = response.map_list[3].Regions.Row;
        let IndarObj = {vs:0, nc:0, tr:0};
        let HossinObj = {vs:0, nc:0, tr:0};
        let AmerishObj = {vs:0, nc:0, tr:0};
        let EsamirObj = {vs:0, nc:0, tr:0};
        for(let row of IndarData){
            if(row.RowData.FactionId == "1"){
                IndarObj.vs += 1;
            }
            else if(row.RowData.FactionId == "2"){
                IndarObj.nc += 1;
            }
            else if(row.RowData.FactionId == "3"){
                IndarObj.tr += 1;
            }
        }
        for(let row of HossinData){
            if(row.RowData.FactionId == "1"){
                HossinObj.vs += 1;
            }
            else if(row.RowData.FactionId == "2"){
                HossinObj.nc += 1;
            }
            else if(row.RowData.FactionId == "3"){
                HossinObj.tr += 1;
            }
        }
        for(let row of AmerishData){
            if(row.RowData.FactionId == "1"){
                AmerishObj.vs += 1;
            }
            else if(row.RowData.FactionId == "2"){
                AmerishObj.nc += 1;
            }
            else if(row.RowData.FactionId == "3"){
                AmerishObj.tr += 1;
            }
        }
        for(let row of EsamirData){
            if(row.RowData.FactionId == "1"){
                EsamirObj.vs += 1;
            }
            else if(row.RowData.FactionId == "2"){
                EsamirObj.nc += 1;
            }
            else if(row.RowData.FactionId == "3"){
                EsamirObj.tr += 1;
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

        return {Indar: IndarObj, Hossin: HossinObj, Amerish: AmerishObj, Esamir: EsamirObj};
    },

    territory: async function(serverName){
        if(badQuery(serverName)){
			throw "Server search contains disallowed characters";
        }

        if (!(serverName in serverIDs)){
            throw `${serverName} not found`;
        }

        const serverID = serverIDs[serverName];
        let terObj = await this.territoryInfo(serverID);
        let resEmbed = new Discord.MessageEmbed();
        resEmbed.setTitle(serverNames[serverID]+" territory");
        resEmbed.setTimestamp();
        resEmbed.setURL(fisuTerritory(serverID));
        let continents = ["Indar", "Hossin", "Amerish", "Esamir"];
        for(let continent of continents){
            let Total = terObj[continent].vs + terObj[continent].nc + terObj[continent].tr;
            let vsPc = (terObj[continent].vs/Total)*100;
            vsPc = Number.parseFloat(vsPc).toPrecision(3);
            let ncPc = (terObj[continent].nc/Total)*100;
            ncPc = Number.parseFloat(ncPc).toPrecision(3);
            let trPc = (terObj[continent].tr/Total)*100;
            trPc = Number.parseFloat(trPc).toPrecision(3);
            if(vsPc == 100){
                resEmbed.addField(`${continent} <:VS:818766983918518272> `, 'Owned by the VS: '+continentBenefit(continent));
            }
            else if(ncPc == 100){
                resEmbed.addField(`${continent} <:NC:818767043138027580> `, 'Owned by the NC: '+continentBenefit(continent));
            }
            else if(trPc == 100){
                resEmbed.addField(`${continent} <:TR:818988588049629256> `, 'Owned by the TR: '+continentBenefit(continent));
            }
            else{
                resEmbed.addField(continent, `\
                \n<:VS:818766983918518272> **VS**: ${terObj[continent].vs}  |  ${vsPc}%\
                \n<:NC:818767043138027580> **NC**: ${terObj[continent].nc}  |  ${ncPc}%\
                \n<:TR:818988588049629256> **TR**: ${terObj[continent].tr}  |  ${trPc}%`)
            }
        }

        return resEmbed;
    },

    continentBenefit: continentBenefit
}