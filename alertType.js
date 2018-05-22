// Import the discord.js module
const Discord = require('discord.js');

// Import request for API access
var request = require('request');

// auth file
var auth = require('./auth.json');

// import async
var async = require('async');

var q = async.queue(function(task, callback) {
	payload = task.message;
	subList = task.subscriptions;
	uri = 'https://census.daybreakgames.com/s:'+auth.serviceID+'/get/ps2:v2/metagame_event/'+payload.payload.metagame_event_id;
	try{
		request(uri, function (error, response, body) {
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
					sendEmbed.addField('Status', payload.payload.metagame_event_state_name, true);
					if (resEvent.name.en.includes('Enlightenment')){
						sendEmbed.setColor('PURPLE');
					}
					else if (resEvent.name.en.includes('Liberation')){
						sendEmbed.setColor('BLUE');
					}
					else if (resEvent.name.en.includes('Superiority')){
						sendEmbed.setColor('RED');
					}
					switch (payload.payload.world_id){
						case "1":
							sendEmbed.addField('Server', 'Connery', true);
							for(x in subList.connery){
								subList.connery[x].send(sendEmbed);
							}
							break;
						case "10":
							sendEmbed.addField('Server', 'Miller', true);
							for(x in subList.miller){
								subList.miller[x].send(sendEmbed);
							}
							break;
						case "13":
							sendEmbed.addField('Server', 'Cobalt', true);
							for(x in subList.cobalt){
								subList.cobalt[x].send(sendEmbed);
							}
							break;
						case "17":
							sendEmbed.addField('Server', 'Emerald', true);
							for(x in subList.emerald){
								subList.emerald[x].send(sendEmbed);
							}
							break;
						case "19":
							sendEmbed.addField('Server', 'Jaeger', true);
							for(x in subList.jaegar){
								subList.jaegar[x].send(sendEmbed);
							}
							break;
						case "25":
							sendEmbed.addField('Server', 'Briggs', true);
							for(x in subList.briggs){
								subList.briggs[x].send(sendEmbed);
							}
					}
					callback();
				}
			}
			catch{
				console.log('JSON error in alertType, payload = '+body+' lookup URI = '+URI);
				callback();
			}
		})
	}
	catch{
		callback();
	}
})

module.exports = {
	notify: function(payload, subList) {
		q.push({message: payload, subscriptions: subList}, function (err) {
			console.log('Received alert notification');
		});
	}
}