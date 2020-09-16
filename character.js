// This file implements functions to look up a character's basic information, the number of Auraxium medals they have, and their top weapon
// All three platforms are supported, but must be specified in the "platform" parameter

const Discord = require('discord.js');
var weapons = require('./weapons.json');
var vehicles = require('./vehicles.json');
var got = require('got');

var basicInfo = async function(cName, platform){
    // Main function for character lookup.  Pulls most stats and calls other functions for medals/top weapon info
    let uri = 'https://census.daybreakgames.com/s:'+process.env.serviceID+'/get/'+platform+'/character?name.first_lower='+cName+'&c:resolve=outfit_member_extended,online_status,world,stat_history,weapon_stat_by_faction,weapon_stat&c:join=title,characters_stat^list:1';
    let response =  "";
    try{
       response = await got(uri).json(); 
    }
    catch(err){
        if(err.message.indexOf('404') > -1){
            return new Promise(function(resolve, reject){
                reject("API Unreachable");
            })
        }
    }
    if(typeof(response.error) !== 'undefined'){
        if(response.error == 'service_unavailable'){
            return new Promise(function(resolve, reject){
                reject("Census API currently unavailable");
            })
        }
        if(typeof(response.error) === 'string'){
            return new Promise(function(resolve, reject){
                reject("Census API error: "+response.error);
            })
        }
        return new Promise(function(resolve, reject){
            reject(response.error);
        })
    }
    if(typeof(response.character_list) === 'undefined'){
        return new Promise(function(resolve, reject){
            reject("API Error");
        })
    }
    if(typeof(response.character_list[0]) === 'undefined'){
        return new Promise(function(resolve, reject){
            reject(cName+" not found");
        })
    }
    let data = response.character_list[0];
    //store basic information
    let resObj = {
        name: data.name.first,
        title: null,
        br: data.battle_rank.value,
        prestige: data.prestige_level,
        server: data.world_id,
        playTime: data.times.minutes_played,
        online: data.online_status,
        lastLogin: data.times.last_login_date,
        faction: data.faction_id,
        inOutfit: false,
        stats: false,
        stat_history: false
    }
    if(data.title_id_join_title != null){
        resObj.title = data.title_id_join_title.name.en;
    }
    if(data.outfit_member != null){
        resObj.inOutfit = true;
        resObj.outfitName = data.outfit_member.name;
        resObj.outfitAlias = data.outfit_member.alias;
        resObj.outfitRank = data.outfit_member.member_rank;
    }
    if(data.stats != null){
        resObj.stats = true;
        topID = 0;
        mostKills = 0;
        weaponStat = data.stats.weapon_stat_by_faction;
        //find most used weapon
        for (x in weaponStat){
            if (weaponStat[x].stat_name == "weapon_kills" && weaponStat[x].item_id != "0"){
                itemKills = Number(weaponStat[x].value_vs) + Number(weaponStat[x].value_nc) + Number(weaponStat[x].value_tr);
                if (itemKills > mostKills){
                    mostKills = itemKills;
                    topID = weaponStat[x].item_id;
                }
            }
        }
        resObj.mostKills = mostKills;
        resObj.topWeaponID = topID;
        // Find name of most used weapon, calculate number of Auraxium medals
        if(mostKills > 0){
            try{
                resObj.topWeaponName = await getWeaponName(topID, platform);
            }
            catch{
                console.log("Error retrieving top weapon name for id "+topID);
                resObj.topWeaponName = "Error";
            }
            if(mostKills > 100){
                resObj.auraxCount = await getAuraxiumCount(cName, platform);
            }
            else{
                resObj.auraxCount = 0;
            }
        }
        else{
            resObj.topWeaponName = "No kills";
            resObj.auraxCount = 0;
        }
        // Determine most used vehicle
        if(typeof(data.stats.weapon_stat) !== 'undefined'){
            let topVehicleTime = 0;
            let favoriteVehicle = 0;
            for(let stat of data.stats.weapon_stat){
                if(stat.stat_name == "weapon_play_time" && stat.item_id == "0" && stat.value > topVehicleTime){
                    topVehicleTime = Number.parseInt(stat.value);
                    favoriteVehicle = stat.vehicle_id;
                }
            }
            resObj.favoriteVehicle = favoriteVehicle;
            resObj.topVehicleTime = topVehicleTime;
        }
        // Pull stats for score, spm, and K/D
        if(typeof(data.stats.stat_history) !== 'undefined'){
            resObj.stat_history = true;
            for(let stat of data.stats.stat_history){
                switch(stat.stat_name){
                    case "deaths":
                        resObj.deaths = stat.all_time;
                        break;
                    case "facility_capture":
                        resObj.captures = stat.all_time;
                        break;
                    case "facility_defend":
                        resObj.defends = stat.all_time;
                        break;
                    case "kills":
                        resObj.kills = stat.all_time;
                        break;
                    case "score":
                        resObj.score = stat.all_time;
                        break;
                }
            }
        }
        
    }
    if(typeof(data.character_id_join_characters_stat) !== 'undefined'){
        let topClass = 0;
        let topTime = 0;
        for(let stat of data.character_id_join_characters_stat){
            if(stat.stat_name == "play_time" && parseInt(stat.value_forever) > topTime){
                topTime = stat.value_forever;
                topClass = stat.profile_id;
            }
        }
        resObj.topClass = topClass;
        resObj.topTime = topTime;
    }
    return new Promise(function(resolve, reject){
        resolve(resObj);
    })
}

