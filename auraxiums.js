/**
 * This file defines functions to look up a list of a character's auraxium medals
 * @module auraxiums
 */

const {censusRequest, faction} = require('./utils.js');
const Discord = require('discord.js');
const sanction = require('./static/sanction.json');
const { localeNumber, characterLink } = require('./utils.js');
const i18n = require('i18n');

/**
 * Get a list of a character's Auraxium medals
 * @param {string} cName - The name of the character
 * @param {string} platform - platform of the character
 * @param {string} locale - The locale to use for the response 
 * @returns an object containing the character's name, faction, medals, and possible medals
 * @throws if `cName` is not a valid character name
 */
const getAuraxiumList = async function(cName, platform, locale='en-US'){
    // Calculates the number of Auraxium medals a specified character has
    let response = await censusRequest(platform, 'character_list', `/character?name.first_lower=${cName}&c:join=characters_achievement^list:1^outer:0^hide:character_id%27earned_count%27start%27finish%27last_save%27last_save_date%27start_date(achievement^terms:repeatable=0^outer:0^show:name.en%27description.en)&c:resolve=weapon_stat_by_faction`);
    let medalList = [];
	let confirmedMedals = [];
	let possibleMedals = [];
	let duplicateCheck = []; 
	// A separate duplicate check is used in order to check both the medal name and the date
	// due to shared weapon names e.g. MAX weapons
	if(response.length == 0){
		throw i18n.__mf({phrase: "{name} not found", locale: locale}, {name: cName});
	}
    let achievementList = response[0].character_id_join_characters_achievement;
    for(const x of achievementList){
        const achievement = x.achievement_id_join_achievement;
        if(achievement != undefined && x.finish_date != "1970-01-01 00:00:00.0"){
            if(achievement.description == undefined){
                if(achievement.name.en.indexOf("Auraxium") > -1){
					if(!duplicateCheck.includes(`${achievement.name.en.split(":")[0]}:${Date.parse(x.finish_date)}`)){
						medalList.push([achievement.name.en.split(":")[0], Date.parse(x.finish_date)]);
					}
					confirmedMedals.push(achievement.name.en.split(":")[0]);
					duplicateCheck.push(`${achievement.name.en.split(":")[0]}:${Date.parse(x.finish_date)}`);
                }
            }
            else if(achievement.description.en == "1000 Enemies Killed"){
				if(!duplicateCheck.includes(`${achievement.name.en.split(":")[0]}:${Date.parse(x.finish_date)}`)){
					medalList.push([achievement.name.en.split(":")[0], Date.parse(x.finish_date)]);
				}
				confirmedMedals.push(achievement.name.en.split(":")[0]);
				duplicateCheck.push(`${achievement.name.en.split(":")[0]}:${Date.parse(x.finish_date)}`);
            }
        }
    }

	let statList = response[0].stats?.weapon_stat_by_faction;
	for(const stat of statList){
		if(stat.stat_name == "weapon_kills" && stat.item_id != 0){
			const statValue = Number(stat.value_vs) + Number(stat.value_nc) + Number(stat.value_tr);
			if(statValue >= 1160 && !confirmedMedals.includes(sanction[stat.item_id]?.name)){
				possibleMedals.push(`${sanction[stat.item_id].name} (${localeNumber(statValue, locale)})`);
			}
		}
	}

	medalList.sort((a,b) => b[1] - a[1]);  //Chronological sort, newest first
    return {
		name: response[0].name.first,
		id: response[0].character_id, 
		faction: response[0].faction_id, 
		medals: medalList,
		possibleMedals: possibleMedals
	};
}

