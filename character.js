const Discord = require('discord.js');
var got = require('got');

var basicInfo = async function(cName, platform){
    let uri = 'https://census.daybreakgames.com/s:'+process.env.serviceID+'/get/'+platform+'/character?name.first_lower='+cName+'&c:resolve=outfit_member_extended,online_status,world,stat_history,weapon_stat_by_faction&c:join=title';
    let response = await got(uri).json();
    if(response.error != undefined){
        return new Promise(function(resolve, reject){
            reject(response.error);
        })
    }
    if(response.statusCode == 404){
        return new Promise(function(resolve, reject){
            reject("API Unreachable");
        })
    }
    if(typeof(response.character_list[0]) != undefined && response.character_list[0]){
        let data = response.character_list[0];
        let resObj = {
            name: data.name.first,
            title: null,
            br: data.battle_rank.value,
            prestige: data.prestige_level,
            score: data.stats.stat_history[8].all_time,
            server: data.world_id,
            playTime: data.times.minutes_played,
            online: data.online_status,
            lastLogin: data.times.last_login_date,
            faction: data.faction_id,
            inOutfit: false,
            stats: false
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
            resObj.kills = data.stats.stat_history[5].all_time;
            resObj.deaths = data.stats.stat_history[2].all_time;
            topID = 0;
            mostKills = -1;
            weaponStat = data.stats.weapon_stat_by_faction;
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
            if(mostKills > 0){
                resObj.topWeaponName = await getWeaponName(topID, platform);
                if(mostKills > 1000){
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
            
        }
        return new Promise(function(resolve, reject){
            resolve(resObj);
        })
    }
    else{
        return new Promise(function(resolve, reject){
            reject("Not found");
        })
    }
}

var getWeaponName = async function(ID, platform){
    let URI = 'https://census.daybreakgames.com/s:'+process.env.serviceID+'/get/'+platform+'/item/'+ID;
    let response = await got(URI).json();
    if(response.returned==1){
        return new Promise(function(resolve, reject){
            resolve(response.item_list[0].name.en);
        })
    }
    else{
        return new Promise(function(resolve, reject){
            reject("Not found");
        })
    }
}

var getAuraxiumCount = async function(cName, platform){
    let URI = "http://census.daybreakgames.com/s:"+process.env.serviceID+"/get/"+platform+"/character?name.first_lower="+cName+"&c:join=characters_achievement^list:1^terms:earned_count=1^outer:0^hide:character_id%27earned_count%27start%27finish%27last_save%27last_save_date%27start_date(achievement^terms:repeatable=0^outer:0^show:name.en%27description.en)"
    let response = await got(URI).json();
    let medalCount = 0;
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
        try{
            cInfo = await basicInfo(cName, platform);
        }
        catch(error){
            console.log(error);
            return new Promise(function(resolve, reject){
                reject(error);
            })
        }
        let resEmbed = new Discord.RichEmbed();
        resEmbed.setTitle(cInfo.name);
        if(cInfo.title != null){
            resEmbed.setDescription(cInfo.title);
        }
        resEmbed.setURL('http://ps2.fisu.pw/player/?name='+cName);
        if(cInfo.prestige > 0){
            resEmbed.addField('BR', cInfo.br+"~"+cInfo.prestige, true);
        }
        else{
            resEmbed.addField('BR', cInfo.br, true);
        }
        resEmbed.addField('Score (SPM)', cInfo.score.toLocaleString()+" ("+Number.parseFloat(cInfo.score/cInfo.playTime).toPrecision(4)+")", true);
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
        hours = Math.floor(cInfo.playTime/60);
        minutesPlayed = cInfo.playTime - hours*60;
        resEmbed.addField('Playtime', hours+' hours, '+minutesPlayed+' minutes', true);
        if(cInfo.stats){
            resEmbed.addField('KD', Number.parseFloat(cInfo.kills/cInfo.deaths).toPrecision(3), true);
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
        if(cInfo.inOutfit){
            if(cInfo.outfitAlias != ""){
                resEmbed.addField('Outfit', '['+cInfo.outfitAlias+']'+' '+cInfo.outfitName, true);
            }
            else{
                resEmbed.addField('Outfit', cInfo.outfitName, true);
            }
            resEmbed.addField('Outfit Rank', cInfo.outfitRank, true);
        }
        if(cInfo.stats){

            resEmbed.addField('Top Weapon (kills)', cInfo.topWeaponName+" ("+cInfo.mostKills+")", true);
            resEmbed.addField('Auraxium medals', cInfo.auraxCount, true);
        }
        return new Promise(function(resolve, reject){
            resolve(resEmbed);
        })
    }
}