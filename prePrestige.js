// Import the discord.js module
const Discord = require('discord.js');

// Import request for API access
var request = require('request');

// auth file
var auth = require('./auth.json');

// import async
var async = require('async');

var q = async.queue(function(task, callback){
	cName = task.chr;
	message = task.msg;
	uri = 'https://census.daybreakgames.com/s:'+auth.serviceID+'/get/ps2:v2/character?name.first_lower='+cName+'&c:resolve=item_full&c:lang=en';
	try{
		request(uri, function (error, response, body) {
			data = JSON.parse(body)
			if (data.character_list[0] == null)
			{
				message.channel.send("Character not found");
				callback();
			}
			else if (data.character_list[0].prestige_level == "0"){
				message.channel.send("Character has not yet prestiged");
				callback();
			}
			else{
				resChar = data.character_list[0];
				sendEmbed = new Discord.RichEmbed();
				sendEmbed.setTitle(resChar.name.first);
				if (resChar.faction_id == "1") //vs
				{
					sendEmbed.setColor('PURPLE');
				}
				else if (resChar.faction_id == "2") //nc
				{
					sendEmbed.setColor('BLUE');
				}
				else //tr
				{
					sendEmbed.setColor('RED');
				}
				decals = [];
				for (x in resChar.items){
					if (Number(resChar.items[x].item_id) >= 803931 && Number(resChar.items[x].item_id) <= 803950){
						decals.push(Number(resChar.items[x].item_id));
					}
				}
				var preBR = 0;
				if (decals.length == 0){
					preBR = 100;
				}
				else{
					preBR = Math.max.apply(Math, decals) - 803830;
				}
				sendEmbed.addField('Max BR pre ASP', preBR);
				message.channel.send(sendEmbed);
				callback();
			}
		})
	}
	catch{
		callback();
	}
})

module.exports = {
	lookup: function(characterName, message) {
		q.push({chr: characterName, msg: message}, function (err) {
			console.log(characterName+' ASP');
		});
	}
}