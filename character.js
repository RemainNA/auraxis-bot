/**
 * This file implements functions to look up a character's basic information, the number of Auraxium medals they have, and their top weapon 
 * All three platforms are supported, but must be specified in the "platform" parameter
 * @ts-check
 * @module character
 */


const Discord = require('discord.js');
const weapons = require('./static/weapons.json');
const vehicles = require('./static/vehicles.json');
const decals = require('./static/decals.json');
const sanction = require('./static/sanction.json');
const { fetch } = require('undici');
const i18n = require('i18n');
const { serverNames, badQuery, censusRequest, localeNumber, faction } = require('./utils');

/**
 * Get basic character information
 * @param {string} cName - The name of the character
 * @param {string} platform - The platform of the character
 * @returns an object containing the character's basic information
 * @throws if the character is not found
 */
const basicInfo = async function(cName, platform){
    // Main function for character lookup.  Pulls most stats and calls other functions for medals/top weapon info
    let response =  await censusRequest(platform, 'character_list', `/character?name.first_lower=${cName}&c:resolve=outfit_member_extended,online_status,world,stat_history,weapon_stat_by_faction,weapon_stat&c:join=title,characters_stat^list:1`);
    if(response.length == 0){
        throw `${cName} not found`;
    }
    let data = response[0];
    //store basic information
    let resObj = {
        name: data.name.first,
        characterID: data.character_id,
        title: null,
        br: data.battle_rank.value,
        prestige: data.prestige_level,
        server: data.world_id,
        playTime: data.times.minutes_played,
        online: data.online_status,
        lastLogin: data.times.last_login,
        faction: data.faction_id,
        inOutfit: false,
        stats: false,
        stat_history: false
    };
    if(platform != 'ps2:v2' && data.faction_id != 4){
        try{
            let manualPrestige = await checkASP(cName, platform);
            if(manualPrestige){
                resObj.prestige = 1;
            }
        }
        catch(err){
            // Fail silently
        }
    }
    if(data.title_id_join_title != null){
        resObj.title = data.title_id_join_title.name.en;
    }
    if(data.outfit_member != null){
        resObj.inOutfit = true;
        resObj.outfitName = data.outfit_member.name;
        resObj.outfitAlias = data.outfit_member.alias;
        resObj.outfitRank = data.outfit_member.member_rank;
        resObj.outfitRankOrdinal = data.outfit_member.member_rank_ordinal;
        resObj.outfitID = data.outfit_member.outfit_id;
    }
    if(data.stats != null){
        resObj.stats = true;
        let topID = 0;
        let mostKills = 0;
        let sanctionedStats = {};

        // Find most used weapon
        if(typeof(data.stats.weapon_stat_by_faction) !== 'undefined'){
            for (let stat of data.stats.weapon_stat_by_faction){
                if (stat.stat_name == "weapon_kills"){
                    if(stat.item_id != "0"){
                    let itemKills = Number(stat.value_vs) + Number(stat.value_nc) + Number(stat.value_tr);
                        if (itemKills > mostKills){
                            mostKills = itemKills;
                            topID = stat.item_id;
                        } 
                    }
                    if(includeInIVI(stat.item_id)){
                        sanctionedStats = populateStats(sanctionedStats, stat.item_id, 'kills', (Number(stat.value_vs) + Number(stat.value_nc) + Number(stat.value_tr)));
                    }
                    
                }
                else if(stat.stat_name == "weapon_headshots" && includeInIVI(stat.item_id)){
                    sanctionedStats = populateStats(sanctionedStats, stat.item_id, 'headshots', (Number(stat.value_vs) + Number(stat.value_nc) + Number(stat.value_tr)));
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
                else if(stat.stat_name == "weapon_fire_count" && includeInIVI(stat.item_id)){
                    sanctionedStats = populateStats(sanctionedStats, stat.item_id, 'shots', Number.parseInt(stat.value));
                }
                else if(stat.stat_name == "weapon_hit_count" && includeInIVI(stat.item_id)){
                    sanctionedStats = populateStats(sanctionedStats, stat.item_id, 'hits', Number.parseInt(stat.value));
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
        // IVI calculations
        let infantryKills = 0;
        let infantryHeadshots = 0;
        let infantryShots = 0;
        let infantryHits = 0;
        for(const id in sanctionedStats){
            if(sanctionedStats[id].kills && sanctionedStats[id].kills > 50){
                infantryKills += sanctionedStats[id].kills;
                infantryHeadshots += sanctionedStats[id].headshots || 0;
                infantryShots += sanctionedStats[id].shots;
                infantryHits += sanctionedStats[id].hits;
            }
        }
        resObj.infantryKills = infantryKills;
        resObj.infantryHeadshots = infantryHeadshots;
        resObj.infantryShots = infantryShots;
        resObj.infantryHits = infantryHits;
        
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
    return resObj;
}

/**
 * Checks if character has ASP
 * @param {string} cName - Character name
 * @param {string} platform - platform character is on
 * @returns true if character is ASP
 */
const checkASP = async function(cName, platform){
    let response = await censusRequest(platform, 'character_list', `/character?name.first_lower=${cName}&c:resolve=item_full&c:lang=en`);
    let data = response[0];
    let aspTitle = false;
    for (const item of data.items){
        if(Number(item.item_id) == 6004399){
            aspTitle = true;
            break;
        }
    }
    return aspTitle;
}

/**
 * Get all the characters kills for sanctioned weapons
 * @param sanctionedStats - Object containing stats for IVI 
 * @param {string} id - item id
 * @param {string} key - key to add to object
 * @param {number} value - value to add to sanctionedStats 
 * @returns all the kills,
 */
const populateStats = function(sanctionedStats, id, key, value){
    if(id in sanctionedStats){
        sanctionedStats[id][key] = value;
    }
    else{
        sanctionedStats[id] = {};
        sanctionedStats[id][key] = value;
    }
    return sanctionedStats;
}

/**
 * Only certain weapons are infantry sanctioned and count for characters stats. Checks if weapon is infantry sanctioned
 * @param {string} ID - item id 
 * @returns true if weapon ID is sanctioned
 */
const includeInIVI = function(ID){
    if(ID in sanction && sanction[ID].sanction == "infantry"){
        return true;
    }
    return false;
}

/**
 * get weapon name from item id
 * @param {number} ID - item id 
 * @param {string} platform - platform to request
 * @returns {Promise<string>} the weapon name
 * @throws if weapon cannot be found
 */
const getWeaponName = async function(ID, platform){
    // Returns the name of the weapon ID specified.  If the Census API is unreachable it will fall back to the fisu api
    if(typeof(weapons[ID]) !== 'undefined'){
        return weapons[ID].name;
    }
    let response = await censusRequest(platform, 'item_list', `/item/${ID}`)
    if(response.length==1){
        return response.item_list[0].name.en;
    }
    let URI = 'https://ps2.fisu.pw/api/weapons/?id='+ID; //Fallback Fisu URI
    const request = await fetch(URI);
    const fisuResponse = await request.json();
    if(typeof(fisuResponse[ID]) !== 'undefined'){
        return fisuResponse[ID].name;
    }
    if(ID in sanction){
        return sanction[ID].name;
    }

    throw "Not found";
}

/**
 * Get vehicle name from vehicle id
 * @param {string} ID - item id
 * @param {string} platform - platform to request
 * @returns the vechicle name
 * @throws if vehicle cannot be found
 */
const getVehicleName = async function(ID, platform){
    if(typeof(vehicles[ID]) !== 'undefined'){
        return vehicles[ID].name;
    }
    let response = await censusRequest(platform, 'vehicle_list', `/vehicle/${ID}`);
    if(response.returned==1){
        return response.vehicle_list[0].name.en;
    }

    throw "Not found";
}

/**
 * Get the number of auraxium's a character has
 * @param {string} cName 
 * @param {string} platform 
 * @returns the number of auraxium's
 */
const getAuraxiumCount = async function(cName, platform){
    // Calculates the number of Auraxium medals a specified character has
    let response = await censusRequest(platform, 'character_list', `/character?name.first_lower=${cName}&c:join=characters_achievement^list:1^outer:0^hide:character_id%27earned_count%27start%27finish%27last_save%27last_save_date%27start_date(achievement^terms:repeatable=0^outer:0^show:name.en%27description.en)`);
    let medalCount = 0;
    if(typeof(response) === 'undefined' || typeof(response[0]) === 'undefined'){
        return "Error"; // TODO: Verify if resolve is correct
    }
    let achievementList = response[0].character_id_join_characters_achievement;
    for(const x of achievementList){
        const achievement = x.achievement_id_join_achievement;
        if(achievement != undefined && x.finish_date != "1970-01-01 00:00:00.0"){
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
    return medalCount;
}

/**
 * Get recent stats of a character
 * @param {string} cID - character id
 * @param {string} platform - platform to request
 * @param {string} days - number of days to look back
 * @returns the recent stats of the character from that time frame
 * @throws if unable to get stats
 */
const recentStatsInfo =  async function(cID, platform, days){
    const response = await censusRequest(platform, 'character_list', `/character/${cID}?c:resolve=stat_history&c:join=title,characters_stat^list:1`);
    const data = response[0];
    let resObj = {
        name: data.name.first,
        br: data.battle_rank.value,
        prestige: data.prestige_level,
        server: data.world_id,
        lastLogin: data.times.last_login,
        faction: data.faction_id,
        lastSave: data.times.last_save,
        kills: 0,
        deaths: 0,
        time: 0,
        score: 0,
        certs: 0,
        battle_rank: 0
    };
    if(data.stats?.stat_history == undefined){
        throw "Unable to retrieve stat history";
    }
    for(const stat of data.stats.stat_history){
        let current = 0;
        let currentDays = Number.parseInt(days);
        for(const day in stat.day){
            current += Number.parseInt(stat.day[day]);
            currentDays -= 1;
            if(currentDays <= 0){
                break;
            }
        }
        if(stat.stat_name in resObj){
            resObj[stat.stat_name] = current;
        }
        
    }
    return resObj;
}

module.exports = {
    /**
     * Create a discord embed of an overview of a character lifetime stats
     * @param {string} cName - character name
     * @param {string} platform - platform to request
     * @param {string} locale - locale to use
     * @returns a discord embed with the character info
     * @throws if `cName` contains invalid characters
     */
    character: async function(cName, platform, locale="en-US"){
        // Calls function to get basic info, extracts info from returned object and constructs the Discord embed to send
        if(badQuery(cName)){
			throw "Character search contains disallowed characters";
		}
        
        const cInfo = await basicInfo(cName, platform);
        let resEmbed = new Discord.MessageEmbed();
        const row = new Discord.MessageActionRow()
        row.addComponents(
            new Discord.MessageButton()
                .setCustomId(`recentStats%30%${cInfo.characterID}%${platform}`)
                .setLabel(i18n.__({phrase: '30 day stats', locale: locale}))
                .setStyle('PRIMARY'),
            new Discord.MessageButton()
                .setCustomId(`recentStats%7%${cInfo.characterID}%${platform}`)
                .setLabel(i18n.__({phrase: '7 day stats', locale: locale}))
                .setStyle('PRIMARY'),
            new Discord.MessageButton()
                .setCustomId(`recentStats%1%${cInfo.characterID}%${platform}`)
                .setLabel(i18n.__({phrase: '1 day stats', locale: locale}))
                .setStyle('PRIMARY')
        );

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
            resEmbed.addField(i18n.__({phrase: 'BR', locale: locale}), cInfo.br+"~"+cInfo.prestige, true);
        }
        else{
            resEmbed.addField(i18n.__({phrase: 'BR', locale: locale}), cInfo.br, true);
        }

        // Decal thumbnail
        if(cInfo.prestige == "1"){
            resEmbed.setThumbnail("http://census.daybreakgames.com/files/ps2/images/static/88685.png");
        }
        else if (cInfo.prestige == "2"){
            resEmbed.setThumbnail("http://census.daybreakgames.com/files/ps2/images/static/94469.png");
        }
        else if (parseInt(cInfo.br) > 100){
            resEmbed.setThumbnail(`http://census.daybreakgames.com/files/ps2/images/static/${85033+(parseInt(cInfo.br)-100)}.png`);
        }
        else if (cInfo.faction == "1"){ //vs
            resEmbed.setThumbnail(`http://census.daybreakgames.com/files/ps2/images/static/${decals.vs[parseInt(cInfo.br)]}.png`);
        }
        else if (cInfo.faction == "2"){ //nc
            resEmbed.setThumbnail(`http://census.daybreakgames.com/files/ps2/images/static/${decals.nc[parseInt(cInfo.br)]}.png`);
        }
        else if (cInfo.faction == "3"){ //tr
            resEmbed.setThumbnail(`http://census.daybreakgames.com/files/ps2/images/static/${decals.tr[parseInt(cInfo.br)]}.png`);
        }
        else{ //nso
            resEmbed.setThumbnail(`http://census.daybreakgames.com/files/ps2/images/static/${90110+Math.floor(parseInt(cInfo.br)/10)}.png`);
        }

        // Score, SPM
        if(cInfo.stat_history){
            resEmbed.addField(i18n.__({phrase: 'Score (SPM)', locale: locale}), parseInt(cInfo.score).toLocaleString(locale)+" ("+localeNumber(cInfo.score/cInfo.playTime, locale)+")", true);
        }

        // Server
        resEmbed.addField(i18n.__({phrase: 'Server', locale: locale}), i18n.__({phrase: serverNames[Number(cInfo.server)], locale: locale}), true);

        // Playtime
        const hours = Math.floor(cInfo.playTime/60);
        const minutesPlayed = cInfo.playTime - hours*60;
        resEmbed.addField(i18n.__({phrase: 'Playtime', locale: locale}), 
        `${i18n.__mf({phrase: "{hour} hours, {minute} minutes", locale: locale}, 
        {hour: localeNumber(hours, locale), minute: minutesPlayed})}`, true);
        
        // KD, KPM
        if(cInfo.stat_history){
            resEmbed.addField(i18n.__({phrase: 'K/D', locale: locale}), localeNumber(cInfo.kills/cInfo.deaths, locale), true);
            resEmbed.addField(i18n.__({phrase: 'KPM', locale: locale}), localeNumber(cInfo.kills/cInfo.playTime, locale), true);
            resEmbed.addField(i18n.__({phrase: 'K-D Diff', locale: locale}), `${Number.parseInt(cInfo.kills).toLocaleString(locale)} - ${Number.parseInt(cInfo.deaths).toLocaleString(locale)} = ${(cInfo.kills-cInfo.deaths).toLocaleString(locale, {signDisplay: "exceptZero"})}`, true);
        }

        // IVI Score
        if(typeof(cInfo.infantryHeadshots) !== 'undefined' && typeof(cInfo.infantryHits) !== 'undefined'){
            let accuracy = cInfo.infantryHits/cInfo.infantryShots;
            let hsr = cInfo.infantryHeadshots/cInfo.infantryKills;
            resEmbed.addField(i18n.__({phrase: 'IVI Score', locale: locale}), `${Math.round(accuracy*hsr*10000)}`, true);
        }

        // Online status
        if (cInfo.online == "service_unavailable"){
            resEmbed.addField(i18n.__({phrase: 'Online', locale: locale}), 'Service unavailable', true);
        }
        else if (cInfo.online >= 1){
            resEmbed.addField(i18n.__({phrase: 'Online', locale: locale}), ':white_check_mark:', true);
        }
        else{
            resEmbed.addField(i18n.__({phrase: 'Online', locale: locale}), ':x:', true);
        }
        resEmbed.addField(i18n.__({phrase: 'Last Login', locale: locale}), `<t:${cInfo.lastLogin}:R>`, true);

        const factionInfo = faction(cInfo.faction);
        resEmbed.addField(i18n.__({phrase: 'Faction', locale: locale}), `${factionInfo.decal} ${i18n.__({phrase: factionInfo.initial, locale: locale})}`, true);

        resEmbed.setColor(factionInfo.color);

        // Outfit info
        if(cInfo.inOutfit){
            if(cInfo.outfitAlias != "" && platform == 'ps2:v2'){
                resEmbed.addField(i18n.__({phrase: 'Outfit', locale: locale}), '[['+cInfo.outfitAlias+']](https://ps2.fisu.pw/outfit/?name='+cInfo.outfitAlias+') '+cInfo.outfitName, true);
            }
            else if(cInfo.outfitAlias != "" && platform == 'ps2ps4us:v2'){
                resEmbed.addField(i18n.__({phrase: 'Outfit', locale: locale}), '[['+cInfo.outfitAlias+']](https://ps4us.ps2.fisu.pw/outfit/?name='+cInfo.outfitAlias+') '+cInfo.outfitName, true);
            }
            else if(cInfo.outfitAlias != "" && platform == 'ps2ps4eu:v2'){
                resEmbed.addField(i18n.__({phrase: 'Outfit', locale: locale}), '[['+cInfo.outfitAlias+']](https://ps4eu.ps2.fisu.pw/outfit/?name='+cInfo.outfitAlias+') '+cInfo.outfitName, true);
            }
            else{
                resEmbed.addField(i18n.__({phrase: 'Outfit', locale: locale}), cInfo.outfitName, true);
            }
            resEmbed.addField(i18n.__({phrase: 'Outfit Rank', locale: locale}), `${cInfo.outfitRank} (${cInfo.outfitRankOrdinal})`, true);
            row.addComponents(
                new Discord.MessageButton()
                    .setCustomId(`outfit%${cInfo.outfitID}%${platform}`)
                    .setLabel(i18n.__({phrase: 'View outfit', locale: locale}))
                    .setStyle('PRIMARY')
            );
        }

        // Top Weapon, Auraxium medals
        if(cInfo.stats){
            if(cInfo.topWeaponName != "Error"){
                resEmbed.addField(i18n.__({phrase: 'Top Weapon (kills)', locale: locale}), cInfo.topWeaponName+" ("+localeNumber(cInfo.mostKills, locale)+")", true);
            }
            if(cInfo.auraxCount != "Error"){
                resEmbed.addField(i18n.__({phrase: 'Auraxium Medals', locale: locale}), `${cInfo.auraxCount}`, true);
            }
        }

        // Top class
        if(typeof(cInfo.topClass) !== 'undefined'){
            const classHours = Math.floor(cInfo.topTime/60/60);
            const classMinutes = Math.floor(cInfo.topTime/60 - classHours*60);
            let className = " ";
            switch(cInfo.topClass){
                case "1":
                    className = i18n.__({phrase: 'Infiltrator', locale: locale});
                    break;
                case "3":
                    className = i18n.__({phrase: 'Light Assault', locale: locale});
                    break;
                case "4":
                    className = i18n.__({phrase: 'Medic', locale: locale});
                    break;
                case "5":
                    className = i18n.__({phrase: 'Engineer', locale: locale});
                    break;
                case "6":
                    className = i18n.__({phrase: 'Heavy Assault', locale: locale});
                    break;
                case "7":
                    className = i18n.__({phrase: 'MAX', locale: locale});
                    break;
            }
            resEmbed.addField(i18n.__({phrase: 'Most Played Class (time)', locale: locale}), 
            `${className} (${i18n.__mf({phrase: "{hour}h, {minute}m", locale: locale}, {hour: localeNumber(classHours, locale), minute: classMinutes})})`, true);
        }

        // Favorite vehicle
        if(typeof(cInfo.favoriteVehicle) !== 'undefined' && cInfo.favoriteVehicle != 0){
            const vehicleHours = Math.floor(cInfo.topVehicleTime/60/60);
            const vehicleMinutes = Math.floor(cInfo.topVehicleTime/60 - vehicleHours*60);
            try{
                let vehicleName = await getVehicleName(cInfo.favoriteVehicle, platform);
                resEmbed.addField(i18n.__({phrase: 'Most Played Vehicle (time)', locale: locale}), 
                `${i18n.__({phrase: vehicleName, locale: locale})} (${i18n.__mf({phrase: "{hour}h, {minute}m", locale: locale}, {hour: localeNumber(vehicleHours, locale), minute: vehicleMinutes})})`, true);
            }
            catch(err){
                //Fail silently
            }
        }
        return [resEmbed, [row]];
    },

    /**
     * Get the recent stats of a player
     * @param {string} cID - Character ID
     * @param {string} platform - Platform
     * @param {string} days - Number of days to look back
     * @param {string} locale - Locale to use
     * @returns a discord embed of  the character's recent stats
     * @throws if there are no stats in the time period `days`
     */
    recentStats: async function(cID, platform, days, locale="en-US"){
        const cInfo = await recentStatsInfo(cID, platform, days);
        if(cInfo.time == 0){
            throw i18n.__({phrase: 'No stats in this time period', locale: locale});
        }
        const resEmbed = new Discord.MessageEmbed();
        resEmbed.setTitle(cInfo.name);
        resEmbed.setDescription(i18n.__mf({phrase: '{day} day stats ending <t{end}d>', locale: locale}, {day: days, end: `:${cInfo.lastSave}:`}));
        resEmbed.setColor(faction(cInfo.faction).color);
        resEmbed.addField(i18n.__({phrase: 'Score (SPM)', locale: locale}), `${cInfo.score.toLocaleString(locale)} (${localeNumber(cInfo.score/(cInfo.time/60), locale)})`, true);
        const hours = Math.floor(cInfo.time/60/60);
        const minutes = Math.floor(cInfo.time/60 - hours*60);
        resEmbed.addField(i18n.__({phrase: 'Playtime', locale: locale}), i18n.__mf({phrase: "{hour} hours, {minute} minutes", locale: locale}, {hour: localeNumber(hours, locale), minute: minutes}), true);
        resEmbed.addField(i18n.__({phrase: 'Certs Gained', locale: locale}), cInfo.certs.toLocaleString(locale), true);
        resEmbed.addField(i18n.__({phrase: 'K/D', locale: locale}), localeNumber(cInfo.kills/cInfo.deaths, locale), true);
        resEmbed.addField(i18n.__({phrase: 'K-D Diff', locale: locale}), `${(cInfo.kills).toLocaleString(locale)} - ${(cInfo.deaths).toLocaleString(locale)} = ${(cInfo.kills-cInfo.deaths).toLocaleString(locale, {signDisplay: "exceptZero"})}`, true);
        resEmbed.addField(i18n.__({phrase: 'KPM', locale: locale}), localeNumber(cInfo.kills/(cInfo.time/60), locale), true);
        return resEmbed;     
    },

    getWeaponName: getWeaponName
}