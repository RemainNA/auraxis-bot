// This file defines functions used in finding and returning the current territory control on a given server, broken up by continent

const Discord = require('discord.js');
var got = require('got');
var messageHandler = require('./messageHandler.js');

serverToUrl = function(server){
    switch (server.toLowerCase()){
        case "connery":
            return 'https://census.daybreakgames.com/s:'+process.env.serviceID+'/get/ps2:v2/map/?world_id=1&zone_ids=2,4,6,8';
        case "miller":
            return 'https://census.daybreakgames.com/s:'+process.env.serviceID+'/get/ps2:v2/map/?world_id=10&zone_ids=2,4,6,8';
        case "cobalt":
            return 'https://census.daybreakgames.com/s:'+process.env.serviceID+'/get/ps2:v2/map/?world_id=13&zone_ids=2,4,6,8';
        case "emerald":
            return 'https://census.daybreakgames.com/s:'+process.env.serviceID+'/get/ps2:v2/map/?world_id=17&zone_ids=2,4,6,8';
        case "soltech":
            return 'https://census.daybreakgames.com/s:'+process.env.serviceID+'/get/ps2:v2/map/?world_id=40&zone_ids=2,4,6,8';
        case "genudine":
            return 'https://census.daybreakgames.com/s:'+process.env.serviceID+'/get/ps2ps4us:v2/map/?world_id=1000&zone_ids=2,4,6,8';
        case "ceres":
            return 'https://census.daybreakgames.com/s:'+process.env.serviceID+'/get/ps2ps4eu:v2/map/?world_id=2000&zone_ids=2,4,6,8';
    }
    return null
}

fisuTerritory = function(server){
    switch (server.toLowerCase()){
        case "connery":
            return 'https://ps2.fisu.pw/control/?world=1';
        case "miller":
            return 'https://ps2.fisu.pw/control/?world=10';
        case "cobalt":
            return 'https://ps2.fisu.pw/control/?world=13';
        case "emerald":
            return 'https://ps2.fisu.pw/control/?world=17';
        case "soltech":
            return 'https://ps2.fisu.pw/control/?world=40';
        case "genudine":
            return 'https://ps4us.ps2.fisu.pw/control/?world=1000';
        case "ceres":
            return 'https://ps4eu.ps2.fisu.pw/control/?world=2000';
    }
    return null
}

printableName = function(server){
    switch (server.toLowerCase()){
        case "connery":
            return 'Connery';
        case "miller":
            return 'Miller';
        case "cobalt":
            return 'Cobalt';
        case "emerald":
            return 'Emerald';
        case "soltech":
            return 'SolTech';
        case "genudine":
            return 'Genudine';
        case "ceres":
            return 'Ceres';
    }
}

continentBenefit = function(continent){
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
    territoryInfo: async function(server){
        let uri = serverToUrl(server)
        if(uri == null){
            return new Promise(function(resolve, reject){
                reject(server+" not recognized");
            })
        }
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
        if(typeof(response.map_list) === 'undefined'){
            return new Promise(function(resolve, reject){
                reject("API response improperly formatted");
            })
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
        return new Promise(function(resolve, reject){
            resolve({Indar: IndarObj, Hossin: HossinObj, Amerish: AmerishObj, Esamir: EsamirObj});
        })
    },

    territory: async function(server){
        if(messageHandler.badQuery(server)){
			return new Promise(function(resolve, reject){
                reject("Server search contains disallowed characters");
            })
        }
        
        let terObj = await this.territoryInfo(server);
        let resEmbed = new Discord.MessageEmbed();
        resEmbed.setTitle(printableName(server)+" territory");
        resEmbed.setTimestamp();
        resEmbed.setURL(fisuTerritory(server));
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
                resEmbed.addField(continent, 'Owned by the VS: '+continentBenefit(continent));
            }
            else if(ncPc == 100){
                resEmbed.addField(continent, 'Owned by the NC: '+continentBenefit(continent));
            }
            else if(trPc == 100){
                resEmbed.addField(continent, 'Owned by the TR: '+continentBenefit(continent));
            }
            else{
                resEmbed.addField(continent, 'VS: '+vsPc+'% ('+terObj[continent].vs+') | NC: '+ncPc+'% ('+terObj[continent].nc+') | TR: '+trPc+'% ('+terObj[continent].tr+')');
            }
        }
        return new Promise(function(resolve, reject){
            resolve(resEmbed);
        })
    
    }
}