// Import the discord.js module
const Discord = require('discord.js');

// Import request for API access
var request = require('request');

// auth file
var auth = require('./auth.json');

// import async
var async = require('async');

var q = async.queue(function(task, callback) {
	character_id = task.id;
	subList = task.sList;
	playerEvent = task.pEvent;
	uri = 'https://census.daybreakgames.com/s:'+auth.serviceID+'/get/ps2:v2/character/'+character_id+'?c:resolve=outfit_member'
	var options = {uri:uri, playerEvent:playerEvent, subList:subList}
	request(options, function (error, response, body) {
		data = JSON.parse(body);
		if (data.character_list[0] == null)
		{
			callback();
		}
		else{
			resChar = data.character_list[0];
			/*info[0] = resChar.name.first;
			info[2] = resChar.faction_id;*/
			if(resChar.outfit_member != null){
				//console.log(resChar.name.first);
				keys = Object.keys(subList);
				//console.log(keys);
				if (keys.indexOf(resChar.outfit_member.outfit_id) > -1)
				{
					sendEmbed = new Discord.RichEmbed();
					sendEmbed.setTitle(subList[resChar.outfit_member.outfit_id][0]+' '+playerEvent);
					sendEmbed.setDescription(resChar.name.first);
					sendEmbed.setColor(subList[resChar.outfit_member.outfit_id][1]);
					for (i = 2; i < subList[resChar.outfit_member.outfit_id].length; i++){
						subList[resChar.outfit_member.outfit_id][i].send(sendEmbed);
					}
					callback();
				}
				else{
					callback();
				}
			}
			else{
				callback();
			}
			
		}
	})
	
})

q.drain = function() {
	
}


module.exports = {
	check: function(character_id, subList, playerEvent){
		q.push({id: character_id, sList: subList, pEvent: playerEvent}, function(err) {
			
		})
	}
}