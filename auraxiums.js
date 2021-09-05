// This file defines functions to look up a list of a character's auraxium medals

const {censusRequest} = require('./utils.js');
const Discord = require('discord.js');

const getAuraxiumList = async function(cName, platform){
    // Calculates the number of Auraxium medals a specified character has
    let response = await censusRequest(platform, 'character_list', `/character?name.first_lower=${cName}&c:join=characters_achievement^list:1^terms:earned_count=1^outer:0^hide:character_id%27earned_count%27start%27finish%27last_save%27last_save_date%27start_date(achievement^terms:repeatable=0^outer:0^show:name.en%27description.en)`);
    let medalList = [];
	if(response.length == 0){
		throw `${cName} not found`
	}
    let achievementList = response[0].character_id_join_characters_achievement;
    for(const x of achievementList){
        achievement = x.achievement_id_join_achievement;
        if(achievement != undefined){
            if(achievement.description == undefined){
                if(achievement.name.en.indexOf("Auraxium") > -1){
                    medalList.push([achievement.name.en, Date.parse(x.finish_date)]);
                }
            }
            else if(achievement.description.en == "1000 Enemies Killed"){
                medalList.push([achievement.name.en, Date.parse(x.finish_date)]);
            }
        }
    }

	medalList.sort((a,b) => b[1] - a[1]);  //Chronological sort, newest first
    return {
		name: response[0].name.first, 
		faction: response[0].faction_id, 
		medals: medalList
	};
}

module.exports = {
	medals: async function(cName, platform, expanded=false){
		const medalList = await getAuraxiumList(cName.toLowerCase(), platform);

		let resEmbed = new Discord.MessageEmbed();
		resEmbed.setTitle(`${medalList.name} Auraxiums`);
		let textList = "";
		let remaining = medalList.medals.length;
		if(remaining == 0){
			throw `${medalList.name} has no Auraxium medals`
		}
		if(expanded){
			let continued = false;
			remaining = 0
			for(const medal of medalList.medals){
				const currentItem = `<t:${medal[1]/1000}:d>: ${medal[0]}\n`;
				if(!continued && (textList.length + currentItem.length) > 4000){
					continued = true;
					resEmbed.setDescription(textList);
					textList = currentItem;
				}
				else if(continued && (textList.length + currentItem.length) > 1024){
					resEmbed.addField("Continued", textList);
					textList = currentItem;
				}
				else{
					textList += currentItem;
				}
			}
			if(continued){
				resEmbed.addField("Continued", textList);
			}
			else{
				resEmbed.setDescription(textList);
			}
		}
		else{
			let max = 20;
			if(remaining <= 25){
				//This is just to avoid returning a list that says "and 1 more", it'll always be at least 5 more
				max = 25;
			}
			for(const medal of medalList.medals){
				if(max == 0){
					textList += `And ${remaining} more`;
					break;
				}
				textList += `<t:${medal[1]/1000}:d>: ${medal[0]}\n`;
				remaining -= 1;
				max -= 1
			}
			resEmbed.setDescription(textList);
		}
		
		if (medalList.faction == "1"){ //vs
            resEmbed.setColor('PURPLE');
        }
        else if (medalList.faction == "2"){ //nc
            resEmbed.setColor('BLUE');
        }
        else if (medalList.faction == "3"){ //tr
            resEmbed.setColor('RED');
        }
        else{ //NSO
            resEmbed.setColor('GREY');
        }
		resEmbed.setThumbnail('https://census.daybreakgames.com/files/ps2/images/static/3068.png');
		if(platform == 'ps2:v2'){
			resEmbed.setURL(`https://ps2.fisu.pw/player/?name=${medalList.name}&show=weapons`)
		}
		else if(platform == 'ps2ps4us:v2'){
			resEmbed.setURL(`https://ps4us.ps2.fisu.pw/player/?name=${medalList.name}&show=weapons`)
		}
		else if(platform == 'ps2ps4eu:v2'){
			resEmbed.setURL(`https://ps4eu.ps2.fisu.pw/player/?name=${medalList.name}&show=weapons`)
		}
		if(remaining > 0){
			const row = new Discord.MessageActionRow()
			row.addComponents(
				new Discord.MessageButton()
					.setCustomId(`auraxiums%${medalList.name}%${platform}`)
					.setLabel('View all')
					.setStyle('PRIMARY')
			);
			return [resEmbed, [row]]
		}
		else{
			return [resEmbed, []];
		}
	}
}