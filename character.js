// Import the discord.js module
const Discord = require('discord.js');

// Import request for API access
var request = require('request');

// import async
var async = require('async');

var q = async.queue(function(task, callback) {
	cName = task.name;
	channel = task.inChannel;
	uri = 'https://census.daybreakgames.com/s:'+process.env.serviceID+'/get/ps2:v2/character?name.first_lower='+cName+'&c:resolve=outfit_member_extended,online_status,world,stat_history,weapon_stat_by_faction&c:join=title'
	var options = {uri: uri, channel: channel};
	try{
		request(options, function (error, response, body) {
			data = JSON.parse(body);
			if (data.character_list == null || data.returned == 0)
			{
				channel.send("Character not found").then(function(result){
				
				}, function(err){
					console.log("Insufficient permissions on !character");
					console.log(channel.guild.name);
				});
				callback();
			}
			else{
				resChar = data.character_list[0]; //resChar = resulting character
				//create Discord rich embed object
				sendEmbed = new Discord.RichEmbed();
				
				//name
				sendEmbed.setTitle(resChar.name.first);
				
				//title
				if (resChar.title_id_join_title != null)
				{
					sendEmbed.setDescription(resChar.title_id_join_title.name.en);
				}
				
				//fisu URL
				sendEmbed.setURL('http://ps2.fisu.pw/player/?name='+cName);
				
				//BR, Prestige
				sendEmbed.addField('BR', resChar.battle_rank.value, true);
				sendEmbed.addField('Prestige', prestige = resChar.prestige_level, true);
				
				//server
				switch (resChar.world_id)
				{
					case "1":
						sendEmbed.addField('Server', 'Connery', true);
						break;
					case "10":
						sendEmbed.addField('Server', 'Miller', true);
						break;
					case "13":
						sendEmbed.addField('Server', 'Cobalt', true);
						break;
					case "17":
						sendEmbed.addField('Server', 'Emerald', true);
						break;
					case "19":
						sendEmbed.addField('Server', 'Jaeger', true);
						break;
					case "40":
						sendEmbed.addField('Server', 'SolTech', true);
				}
				
				//Playtime
				minutesPlayed = resChar.times.minutes_played;
				hours = Math.floor(minutesPlayed/60);
				minutesPlayed = minutesPlayed - hours*60;
				sendEmbed.addField('Playtime', hours+' hours, '+minutesPlayed+' minutes', true);
				
				//KD
				if(resChar.stats != undefined && resChar.stats.stat_history != null){
					kills = resChar.stats.stat_history[5].all_time;
					deaths = resChar.stats.stat_history[2].all_time;
					ratio = Number.parseFloat(kills/deaths).toPrecision(3);  //sets to 3 sig figs
					sendEmbed.addField('KD', ratio, true);
				}
				
				//Online Status
				if (resChar.online_status == "service_unavailable"){
					sendEmbed.addField('Online', 'Service unavailable', true);
				}
				else if (resChar.online_status >= 1){
					sendEmbed.addField('Online', ':white_check_mark:', true);
				}
				else{
					sendEmbed.addField('Online', ':x:', true);
				}
				
				//Last login
				sendEmbed.addField('Last Login', resChar.times.last_login_date.substring(0,10), true);
				
				//Faction
				if (resChar.faction_id == "1") //vs
				{
					sendEmbed.addField('Faction', 'VS', true);
					sendEmbed.setColor('PURPLE');
				}
				else if (resChar.faction_id == "2") //nc
				{
					sendEmbed.addField('Faction', 'NC', true);
					sendEmbed.setColor('BLUE');
				}
				else if (resChar.faction_id == "3") //tr
				{
					sendEmbed.addField('Faction', 'TR', true);
					sendEmbed.setColor('RED');
				}
				else //NSO
				{
					sendEmbed.addField('Faction', 'NSO', true);
					sendEmbed.setColor('GREY');
				}
				
				//Outfit & rank
				if (resChar.outfit_member != null)
				{
					sendEmbed.addField('Outfit', '['+resChar.outfit_member.alias+'] '+resChar.outfit_member.name, true);
					sendEmbed.addField('Outfit Rank', resChar.outfit_member.member_rank, true);
				}
				
				//Top Weapon
				topID = '';
				topNum = -1;
				//Auraxium medals
				medalCount = 0;
				if(resChar.stats != undefined){
					weaponStat = resChar.stats.weapon_stat_by_faction;
					//iterate through weapons, find max value
					for (x in weaponStat)
					{
						if (weaponStat[x].stat_name == "weapon_kills" && weaponStat[x].item_id != "0")
						{
							item_num = Number(weaponStat[x].value_vs) + Number(weaponStat[x].value_nc) + Number(weaponStat[x].value_tr);
							if (item_num > topNum){
								topNum = item_num;
								topID = weaponStat[x].item_id;
							}
						}
					}
					try{
						//get weapon info, add to rich embed and send
						weapURI = 'https://census.daybreakgames.com/s:'+process.env.serviceID+'/get/ps2:v2/item/'+topID;
						var options = {uri: weapURI, sendEmbed: sendEmbed, topNum: topNum, channel: channel}
						request(options, function(error, response, body){
							weapData = JSON.parse(body);
							topName = weapData.item_list[0].name.en;
							if(topNum > 0){
								sendEmbed.addField('Top Weapon (kills)', topName+" ("+topNum+")", true);
							}
						})
						if(topNum > 10){
							//Ensure character has at least a bronze medal to avoid crash
							auraxURI = "http://census.daybreakgames.com/s:"+process.env.serviceID+"/get/ps2:v2/character?name.first_lower="+cName+"&c:join=characters_achievement^list:1^terms:earned_count=1^outer:0^hide:character_id%27earned_count%27start%27finish%27last_save%27last_save_date%27start_date(achievement^terms:repeatable=0^outer:0^show:name.en%27description.en)"
							var options = {uri: auraxURI, sendEmbed: sendEmbed, topNum: topNum, channel: channel}
							request(options, function(error, response, body){
								outputData = JSON.parse(body);
								achievementList = outputData.character_list[0].character_id_join_characters_achievement;
								for(x in achievementList){
									achievement = achievementList[x].achievement_id_join_achievement;
									if(achievement.description == undefined){
										if(achievement.name.en.indexOf("Auraxium") > -1){
											medalCount++;
										}
									}
									else if(achievement.description.en == "1000 Enemies Killed"){
										medalCount++;
									}
								}
								sendEmbed.addField('Auraxium Medals', medalCount, true);
								channel.send(sendEmbed).then(function(result){
									
								}, function(err) {
									console.log("Insufficient permissions on !character, with top weapon");
									console.log(channel.guild.name);
								});
								callback();
							})
						}
						else{
							sendEmbed.addField('Auraxium Medals', "0", true);
							channel.send(sendEmbed).then(function(result){
								
							}, function(err) {
								console.log("Insufficient permissions on !character, with top weapon");
								console.log(channel.guild.name);
							});
							callback();
						}
					}
					catch(e){
						//send rich embed without top weapon if it fails
						console.log(e);
						channel.send(sendEmbed).then(function(result){
							
						}, function(err) {
							console.log("Insufficient permissions on !character, without top weapon 1");
							console.log(channel.guild.name);
						});
						callback();
					}
				}
				else{
					channel.send(sendEmbed).then(function(result){
						
					}, function(err) {
						console.log("Insufficient permissions on !character, without top weapon 2");
						console.log(channel.guild.name);
					});
					callback();
				}
			}
		})
	}
	catch(e) {
		console.log('character error');
		channel.send('An error occured');
		callback();
	};
});

q.drain = function() {
	console.log('Done');
}
module.exports = {
	//external files call this, which then calls the code above
	characterLookup: function (cName, channel) {
		q.push({name: cName, inChannel: channel}, function(err) {
			console.log(cName);
		});
	}
}