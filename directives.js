// This file defines functions to look up a list of a character's completed directives

const {censusRequest, faction, platformURL} = require('./utils.js');
const Discord = require('discord.js');
const directives = require('./static/directives.json');
const i18n = require('i18n');

const getDirectiveList = async function(cName, platform, locale="en-US"){
	let nameResponse = await censusRequest(platform, 'character_list', `/character?name.first_lower=${cName}`);
	if(nameResponse.length == 0){
        throw i18n.__mf({phrase: "{name} not found", locale: locale}, {name: cName});
    }
	const characterId = nameResponse[0].character_id;
	let response = await censusRequest(platform, 'characters_directive_tree_list', `characters_directive_tree?character_id=${characterId}&c:limit=500`);
	let directiveList = [];
	for(const dir of response){
		if(dir.completion_time != 0){
			directiveList.push([dir.directive_tree_id, dir.completion_time]);
		}
	}

	directiveList.sort((a,b) => b[1] - a[1]);
	return {
		name: nameResponse[0].name.first, 
		faction: nameResponse[0].faction_id, 
		directives: directiveList
	};
}

module.exports = {
	directives: async function(cName, platform, expanded=false, locale="en-US"){
		const directiveList = await getDirectiveList(cName.toLowerCase(), platform, locale);
		let resEmbed = new Discord.MessageEmbed();
		resEmbed.setTitle(i18n.__mf({phrase: "{name} Directives", locale: locale}, {name: directiveList.name}));
		let textList = "";
		let remaining = directiveList.directives.length;
		if(remaining == 0){
			throw i18n.__mf({phrase: "{name} has not completed any directives", locale: locale}, {name: directiveList.name})
		}
		if(expanded){
			remaining = 0
			for(const dir of directiveList.directives){
				textList += `<t:${dir[1]}:d>: ${directives[dir[0]].name}\n`;
			}
			resEmbed.setDescription(textList);
		}
		else{
			let max = 20;
			if(remaining <= 25){
				//This is just to avoid returning a list that says "and 1 more", it'll always be at least 5 more
				max = 25;
			}
			for(const dir of directiveList.directives){
				if(max == 0){
					textList += i18n.__mf({phrase: "And {num} more", locale: locale}, {num: remaining});
					break;
				}
				if(dir[0] in directives){
					textList += `<t:${dir[1]}:d>: ${directives[dir[0]].name}\n`;
				}
				else{
					console.log(`Missing directive id ${dir[0]}`);
				}
				remaining -= 1;
				max -= 1
			}
			resEmbed.setDescription(textList);
		}
		resEmbed.setColor(faction(directiveList.faction).color)
		resEmbed.setThumbnail('https://census.daybreakgames.com/files/ps2/images/static/84283.png');
		resEmbed.setURL(`${platformURL[platform]}/directive/?name=${directiveList[0]}`)
		if(remaining > 0){
			const row = new Discord.MessageActionRow()
			row.addComponents(
				new Discord.MessageButton()
					.setCustomId(`directives%${directiveList.name}%${platform}`)
					.setLabel(i18n.__({phrase: "View all", locale: locale}))
					.setStyle('PRIMARY')
			);
			return [resEmbed, [row]]
		}
		else{
			return [resEmbed, []];
		}
	}
}
