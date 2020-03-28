// This file implements a function that returns the online members in a specified outfit

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
			if (data.outfit_list == null || data.returned == 0){
				channel.send("["+oTag+"] not found").then(function(result){
					
				}, function(err) {
					console.log("Insufficient permissions on !online not found");
					console.log(channel.guild.name);
				});
				callback();
			}
			else{
				resOut = data.outfit_list[0];
				var onArray = [];
				if(resOut.members[0].online_status != "service_unavailable"){
					for (x in resOut.members){
						//Iterate through member list, record names of those online
						if (resOut.members[x].online_status >= 1){
							onArray.push(resOut.members[x].name.first);
						}	
					}
					if(onArray.length == 0){
						//send big red x if nobody is online
						onArray.push(':x:');
					}
					onArray.sort(); //sort alphabetically
					sendEmbed = new Discord.RichEmbed(); //create Discord rich embed to send
					sendEmbed.setTitle(resOut.name);
					sendEmbed.setDescription(resOut.alias);
					sendEmbed.addField('Online', onArray);
				}
				else{
					//When the API itself is out, send message indicating that
					sendEmbed = new Discord.RichEmbed();
					sendEmbed.setTitle(resOut.name);
					sendEmbed.setDescription(resOut.alias);
					sendEmbed.addField('Error', "Online status service unavailable");
				}
				
				//color rich embed based on outfit faction
				if (resOut.leader_character_id_join_character.faction_id == "1") //vs
				{
					sendEmbed.setColor('PURPLE');
				}
				else if (resOut.leader_character_id_join_character.faction_id == "2") //nc
				{
					sendEmbed.setColor('BLUE');
				}
				else if (resOut.leader_character_id_join_character.faction_id == "3")//tr
				{
					sendEmbed.setColor('RED');
				}
				else //nso
				{
					sendEmbed.setColor('GREY');
				}
				channel.send(sendEmbed).then(function(result){
					
				}, function(err) {
					console.log("Insufficient permissions on !online");
					console.log(channel.guild.name);
				});
				callback();
			}
		})
	}
	catch(e){
		channel.send('An error occured').then(function(result){
			
		}, function(err) {
			console.log("Insufficient permissions on !online error");
			console.log(channel.guild.name);
		});
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