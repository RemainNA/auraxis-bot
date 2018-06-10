// Import the discord.js module
const Discord = require('discord.js');

// auth file
var auth = require('./auth.json');

// Import request for API access
var request = require('request');

//commands
var checker = require('./logCheck.js')

var WebSocket = require('websocket').client;

module.exports = {
	subscribe: function(discordClient) {
		subList = {}
		subscribeRequest = '{"service":"event","action":"subscribe","worlds":["1","10","13","17","19","25"],"eventNames":["PlayerLogin","PlayerLogout"]}'
		var client = new WebSocket();
		
		client.connect('wss://push.planetside2.com/streaming?environment=ps2&service-id=s:'+auth.serviceID);
		
		client.on('connectFailed', function(error){
			console.log('Connection failed: '+error);
		});
		
		client.on('connect', function(connection) {
			console.log('Connected to Stream API');
			connection.sendUTF(subscribeRequest);
			
			connection.on('error', function(error){
				console.log("Connection error: " +error);
			});
			
			connection.on('close', function(){
				console.log("Connection closed");
				client.connect('wss://push.planetside2.com/streaming?environment=ps2&service-id=s:'+auth.serviceID);
			});
			
			connection.on('message', function(message){
				try{
					parsed = JSON.parse(message.utf8Data);
					if(parsed.payload != null){
						if(parsed.payload.character_id != null){
							character_id = parsed.payload.character_id;
							if(parsed.payload.event_name == 'PlayerLogin'){
								checker.check(character_id, subList, 'Log in');
							}
							else{
								checker.check(character_id, subList, 'Log out');
							}
						}
					}
				}
				catch{
					console.log('JSON parse error: '+message.utf8Data);
				}
			});
		})
		
		discordClient.on('message', message => {
			if(message.content.substring(0,19) == '!subscribe activity'){
				outfitID(message.content.substring(20), subList, 'subscribe', message.channel)
			}
			if(message.content.substring(0,21) == '!unsubscribe activity'){
				outfitID(message.content.substring(22), subList, 'unsubscribe', message.channel)
			}
		})
		
	}
}

function outfitID(oTag, subList, action, channel){
	uri = 'http://census.daybreakgames.com/s:'+auth.serviceID+'/get/ps2:v2/outfit?alias_lower='+oTag+'&c:join=character^on:leader_character_id^to:character_id';
	var options = {uri:uri, subList:subList, action:action, channel:channel, oTag:oTag}
	request(options, function(error, respose, body){
		data = JSON.parse(body)
		if(data.outfit_list[0] == null){
			channel.send(task.oTag+' not found');
		}
		else{
			ID = data.outfit_list[0].outfit_id;
			resOut = data.outfit_list[0];

			keys = Object.keys(subList);
			if(action == 'subscribe' && keys.indexOf(ID) == -1){
				if(resOut.leader_character_id_join_character.faction_id == "1"){
					color = 'PURPLE';
				}
				else if(resOut.leader_character_id_join_character.faction_id == "2"){
					color = 'BLUE';
				}
				else{
					color = 'RED';
				}
				subList[ID] = [data.outfit_list[0].alias, color, channel];
				channel.send('Subscribed');
			}
			else if(action == 'subscribe' && keys.indexOf(ID) > -1){
				if(subList[ID].indexOf(channel) > -1){
					channel.send('Error: already subscribed');
				}
				else{
					subList[ID].push(channel);
					channel.send('Subscribed');
				}
			}
			else if(action == 'unsubscribe' && keys.indexOf(ID) == -1){
				channel.send('Error: not subscribed to that outfit')
			}
			else if(action == 'unsubscribe' && keys.indexOf(ID) > -1){
				if(subList[ID].length == 3){
					delete subList[ID];
					channel.send('Unsubscribed')
				}
				else if(subList[ID].indexOf(channel) > -1){
					index = subList[ID].indexOf(channel);
					subList[ID].splice(index, 1);
					channel.send('Unsubscribed');
				}
				else{
					channel.send('Error: not subscribed to that outfit');
				}
			}
		}
	})
	
}