// Import the discord.js module
const Discord = require('discord.js');

// Import request for API access
var request = require('request');

// import async
var async = require('async');

var q = async.queue(function(task, callback){
	cName = task.chr;
	message = task.msg;
	uri = 'https://census.daybreakgames.com/s:'+process.env.serviceID+'/get/ps2:v2/character?name.first_lower='+cName+'&c:resolve=item_full&c:lang=en';
	var options = {uri:uri, message:message};
	try{
		request(options, function (error, response, body) {
			message = options.message;
			data = JSON.parse(body)
			if (data.character_list == null)
			{
				message.channel.send("Character not found").then(function(result){
					
				}, function(err){
					console.log("Insufficient permissions on !asp character not found");
					console.log(message.guild.name);
				});
				callback();
			}
			else if (data.character_list[0].prestige_level == "0"){
				message.channel.send("Character has not yet prestiged").then(function(result){
					
				}, function(err){
					console.log("Insufficient permissions on !asp character not prestiged");
					console.log(message.guild.name);
				});
				callback();
			}
			else{
				resChar = data.character_list[0];
				//create rich embed, color based on faction
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
				else if (resChar.faction_id == "3") //tr
				{
					sendEmbed.setColor('RED');
				}
				else //nso
				{
					sendEmbed.setColor('GREY');
				}
				decals = []; //count br 101-120 decals
				for (x in resChar.items){
					if (Number(resChar.items[x].item_id) >= 803931 && Number(resChar.items[x].item_id) <= 803950){
						//record br 101-120 decals
						decals.push(Number(resChar.items[x].item_id));
					}
				}
				var preBR = 0;
				if (decals.length == 0){ //if no decals, recorded, prestiged at br 100
					preBR = 100;
				}
				else{ //decals ids are br + 803830
					preBR = Math.max.apply(Math, decals) - 803830;
				}
				sendEmbed.addField('Max BR pre ASP', preBR);
				message.channel.send(sendEmbed).then(function(result){
				
				}, function(err){
					console.log("Insufficient permissions on !asp character");
					console.log(message.guild.name);
				});
				callback();
			}
		})
	}
	catch(e){
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