var getWeaponName = async function(ID, platform){
    // Returns the name of the weapon ID specified.  If the Census API is unreachable it will fall back to the fisu api
    if(typeof(weapons[ID]) !== 'undefined'){
        return new Promise(function(resolve, reject){
            resolve(weapons[ID].name);
        })
    }
    let URI = 'https://census.daybreakgames.com/s:'+process.env.serviceID+'/get/'+platform+'/item/'+ID;
    let response = await got(URI).json();
    if(response.returned==1){
        return new Promise(function(resolve, reject){
            resolve(response.item_list[0].name.en);
        })
    }
    URI = 'https://ps2.fisu.pw/api/weapons/?id='+ID; //Fallback Fisu URI
    let fisuResponse = await got(URI).json();
    if(typeof(fisuResponse[ID]) !== 'undefined'){
        return new Promise(function(resolve, reject){
            resolve(fisuResponse[ID].name);
        })
    }
    return new Promise(function(resolve, reject){
        reject("Not found");
    })
}

var getVehicleName = async function(ID, platform){
    if(typeof(vehicles[ID]) !== 'undefined'){
        return new Promise(function(resolve, reject){
            resolve(vehicles[ID].name);
        })
    }
    let URI = 'https://census.daybreakgames.com/s:'+process.env.serviceID+'/get/'+platform+'/vehicle/'+ID;
    let response = await got(URI).json();
    if(response.returned==1){
        return new Promise(function(resolve, reject){
            resolve(response.vehicle_list[0].name.en);
        })
    }
    return new Promise(function(resolve, reject){
        reject("Not found");
    })
}

var getAuraxiumCount = async function(cName, platform){
    // Calculates the number of Auraxium medals a specified character has
    let URI = "http://census.daybreakgames.com/s:"+process.env.serviceID+"/get/"+platform+"/character?name.first_lower="+cName+"&c:join=characters_achievement^list:1^terms:earned_count=1^outer:0^hide:character_id%27earned_count%27start%27finish%27last_save%27last_save_date%27start_date(achievement^terms:repeatable=0^outer:0^show:name.en%27description.en)"
    let response = await got(URI).json();
    let medalCount = 0;
    if(typeof(response.character_list) === 'undefined' || typeof(response.character_list[0]) === 'undefined'){
        return new Promise(function(resolve, reject){
            resolve("Error");
        })
    }
    let achievementList = response.character_list[0].character_id_join_characters_achievement;
    for(x in achievementList){
        achievement = achievementList[x].achievement_id_join_achievement;
        if(achievement != undefined){
            if(achievement.description == undefined){
                if(achievement.name.en.indexOf("Auraxium") > -1){
                    medalCount++;
                }
            }
            else if(achievement.description.en == "1000 Enemies Killed"){
                medalCount++;
            }
        }
    }
    return new Promise(function(resolve, reject){
        resolve(medalCount);
    })
}