module.exports = {
	/**
	 * Create a discord embed with a list of a character's Auraxium medals
	 * @param {string} cName - The name of the character
	 * @param {string} platform - platform of the character
	 * @param {boolean} expanded - Whether to show the full list of possible medals
	 * @param {string} locale - The locale to use for the response 
	 * @returns a discord message containing the character's name, faction, medals, and possible medals
	 * @throws if `cName` has no Auraxium medals
	 */
	medals: async function(cName, platform, expanded=false, locale='en-US'){
		const medalList = await getAuraxiumList(cName.toLowerCase(), platform, locale);

		let resEmbed = new Discord.EmbedBuilder();
		resEmbed.setTitle(i18n.__mf({phrase: "{name} Auraxiums", locale: locale}, {name: medalList.name}));
		let textList = "**" + i18n.__mf({phrase: "auraxiumMedalCount", locale: locale}, {num: medalList.medals.length}) + "**\n";
		let remaining = medalList.medals.length + medalList.possibleMedals.length;
		if(remaining == 0){
			throw i18n.__mf({phrase: "{name} has no Auraxium medals", locale: locale}, {name: medalList.name});
		}
		if(expanded){
			let continued = false;
			remaining = 0;
			for(const medal of medalList.medals){
				const currentItem = `<t:${medal[1]/1000}:d>: ${medal[0]}\n`;
				if(!continued && (textList.length + currentItem.length) > 4000){
					continued = true;
					resEmbed.setDescription(textList);
					textList = currentItem;
				}
				else if(continued && (textList.length + currentItem.length) > 1024){
					resEmbed.addFields({name: i18n.__({phrase: "Continued...", locale: locale}), value: textList});
					textList = currentItem;
				}
				else{
					textList += currentItem;
				}
			}
			if(continued){
				resEmbed.addFields({name: i18n.__({phrase: "Continued...", locale: locale}), value: textList});
			}
			else{
				resEmbed.setDescription(textList);
			}

			textList = "";
			continued = false;

			for(const medal of medalList.possibleMedals){
				const currentItem = `${medal}\n`;
				if(!continued && (textList.length + currentItem.length) > 1024){
					continued = true;
					resEmbed.addFields({name: i18n.__mf({phrase: "possibleMedalCount", locale: locale}, {num: medalList.possibleMedals.length}), value: textList});
					textList = currentItem;
				}
				else if(continued && (textList.length + currentItem.length) > 1024){
					resEmbed.addFields({name: i18n.__({phrase: "Continued...", locale: locale}), value: textList});
					textList = currentItem;
				}
				else{
					textList += currentItem;
				}
			}
			if(continued){
				resEmbed.addFields({name: i18n.__({phrase: "Continued...", locale: locale}), value: textList});
			}
			else if(textList != ""){
				resEmbed.addFields({name: i18n.__mf({phrase: "possibleMedalCount", locale: locale}, {num: medalList.possibleMedals.length}), value: textList});
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
					textList += i18n.__mf({phrase: "And {num} more", locale: locale}, {num: remaining});
					break;
				}
				textList += `<t:${medal[1]/1000}:d>: ${medal[0]}\n`;
				remaining -= 1;
				max -= 1;
			}
			resEmbed.setDescription(textList);
			textList = "";

			if(remaining > 0 && max > 0){
				for(const medal of medalList.possibleMedals){
					if(max == 0){
						textList += i18n.__mf({phrase: "And {num} more", locale: locale}, {num: remaining});
						break;
					}
					textList += `${medal}\n`;
					remaining -= 1;
					max -= 1;
				}
				resEmbed.addFields({name: i18n.__mf({phrase: "possibleMedalCount", locale: locale}, {num: medalList.possibleMedals.length}), value: textList});
			}
		}
		resEmbed.setColor(faction(medalList.faction).color)
		resEmbed.setThumbnail('https://census.daybreakgames.com/files/ps2/images/static/3068.png');
		resEmbed.setURL(characterLink(medalList.name, medalList.id, platform, "weapons"));
		if(remaining > 0){
			const row = new Discord.ActionRowBuilder()
			row.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`auraxiums%${medalList.name}%${platform}`)
					.setLabel(i18n.__({phrase: "View all", locale: locale}))
					.setStyle(Discord.ButtonStyle.Primary)
			);
			return [resEmbed, [row]];
		}
		else{
			return [resEmbed, []];
		}
	}
}