// This file defines functions used in finding and returning the current territory control on a given server, broken up by continent

const Discord = require('discord.js');
var got = require('got');

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
        let terObj = await this.territoryInfo(server);
        let resEmbed = new Discord.RichEmbed();
        resEmbed.setTitle(printableName(server)+" territory");
        let IndarTotal = terObj.Indar.vs + terObj.Indar.nc + terObj.Indar.tr;
        let vsPc = (terObj.Indar.vs/IndarTotal)*100;
        vsPc = Number.parseFloat(vsPc).toPrecision(3);
        let ncPc = (terObj.Indar.nc/IndarTotal)*100;
        ncPc = Number.parseFloat(ncPc).toPrecision(3);
        let trPc = (terObj.Indar.tr/IndarTotal)*100;
        trPc = Number.parseFloat(trPc).toPrecision(3);
        if(vsPc == 100){
            resEmbed.addField('Indar', 'Owned by the VS');
        }
        else if(ncPc == 100){
            resEmbed.addField('Indar', 'Owned by the NC');
        }
        else if(trPc == 100){
            resEmbed.addField('Indar', 'Owned by the TR');
        }
        else{
            resEmbed.addField('Indar', 'VS: '+vsPc+'% ('+terObj.Indar.vs+') | NC: '+ncPc+'% ('+terObj.Indar.nc+') | TR: '+trPc+'% ('+terObj.Indar.tr+')');
        }
        let HossinTotal = terObj.Hossin.vs + terObj.Hossin.nc + terObj.Hossin.tr;
        vsPc = (terObj.Hossin.vs/HossinTotal)*100;
        vsPc = Number.parseFloat(vsPc).toPrecision(3);
        ncPc = (terObj.Hossin.nc/HossinTotal)*100;
        ncPc = Number.parseFloat(ncPc).toPrecision(3);
        trPc = (terObj.Hossin.tr/HossinTotal)*100;
        trPc = Number.parseFloat(trPc).toPrecision(3);
        if(vsPc == 100){
            resEmbed.addField('Hossin', 'Owned by the VS');
        }
        else if(ncPc == 100){
            resEmbed.addField('Hossin', 'Owned by the NC');
        }
        else if(trPc == 100){
            resEmbed.addField('Hossin', 'Owned by the TR');
        }
        else{
            resEmbed.addField('Hossin', 'VS: '+vsPc+'% ('+terObj.Hossin.vs+') | NC: '+ncPc+'% ('+terObj.Hossin.nc+') | TR: '+trPc+'% ('+terObj.Hossin.tr+')');
        }
        let AmerishTotal = terObj.Amerish.vs + terObj.Amerish.nc + terObj.Amerish.tr;
        vsPc = (terObj.Amerish.vs/AmerishTotal)*100;
        vsPc = Number.parseFloat(vsPc).toPrecision(3);
        ncPc = (terObj.Amerish.nc/AmerishTotal)*100;
        ncPc = Number.parseFloat(ncPc).toPrecision(3);
        trPc = (terObj.Amerish.tr/AmerishTotal)*100;
        trPc = Number.parseFloat(trPc).toPrecision(3);
        if(vsPc == 100){
            resEmbed.addField('Amerish', 'Owned by the VS');
        }
        else if(ncPc == 100){
            resEmbed.addField('Amerish', 'Owned by the NC');
        }
        else if(trPc == 100){
            resEmbed.addField('Amerish', 'Owned by the TR');
        }
        else{
            resEmbed.addField('Amerish', 'VS: '+vsPc+'% ('+terObj.Amerish.vs+') | NC: '+ncPc+'% ('+terObj.Amerish.nc+') | TR: '+trPc+'% ('+terObj.Amerish.tr+')');
        }
        let EsamirTotal = terObj.Esamir.vs + terObj.Esamir.nc + terObj.Esamir.tr;
        vsPc = (terObj.Esamir.vs/EsamirTotal)*100;
        vsPc = Number.parseFloat(vsPc).toPrecision(3);
        ncPc = (terObj.Esamir.nc/EsamirTotal)*100;
        ncPc = Number.parseFloat(ncPc).toPrecision(3);
        trPc = (terObj.Esamir.tr/EsamirTotal)*100;
        trPc = Number.parseFloat(trPc).toPrecision(3);
        if(vsPc == 100){
            resEmbed.addField('Esamir', 'Owned by the VS');
        }
        else if(ncPc == 100){
            resEmbed.addField('Esamir', 'Owned by the NC');
        }
        else if(trPc == 100){
            resEmbed.addField('Esamir', 'Owned by the TR');
        }
        else{
            resEmbed.addField('Esamir', 'VS: '+vsPc+'% ('+terObj.Esamir.vs+') | NC: '+ncPc+'% ('+terObj.Esamir.nc+') | TR: '+trPc+'% ('+terObj.Esamir.tr+')');
        }
        return new Promise(function(resolve, reject){
            resolve(resEmbed);
        })
    
    }
}