module.exports = {
    character: async function(cName, platform){
        // Calls function to get basic info, extracts info from returned object and constructs the Discord embed to send
        try{
            cInfo = await basicInfo(cName, platform);
        }
        catch(error){
            return new Promise(function(resolve, reject){
                reject(error);
            })
        }
        let resEmbed = new Discord.MessageEmbed();

        // Username, title, fisu url
        resEmbed.setTitle(cInfo.name);
        if(cInfo.title != null){
            resEmbed.setDescription(cInfo.title);
        }
        if(platform == 'ps2:v2'){
            resEmbed.setURL('http://ps2.fisu.pw/player/?name='+cName);
        }
        else if(platform == 'ps2ps4us:v2'){
            resEmbed.setURL('http://ps4us.ps2.fisu.pw/player/?name='+cName);
        }
        else if(platform == 'ps2ps4eu:v2'){
            resEmbed.setURL('http://ps4eu.ps2.fisu.pw/player/?name='+cName);
        }
        
        // BR & ASP
        if(cInfo.prestige > 0){
            resEmbed.addField('BR', cInfo.br+"~"+cInfo.prestige, true);
        }
        else{
            resEmbed.addField('BR', cInfo.br, true);
        }

        // Score, SPM
        if(cInfo.stat_history){
            resEmbed.addField('Score (SPM)', parseInt(cInfo.score).toLocaleString()+" ("+Number.parseFloat(cInfo.score/cInfo.playTime).toPrecision(4)+")", true);
        }

        // Server
        switch (cInfo.server)
        {
            case "1":
                resEmbed.addField('Server', 'Connery', true);
                break;
            case "10":
                resEmbed.addField('Server', 'Miller', true);
                break;
            case "13":
                resEmbed.addField('Server', 'Cobalt', true);
                break;
            case "17":
                resEmbed.addField('Server', 'Emerald', true);
                break;
            case "19":
                resEmbed.addField('Server', 'Jaeger', true);
                break;
            case "40":
                resEmbed.addField('Server', 'SolTech', true);
                break;
            case "1000":
                resEmbed.addField('Server', 'Genudine', true);
                break;
            case "2000":
                resEmbed.addField('Server', 'Ceres', true);
        }

        // Playtime, K/D, online status, last login
        hours = Math.floor(cInfo.playTime/60);
        minutesPlayed = cInfo.playTime - hours*60;
        resEmbed.addField('Playtime', hours+' hours, '+minutesPlayed+' minutes', true);
        if(cInfo.stat_history){
            resEmbed.addField('KD', Number.parseFloat(cInfo.kills/cInfo.deaths).toPrecision(3), true);
            resEmbed.addField('KPM', Number.parseFloat(cInfo.kills/cInfo.playTime).toPrecision(3), true);
        }
        if (cInfo.online == "service_unavailable"){
            resEmbed.addField('Online', 'Service unavailable', true);
        }
        else if (cInfo.online >= 1){
            resEmbed.addField('Online', ':white_check_mark:', true);
        }
        else{
            resEmbed.addField('Online', ':x:', true);
        }
        resEmbed.addField('Last Login', cInfo.lastLogin.substring(0,10), true);

        // Faction, embed color
        if (cInfo.faction == "1"){ //vs
            resEmbed.addField('Faction', 'VS', true);
            resEmbed.setColor('PURPLE');
        }
        else if (cInfo.faction == "2"){ //nc
            resEmbed.addField('Faction', 'NC', true);
            resEmbed.setColor('BLUE');
        }
        else if (cInfo.faction == "3"){ //tr
            resEmbed.addField('Faction', 'TR', true);
            resEmbed.setColor('RED');
        }
        else{ //NSO
            resEmbed.addField('Faction', 'NSO', true);
            resEmbed.setColor('GREY');
        }

        // Outfit info
        if(cInfo.inOutfit){
            if(cInfo.outfitAlias != "" && platform == 'ps2:v2'){
                resEmbed.addField('Outfit', '[['+cInfo.outfitAlias+']](https://ps2.fisu.pw/outfit/?name='+cInfo.outfitAlias+') '+cInfo.outfitName, true);
            }
            else if(cInfo.outfitAlias != "" && platform == 'ps2ps4us:v2'){
                resEmbed.addField('Outfit', '[['+cInfo.outfitAlias+']](https://ps4us.ps2.fisu.pw/outfit/?name='+cInfo.outfitAlias+') '+cInfo.outfitName, true);
            }
            else if(cInfo.outfitAlias != "" && platform == 'ps2ps4eu:v2'){
                resEmbed.addField('Outfit', '[['+cInfo.outfitAlias+']](https://ps4eu.ps2.fisu.pw/outfit/?name='+cInfo.outfitAlias+') '+cInfo.outfitName, true);
            }
            else{
                resEmbed.addField('Outfit', cInfo.outfitName, true);
            }
            resEmbed.addField('Outfit Rank', cInfo.outfitRank, true);
        }

        // Top Weapon, Auraxium medals
        if(cInfo.stats){
            if(cInfo.topWeaponName != "Error"){
                resEmbed.addField('Top Weapon (kills)', cInfo.topWeaponName+" ("+cInfo.mostKills+")", true);
            }
            if(cInfo.auraxCount != "Error"){
                resEmbed.addField('Auraxium medals', cInfo.auraxCount, true);
            }
        }

        // Top class
        if(typeof(cInfo.topClass) !== 'undefined'){
            let classHours = Math.floor(cInfo.topTime/60/60);
            let classMinutes = cInfo.topTime/60 - classHours*60;
            let className = " ";
            switch(cInfo.topClass){
                case "1":
                    className = "Infiltrator"
                    break;
                case "3":
                    className = "Light Assault"
                    break;
                case "4":
                    className = "Medic"
                    break;
                case "5":
                    className = "Engineer"
                    break;
                case "6":
                    className = "Heavy Assault"
                    break;
                case "7":
                    className = "MAX"
                    break;
            }
            resEmbed.addField("Most played class (time)", className+" ("+classHours+"h "+parseInt(classMinutes)+"m)", true);
        }

        // Favorite vehicle
        if(typeof(cInfo.favoriteVehicle) !== 'undefined' && cInfo.favoriteVehicle != 0){
            let vehicleHours = Math.floor(cInfo.topVehicleTime/60/60);
            let vehicleMinutes = parseInt(cInfo.topVehicleTime/60 - vehicleHours*60);
            let vehicleName = await getVehicleName(cInfo.favoriteVehicle);
            resEmbed.addField("Most played vehicle (time)", vehicleName+" ("+vehicleHours+"h "+vehicleMinutes+"m)", true);
        }

        return new Promise(function(resolve, reject){
            resolve(resEmbed);
        })
    }
}