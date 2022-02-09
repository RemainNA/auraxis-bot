// This file defines functions to look up a list of a character's completed directives

const {censusRequest} = require('./utils.js');
const Discord = require('discord.js');
const directives = require('./static/directives.json');

const getDirectiveList = async function(cName, platform){
	let nameResponse = await censusRequest(platform, 'character_list', `/character?name.first_lower=${cName}`);
	if(nameResponse.length == 0){
        throw `${cName} not found`;
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
	directives: async function(cName, platform, expanded=false){
		const directiveList = await getDirectiveList(cName.toLowerCase(), platform);
		let resEmbed = new Discord.MessageEmbed();
		resEmbed.setTitle(`${directiveList.name} Directives`);
		let textList = "";
		let remaining = directiveList.directives.length;
		if(remaining == 0){
			throw `${directiveList.name} has not completed any directives`
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
					textList += `And ${remaining} more`;
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
		if (directiveList.faction == "1"){ //vs
            resEmbed.setColor('PURPLE');
        }
        else if (directiveList.faction == "2"){ //nc
            resEmbed.setColor('BLUE');
        }
        else if (directiveList.faction == "3"){ //tr
            resEmbed.setColor('RED');
        }
        else{ //NSO
            resEmbed.setColor('GREY');
        }
		resEmbed.setThumbnail('https://census.daybreakgames.com/files/ps2/images/static/84283.png');
		if(platform == 'ps2:v2'){
			resEmbed.setURL(`https://ps2.fisu.pw/directive/?name=${directiveList[0]}`)
		}
		else if(platform == 'ps2ps4us:v2'){
			resEmbed.setURL(`https://ps4us.ps2.fisu.pw/directive/?name=${directiveList[0]}`)
		}
		else if(platform == 'ps2ps4eu:v2'){
			resEmbed.setURL(`https://ps4eu.ps2.fisu.pw/directive/?name=${directiveList[0]}`)
		}
		if(remaining > 0){
			const row = new Discord.MessageActionRow()
			row.addComponents(
				new Discord.MessageButton()
					.setCustomId(`directives%${directiveList.name}%${platform}`)
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
