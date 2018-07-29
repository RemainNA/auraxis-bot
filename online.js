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
			if (data.outfit_list[0] == null){
				channel.send("["+oTag+"] not found");
				callback();
			}
			else{
				resOut = data.outfit_list[0];
				var onArray = [];
				if(resOut.members[0].online_status != "service_unavailable"){
					for (x in resOut.members){
						if (resOut.members[x].online_status >= 1){
							onArray.push(resOut.members[x].name.first);
						}	
					}
					if(onArray.length == 0){
						onArray.push(':x:');
					}
					onArray.sort();
					sendEmbed = new Discord.RichEmbed();
					sendEmbed.setTitle(resOut.name);
					sendEmbed.setDescription(resOut.alias);
					sendEmbed.addField('Online', onArray);
				}
				else{
					sendEmbed = new Discord.RichEmbed();
					sendEmbed.setTitle(resOut.name);
					sendEmbed.setDescription(resOut.alias);
					sendEmbed.addField('Error', "Online status service unavailable");
				}
				
				if (resOut.leader_character_id_join_character.faction_id == "1") //vs
				{
					sendEmbed.setColor('PURPLE');
				}
				else if (resOut.leader_character_id_join_character.faction_id == "2") //nc
				{
					sendEmbed.setColor('BLUE');
				}
				else //tr
				{
					sendEmbed.setColor('RED');
				}
				channel.send(sendEmbed);
				callback();
			}
		})
	}
	catch(e){
		channel.send('An error occured');
		callback();
	}

})



q.drain = function() {
	console.log('done');
}

module.exports = {
	outfitLookup: function (oTag, channel) {
		tags = oTag.split(" ");
		for (x in tags){
			if(tags[x] != ""){
				console.log(tags[x]+" online");
				q.push({tag: tags[x], inChannel: channel}, function (err) {
				});
			}
		}
	}
}