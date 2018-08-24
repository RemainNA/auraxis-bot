// Import the discord.js module
const Discord = require('discord.js');

// Import request for API access
var request = require('request');

var async = require('async');

//commands
var handler = require('./websocketHandler.js');

var WebSocket = require('websocket').client;

//PostgreSQL connection
const { Client } = require('pg');

module.exports = {
	subscribe: function(discordClient) {
		subListOutfits = {}
		subListAlerts = {"connery": [], "cobalt": [], "miller": [], "emerald": [], "jaegar": [], "briggs": []}
		const SQLclient = new Client({
		  connectionString: process.env.DATABASE_URL,
		  ssl: true,
		});

		SQLclient.connect();
		SQLclient.query("SELECT * connery", (err, res) => {
		    if (err){
				console.log(err);
				console.log("Creating connery table");
				SQLclient.query("create table connery (channel text);", (err, res) => {
					SQLclient.end();
				});
			} 
		    else{
				for (let row of res.rows) {
				subListAlerts.connery.push(row.channel);
			    console.log(JSON.stringify(row));
				}
				SQLclient.end();
			}
		    
		});
		//subscription messages to send to websocket
		subscribeRequestLogin = '{"service":"event","action":"subscribe","worlds":["1","10","13","17","19","25"],"eventNames":["PlayerLogin","PlayerLogout"]}'
		subscribeRequestAlerts = '{"service":"event","action":"subscribe","worlds":["1","10","13","17","19","25"],"eventNames":["MetagameEvent"]}';
		var client = new WebSocket();
		
		client.connect('wss://push.planetside2.com/streaming?environment=ps2&service-id=s:'+process.env.serviceID);
		
		client.on('connectFailed', function(error){
			console.log('Connection failed: '+error);
		});
		
		client.on('connect', function(connection) {
			console.log('Connected to Stream API');
			connection.sendUTF(subscribeRequestLogin);
			connection.sendUTF(subscribeRequestAlerts);
			
			connection.on('error', function(error){
				console.log("Connection error: " +error);
			});
			
			connection.on('close', function(){
				console.log("Connection closed");
				client.connect('wss://push.planetside2.com/streaming?environment=ps2&service-id=s:'+process.env.serviceID);
			});
			
			connection.on('message', function(message){
				//on message parse JSON and send to handler
				if(message.utf8Data != null && message.utf8Data != undefined){
					try{
						parsed = JSON.parse(message.utf8Data);
					}
					catch(e){
						console.log('JSON parse error: '+message.utf8Data);
					}
					if(parsed.payload != null){
						handler.check(parsed, subListAlerts, subListOutfits);
					}
				}
				
			});
		})
		
		discordClient.on('message', message => {
			//listen to discord for subscribe/unsubscribe requests
			if(message.content.substring(0,19) == '!subscribe activity'){
				outfitID(message.content.substring(20).toLowerCase(), subListOutfits, 'subscribe', message.channel)
			}
			if(message.content.substring(0,21) == '!unsubscribe activity'){
				outfitID(message.content.substring(22).toLowerCase(), subListOutfits, 'unsubscribe', message.channel)
			}
			if (message.content.substring(0,17) == '!subscribe alerts'){
				console.log(message.content);
				if(message.content.substring(18).toLowerCase().includes('connery')){
					if(subListAlerts.connery.indexOf(message.channel) == -1){
						subListAlerts.connery.push(message.channel);
						message.channel.send("Confirmed subscription to Connery alerts");
					}
					else{
						message.channel.send("Error: Channel already subscribed to Connery alerts")
					}
				}
				if(message.content.substring(18).toLowerCase().includes('miller')){
					if(subListAlerts.miller.indexOf(message.channel) == -1){
						subListAlerts.miller.push(message.channel);
						message.channel.send("Confirmed subscription to Miller alerts");
					}
					else{
						message.channel.send("Error: Channel already subscribed to Miller alerts")
					}
				}
				if(message.content.substring(18).toLowerCase().includes('cobalt')){
					if(subListAlerts.cobalt.indexOf(message.channel) == -1){
						subListAlerts.cobalt.push(message.channel);
						message.channel.send("Confirmed subscription to Cobalt alerts");
					}
					else{
						message.channel.send("Error: Channel already subscribed to Cobalt alerts")
					}
				}
				if(message.content.substring(18).toLowerCase().includes('emerald')){
					if(subListAlerts.emerald.indexOf(message.channel) == -1){
						subListAlerts.emerald.push(message.channel);
						message.channel.send("Confirmed subscription to Emerald alerts");
					}
					else{
						message.channel.send("Error: Channel already subscribed to Emerald alerts")
					}
				}
				if(message.content.substring(18).toLowerCase().includes('jaegar')){
					if(subListAlerts.jaegar.indexOf(message.channel) == -1){
						subListAlerts.jaegar.push(message.channel);
						message.channel.send("Confirmed subscription to Jaegar alerts");
					}
					else{
						message.channel.send("Error: Channel already subscribed to Jaegar alerts")
					}
				}
				if(message.content.substring(18).toLowerCase().includes('briggs')){
					if(subListAlerts.briggs.indexOf(message.channel) == -1){
						subListAlerts.briggs.push(message.channel);
						message.channel.send("Confirmed subscription to Briggs alerts");
					}
					else{
						message.channel.send("Error: Channel already subscribed to Briggs alerts")
					}
				}
			}
			if (message.content.substring(0,19) == '!unsubscribe alerts'){
				if(message.content.substring(20).toLowerCase().includes('connery')){
					index = subListAlerts.connery.indexOf(message.channel);
					if(index > -1){
						subListAlerts.connery.splice(index, 1);
						message.channel.send("Unsubscribed from Connery alerts");
					}
					else{
						message.channel.send("Error: Not subscribed to Connery alerts");
					}
				}
				if(message.content.substring(20).toLowerCase().includes('cobalt')){
					index = subListAlerts.cobalt.indexOf(message.channel);
					if(index > -1){
						subListAlerts.cobalt.splice(index, 1);
						message.channel.send("Unsubscribed from Cobalt alerts");
					}
					else{
						message.channel.send("Error: Not subscribed to Cobalt alerts");
					}
				}
				if(message.content.substring(20).toLowerCase().includes('miller')){
					index = subListAlerts.miller.indexOf(message.channel);
					if(index > -1){
						subListAlerts.miller.splice(index, 1);
						message.channel.send("Unsubscribed from Miller alerts");
					}
					else{
						message.channel.send("Error: Not subscribed to Miller alerts");
					}
				}
				if(message.content.substring(20).toLowerCase().includes('emerald')){
					index = subListAlerts.emerald.indexOf(message.channel);
					if(index > -1){
						subListAlerts.emerald.splice(index, 1);
						message.channel.send("Unsubscribed from Emerald alerts");
					}
					else{
						message.channel.send("Error: Not subscribed to Emerald alerts");
					}
				}
				if(message.content.substring(20).toLowerCase().includes('jaegar')){
					index = subListAlerts.jaegar.indexOf(message.channel);
					if(index > -1){
						subListAlerts.jaegar.splice(index, 1);
						message.channel.send("Unsubscribed from Jaegar alerts");
					}
					else{
						message.channel.send("Error: Not subscribed to Jaegar alerts");
					}
				}
				if(message.content.substring(20).toLowerCase().includes('briggs')){
					index = subListAlerts.briggs.indexOf(message.channel);
					if(index > -1){
						subListAlerts.briggs.splice(index, 1);
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

//handle outfit activity reausts, grabs outfit id and adds/removes from arrays
function outfitID(oTagLong, subListOutfits, action, channel){
	oTagList = oTagLong.split(" ");
	for (x in oTagList){
		if (oTagList[x] != ""){
			oTag = oTagList[x];
		}
		else{
			continue;
		}
		uri = 'http://census.daybreakgames.com/s:'+process.env.serviceID+'/get/ps2:v2/outfit?alias_lower='+oTag+'&c:join=character^on:leader_character_id^to:character_id';
		var options = {uri:uri, subListOutfits:subListOutfits, action:action, channel:channel, oTag:oTag}
		request(options, function(error, respose, body){
			data = JSON.parse(body)
			if(data.outfit_list[0] == null){
				//outfit not found
				channel.send(oTag+' not found');
			}
			else{
				//tag found, returned results
				ID = data.outfit_list[0].outfit_id;
				resOut = data.outfit_list[0];

				keys = Object.keys(subListOutfits);
				if(action == 'subscribe' && keys.indexOf(ID) == -1){
					//No active subscriptions for outfit
					if(resOut.leader_character_id_join_character.faction_id == "1"){
						color = 'PURPLE';
					}
					else if(resOut.leader_character_id_join_character.faction_id == "2"){
						color = 'BLUE';
					}
					else{
						color = 'RED';
					}
					subListOutfits[ID] = [data.outfit_list[0].alias, color, channel];
					channel.send('Subscribed to '+resOut.alias);
				}
				else if(action == 'subscribe' && keys.indexOf(ID) > -1){
					//existing subscription
					if(subListOutfits[ID].indexOf(channel) > -1){
						//source channel is subscribed
						channel.send('Error: already subscribed to '+resOut.alias);
					}
					else{
						//source channel is not subscribed
						subListOutfits[ID].push(channel);
						channel.send('Subscribed to '+resOut.alias);
					}
				}
				else if(action == 'unsubscribe' && keys.indexOf(ID) == -1){
					//no active subscriptions to outfit
					channel.send('Error: not subscribed to '+resOut.alias)
				}
				else if(action == 'unsubscribe' && keys.indexOf(ID) > -1){
					//active subscriptions to outfit
					if(subListOutfits[ID].length == 3 && subListOutfits[ID].indexOf(channel) > -1){
						//source channel is only active subscription
						delete subListOutfits[ID];
						channel.send('Unsubscribed from '+resOut.alias)
					}
					else if(subListOutfits[ID].indexOf(channel) > -1){
						//source channel is not only active subscription
						index = subListOutfits[ID].indexOf(channel);
						subListOutfits[ID].splice(index, 1);
						channel.send('Unsubscribed from '+resOut.alias);
					}
					else{
						//not subscribed
						channel.send('Error: not subscribed to '+resOut.alias);
					}
				}
			}
		})
	}
	
	
}