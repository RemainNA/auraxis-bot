// Import the discord.js module
const Discord = require('discord.js');

// auth file
var auth = require('./auth.json');

// commands
var alertType = require('./alertType.js');

var WebSocket = require('websocket').client;

module.exports = {
	subscribe: function (discordClient) {
		subList = {"connery": [], "cobalt": [], "miller": [], "emerald": [], "jaegar": [], "briggs": []}
		subscribeRequest = '{"service":"event","action":"subscribe","worlds":["1","10","13","17","19","25"],"eventNames":["MetagameEvent"]}';
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
						if(parsed.payload.metagame_event_state_name == "started"){
							alertType.notify(parsed, subList);
						}
					}
				}
				catch{
					console.log('JSON parse error: '+message);
				}
			});
		})
		
		
		discordClient.on('message', message => {
			if (message.content.substring(0,17) == '!subscribe alerts'){
				console.log(message.content);
				if(message.content.substring(18).toLowerCase().includes('connery')){
					if(subList.connery.indexOf(message.channel) == -1){
						subList.connery.push(message.channel);
						message.channel.send("Confirmed subscription to Connery alerts");
					}
					else{
						message.channel.send("Error: Channel already subscribed to Connery alerts")
					}
				}
				if(message.content.substring(18).toLowerCase().includes('miller')){
					if(subList.miller.indexOf(message.channel) == -1){
						subList.miller.push(message.channel);
						message.channel.send("Confirmed subscription to Miller alerts");
					}
					else{
						message.channel.send("Error: Channel already subscribed to Miller alerts")
					}
				}
				if(message.content.substring(18).toLowerCase().includes('cobalt')){
					if(subList.cobalt.indexOf(message.channel) == -1){
						subList.cobalt.push(message.channel);
						message.channel.send("Confirmed subscription to Cobalt alerts");
					}
					else{
						message.channel.send("Error: Channel already subscribed to Cobalt alerts")
					}
				}
				if(message.content.substring(18).toLowerCase().includes('emerald')){
					if(subList.emerald.indexOf(message.channel) == -1){
						subList.emerald.push(message.channel);
						message.channel.send("Confirmed subscription to Emerald alerts");
					}
					else{
						message.channel.send("Error: Channel already subscribed to Emerald alerts")
					}
				}
				if(message.content.substring(18).toLowerCase().includes('jaegar')){
					if(subList.jaegar.indexOf(message.channel) == -1){
						subList.jaegar.push(message.channel);
						message.channel.send("Confirmed subscription to Jaegar alerts");
					}
					else{
						message.channel.send("Error: Channel already subscribed to Jaegar alerts")
					}
				}
				if(message.content.substring(18).toLowerCase().includes('briggs')){
					if(subList.briggs.indexOf(message.channel) == -1){
						subList.briggs.push(message.channel);
						message.channel.send("Confirmed subscription to Briggs alerts");
					}
					else{
						message.channel.send("Error: Channel already subscribed to Briggs alerts")
					}
				}
			}
			if (message.content.substring(0,19) == '!unsubscribe alerts'){
				if(message.content.substring(20).toLowerCase().includes('connery')){
					index = subList.connery.indexOf(message.channel);
					if(index > -1){
						subList.connery.splice(index, 1);
						message.channel.send("Unsubscribed from Connery alerts");
					}
					else{
						message.channel.send("Error: Not subscribed to Connery alerts");
					}
				}
				if(message.content.substring(20).toLowerCase().includes('cobalt')){
					index = subList.cobalt.indexOf(message.channel);
					if(index > -1){
						subList.cobalt.splice(index, 1);
						message.channel.send("Unsubscribed from Cobalt alerts");
					}
					else{
						message.channel.send("Error: Not subscribed to Cobalt alerts");
					}
				}
				if(message.content.substring(20).toLowerCase().includes('miller')){
					index = subList.miller.indexOf(message.channel);
					if(index > -1){
						subList.miller.splice(index, 1);
						message.channel.send("Unsubscribed from Miller alerts");
					}
					else{
						message.channel.send("Error: Not subscribed to Miller alerts");
					}
				}
				if(message.content.substring(20).toLowerCase().includes('emerald')){
					index = subList.emerald.indexOf(message.channel);
					if(index > -1){
						subList.emerald.splice(index, 1);
						message.channel.send("Unsubscribed from Emerald alerts");
					}
					else{
						message.channel.send("Error: Not subscribed to Emerald alerts");
					}
				}
				if(message.content.substring(20).toLowerCase().includes('jaegar')){
					index = subList.jaegar.indexOf(message.channel);
					if(index > -1){
						subList.jaegar.splice(index, 1);
						message.channel.send("Unsubscribed from Jaegar alerts");
					}
					else{
						message.channel.send("Error: Not subscribed to Jaegar alerts");
					}
				}
				if(message.content.substring(20).toLowerCase().includes('briggs')){
					index = subList.briggs.indexOf(message.channel);
					if(index > -1){
						subList.briggs.splice(index, 1);
						message.channel.send("Unsubscribed from Briggs alerts");
					}
					else{
						message.channel.send("Error: Not subscribed to Briggs alerts");
					}
				}
			}
		})
	}
}