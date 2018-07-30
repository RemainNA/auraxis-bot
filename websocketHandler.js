// Import the discord.js module
const Discord = require('discord.js');

// Import request for API access
var request = require('request');

// import async
var async = require('async');

var qu = async.queue(function(task, callback) {
	message = task.msg;
	alertList = task.aList;
	outfitList = task.oList;
	if(message.payload.character_id != null){
		character_id = message.payload.character_id;
		playerEvent = message.payload.event_name.substring(6);
		uri = 'https://census.daybreakgames.com/s:'+process.env.serviceID+'/get/ps2:v2/character/'+character_id+'?c:resolve=outfit_member'
		var options = {uri:uri, playerEvent:playerEvent, outfitList:outfitList}
		request(options, function (error, response, body) {
			if(body != null && body != undefined){
				try{
					data = JSON.parse(body);
				}
				catch(e){
					console.log('Error with '+JSON.stringify(message.payload));
					//callback();
				}
				if (data.character_list == null)
				{
					callback();
				}
				else{
					resChar = data.character_list[0];
					if(resChar != null && resChar.outfit_member != null){
						keys = Object.keys(outfitList);
						if (keys.indexOf(resChar.outfit_member.outfit_id) > -1)
						{
							sendEmbed = new Discord.RichEmbed();
							sendEmbed.setTitle(outfitList[resChar.outfit_member.outfit_id][0]+' '+playerEvent);
							sendEmbed.setDescription(resChar.name.first);
							sendEmbed.setColor(outfitList[resChar.outfit_member.outfit_id][1]);
							for (i = 2; i < outfitList[resChar.outfit_member.outfit_id].length; i++){
								outfitList[resChar.outfit_member.outfit_id][i].send(sendEmbed);
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
			}
			else{
				console.log("null body error");
				callback();
			}
		})
	}
	else if(message.payload.metagame_event_state_name != null){
		console.log('Alert notification');
		if(message.payload.metagame_event_state_name == "started"){
			console.log("Alert start")
			url = 'https://census.daybreakgames.com/s:'+process.env.serviceID+'/get/ps2:v2/metagame_event/'+message.payload.metagame_event_id;
			try{
				request(url, function (error, response, body) {
					try{
						data = JSON.parse(body);
						if (data.metagame_event_list[0] == null){
							callback();
						}
						else{
							resEvent = data.metagame_event_list[0];
							sendEmbed = new Discord.RichEmbed();
							sendEmbed.setTitle(resEvent.name.en);
							sendEmbed.setDescription(resEvent.description.en);
							sendEmbed.addField('Status', message.payload.metagame_event_state_name, true);
							if (resEvent.name.en.includes('Enlightenment')){
								sendEmbed.setColor('PURPLE');
							}
							else if (resEvent.name.en.includes('Liberation')){
								sendEmbed.setColor('BLUE');
							}
							else if (resEvent.name.en.includes('Superiority')){
								sendEmbed.setColor('RED');
							}
							switch (message.payload.world_id){
								case "1":
									sendEmbed.addField('Server', 'Connery', true);
									for(x in alertList.connery){
										alertList.connery[x].send(sendEmbed);
									}
									callback();
									break;
								case "10":
									sendEmbed.addField('Server', 'Miller', true);
									for(x in alertList.miller){
										alertList.miller[x].send(sendEmbed);
									}
									callback();
									break;
								case "13":
									sendEmbed.addField('Server', 'Cobalt', true);
									for(x in alertList.cobalt){
										alertList.cobalt[x].send(sendEmbed);
									}
									callback();
									break;
								case "17":
									sendEmbed.addField('Server', 'Emerald', true);
									for(x in alertList.emerald){
										alertList.emerald[x].send(sendEmbed);
									}
									callback();
									break;
								case "19":
									sendEmbed.addField('Server', 'Jaeger', true);
									for(x in alertList.jaegar){
										alertList.jaegar[x].send(sendEmbed);
									}
									callback();
									break;
								case "25":
									sendEmbed.addField('Server', 'Briggs', true);
									for(x in alertList.briggs){
										alertList.briggs[x].send(sendEmbed);
									}
									callback();
							}
						}
					}
					catch(e){
						console.log('JSON error in alertType, payload = '+body+' lookup URI = '+uri);
						callback();
					}
				})
			}
			catch(e){
				callback();
			}
		}
		else{
			callback();
		}
	}
	
})

qu.drain = function() {

}


module.exports = {
	check: function(message, alertList, outfitList){
		qu.push({msg: message, aList: alertList, oList: outfitList}, function(err) {
			
		})
	}
}