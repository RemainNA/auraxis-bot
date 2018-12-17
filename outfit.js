// Import the discord.js module
const Discord = require('discord.js');

// Import request for API access
var request = require('request');

// import async
var async = require('async');

var q = async.queue(function(task, callback) {
	oTag = task.tag;
	channel = task.inChannel;
	uri = 'http://census.daybreakgames.com/s:'+process.env.serviceID+'/get/ps2:v2/outfit?alias_lower='+oTag+'&c:resolve=member_character_name,member_online_status&c:join=character^on:leader_character_id^to:character_id';
	try{
		request(uri, function (error, response, body) {
			data = JSON.parse(body);
			if (data.outfit_list == null){
				channel.send("Tag not found");
				callback();
			}
			else{
				resOut = data.outfit_list[0];
				//create new discord rich embed object
				sendEmbed = new Discord.RichEmbed();
				sendEmbed.setTitle(resOut.name);
				sendEmbed.setDescription(resOut.alias); //include outfit tag
				sendEmbed.setURL('https://ps2.fisu.pw/outfit/?name='+oTag);
				sendEmbed.addField('Member count', resOut.member_count, true);
				memOn = 0; //members online
				if(resOut.members[0].online_status != "service_unavailable"){
					for (x in resOut.members){
						//iterate through members, count online
						if(resOut.members[x].online_status >= 1){
							memOn = memOn + 1;
						}
					}
					sendEmbed.addField('Online', memOn, true);
				}
				else{
					//indicate if unable to get online member info
					sendEmbed.addField('Online', 'Service unavailable',true);
				}
				
				try{
					//get info from outfit owner
					uri = 'https://census.daybreakgames.com/s:'+process.env.serviceID+'/get/ps2:v2/character/'+resOut.leader_character_id+'?c:resolve=world'
					options = {uri: uri, sendEmbed: sendEmbed, channel: channel};
					request(options, function(error, respose, body) {
						data2 = JSON.parse(body);
						if (data2.character_list[0] == null){
							//send rich embed if unable to pull outfit owner info
							channel.send(sendEmbed);
							callback();
						}
						else {
							resChar = data2.character_list[0];
							switch (resChar.world_id) //server
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
								case "25":
									sendEmbed.addField('Server', 'Briggs', true);
								case "40":
									sendEmbed.addField('Server', 'SolTech', true);
							}
							//change rich embed color based on faction
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
							else //tr
							{
								sendEmbed.addField('Faction', 'TR', true);
								sendEmbed.setColor('RED');
							}
							sendEmbed.addField('Owner', resChar.name.first, true);
							channel.send(sendEmbed);
							callback();
						}
					})
				}
				catch(e){
					channel.send(sendEmbed);
					callback();
				}
			}
		});
	}
	catch(e){
		console.log('pos 5')
		callback();
	}
		
});

q.drain = function(){
	console.log('done');
};
module.exports = {
	outfitLookup: function (oTag, channel) {
		q.push({tag: oTag, inChannel: channel}, function(err) {
			console.log(oTag);
		});
	}
}