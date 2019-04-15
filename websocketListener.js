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
		subListOutfits = []
		subListAlerts = {"connery": [], "cobalt": [], "miller": [], "emerald": [], "jaegar": [], "briggs": [], "soltech": []}
		//************
		//START OF SQL
		//************
		const SQLclient = new Client({
		  connectionString: process.env.DATABASE_URL,
		  ssl: true,
		});
		SQLclient.connect();
		SQLclient.query("SELECT * FROM connery;", (err, res) => {
		    if (err){
				//create table if one not found
				console.log(err);
				console.log("Creating connery table");
				SQLclient.query("CREATE TABLE connery (channel TEXT);", (err, res) => {
					if (err){
						console.log(err);
					}
					else{
						console.log(res);
					}
				});
			} 
		    else{
				for (let row of res.rows) {
					//convert channel id into channel object
					//resChann = discordClient.channels.get(row.channel);
					subListAlerts.connery.push(row.channel);
					console.log(JSON.stringify(row));
				}
			}
		    
		});
		SQLclient.query("SELECT * FROM cobalt;", (err, res) => {
		    if (err){
				//create table if one not found
				console.log(err);
				console.log("Creating cobalt table");
				SQLclient.query("CREATE TABLE cobalt (channel TEXT);", (err, res) => {
					if (err){
						console.log(err);
					}
					else{
						console.log(res);
					}
				});
			} 
		    else{
				for (let row of res.rows) {
					//convert channel id into channel object
					//resChann = discordClient.channels.get(row.channel);
					subListAlerts.cobalt.push(row.channel);
					console.log(JSON.stringify(row));
				}
			}
		    
		});
		SQLclient.query("SELECT * FROM miller;", (err, res) => {
		    if (err){
				//create table if one not found
				console.log(err);
				console.log("Creating miller table");
				SQLclient.query("CREATE TABLE miller (channel TEXT);", (err, res) => {
					if (err){
						console.log(err);
					}
					else{
						console.log(res);
					}
				});
			} 
		    else{
				for (let row of res.rows) {
					//convert channel id into channel object
					//resChann = discordClient.channels.get(row.channel);
					subListAlerts.miller.push(row.channel);
					console.log(JSON.stringify(row));
				}
			}
		    
		});
		SQLclient.query("SELECT * FROM emerald;", (err, res) => {
		    if (err){
				//create table if one not found
				console.log(err);
				console.log("Creating emerald table");
				SQLclient.query("CREATE TABLE emerald (channel TEXT);", (err, res) => {
					if (err){
						console.log(err);
					}
					else{
						console.log(res);
					}
				});
			} 
		    else{
				for (let row of res.rows) {
					//convert channel id into channel object
					//resChann = discordClient.channels.get(row.channel);
					subListAlerts.emerald.push(row.channel);
					console.log(JSON.stringify(row));
				}
			}
		    
		});
		SQLclient.query("SELECT * FROM jaegar;", (err, res) => {
		    if (err){
				//create table if one not found
				console.log(err);
				console.log("Creating jaegar table");
				SQLclient.query("CREATE TABLE jaegar (channel TEXT);", (err, res) => {
					if (err){
						console.log(err);
					}
					else{
						console.log(res);
					}
				});
			} 
		    else{
				for (let row of res.rows) {
					//convert channel id into channel object
					//resChann = discordClient.channels.get(row.channel);
					subListAlerts.jaegar.push(row.channel);
					console.log(JSON.stringify(row));
				}
			}
		    
		});
		SQLclient.query("SELECT * FROM briggs;", (err, res) => {
		    if (err){
				//create table if one not found
				console.log(err);
				console.log("Creating briggs table");
				SQLclient.query("CREATE TABLE briggs (channel TEXT);", (err, res) => {
					if (err){
						console.log(err);
					}
					else{
						console.log(res);
					}
				});
			} 
		    else{
				for (let row of res.rows) {
					//convert channel id into channel object
					//resChann = discordClient.channels.get(row.channel);
					subListAlerts.briggs.push(row.channel);
					console.log(JSON.stringify(row));
				}
			}
		    
		});
		SQLclient.query("SELECT * FROM soltech;", (err, res) => {
		    if (err){
				//create table if one not found
				console.log(err);
				console.log("Creating soltech table");
				SQLclient.query("CREATE TABLE soltech (channel TEXT);", (err, res) => {
					if (err){
						console.log(err);
					}
					else{
						console.log(res);
					}
				});
			} 
		    else{
				for (let row of res.rows) {
					//convert channel id into channel object
					//resChann = discordClient.channels.get(row.channel);
					subListAlerts.soltech.push(row.channel);
					console.log(JSON.stringify(row));
				}
			}
		    
		});
		SQLclient.query("SELECT * FROM outfit;", (err, res) => {
		    if (err){
				//create table if one not found
				console.log(err);
				console.log("Creating outfit table");
				SQLclient.query("CREATE TABLE outfit (id bigint, color TEXT, alias TEXT, channel TEXT);", (err, res) => {
					if (err){
						console.log(err);
					}
					else{
						console.log(res);
					}
				});
			} 
		    else{
				for (let row of res.rows) {
					//convert channel id into channel object
					//resChann = discordClient.channels.get(row.channel);
					subListOutfits.push(row.id);
					console.log(JSON.stringify(row));
				}
			}
		    
		});
		//**********
		//END OF SQL
		//**********
		//subscription messages to send to websocket
		subscribeRequestLogin = '{"service":"event","action":"subscribe","worlds":["1","10","13","17","19","25","40"],"eventNames":["PlayerLogin","PlayerLogout"]}'
		subscribeRequestAlerts = '{"service":"event","action":"subscribe","worlds":["1","10","13","17","19","25","40"],"eventNames":["MetagameEvent"]}';
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
						handler.check(parsed, subListAlerts, subListOutfits, SQLclient, discordClient);
					}
				}
				
			});
		})
		
		discordClient.on('message', message => {
			//listen to discord for subscribe/unsubscribe requests
			if(message.content.substring(0,19) == '!subscribe activity'){
				outfitID(message.content.substring(20).toLowerCase(), subListOutfits, 'subscribe', message.channel, SQLclient)
			}
			if(message.content.substring(0,21) == '!unsubscribe activity'){
				outfitID(message.content.substring(22).toLowerCase(), subListOutfits, 'unsubscribe', message.channel, SQLclient)
			}
			if (message.content.substring(0,17) == '!subscribe alerts'){
				console.log(message.content);
				if(message.content.substring(18).toLowerCase().includes('connery')){
					if(subListAlerts.connery.indexOf(message.channel.id) == -1){
						subListAlerts.connery.push(message.channel.id);
						SQLclient.query("INSERT INTO connery VALUES ("+message.channel.id+");", (err, res) => {
							if (err){
								console.log(err);
							} 
						});
						message.channel.send("Confirmed subscription to Connery alerts");
					}
					else{
						message.channel.send("Error: Channel already subscribed to Connery alerts")
					}
				}
				if(message.content.substring(18).toLowerCase().includes('miller')){
					if(subListAlerts.miller.indexOf(message.channel.id) == -1){
						subListAlerts.miller.push(message.channel.id);
						SQLclient.query("INSERT INTO miller VALUES ("+message.channel.id+");", (err, res) => {
							if (err){
								console.log(err);
							} 
						});
						message.channel.send("Confirmed subscription to Miller alerts");
					}
					else{
						message.channel.send("Error: Channel already subscribed to Miller alerts")
					}
				}
				if(message.content.substring(18).toLowerCase().includes('cobalt')){
					if(subListAlerts.cobalt.indexOf(message.channel.id) == -1){
						subListAlerts.cobalt.push(message.channel.id);
						SQLclient.query("INSERT INTO cobalt VALUES ("+message.channel.id+");", (err, res) => {
							if (err){
								console.log(err);
							} 
						});
						message.channel.send("Confirmed subscription to Cobalt alerts");
					}
					else{
						message.channel.send("Error: Channel already subscribed to Cobalt alerts")
					}
				}
				if(message.content.substring(18).toLowerCase().includes('emerald')){
					if(subListAlerts.emerald.indexOf(message.channel.id) == -1){
						subListAlerts.emerald.push(message.channel.id);
						SQLclient.query("INSERT INTO emerald VALUES ("+message.channel.id+");", (err, res) => {
							if (err){
								console.log(err);
							} 
						});
						message.channel.send("Confirmed subscription to Emerald alerts");
					}
					else{
						message.channel.send("Error: Channel already subscribed to Emerald alerts")
					}
				}
				if(message.content.substring(18).toLowerCase().includes('jaegar')){
					if(subListAlerts.jaegar.indexOf(message.channel.id) == -1){
						subListAlerts.jaegar.push(message.channel.id);
						SQLclient.query("INSERT INTO jaegar VALUES ("+message.channel.id+");", (err, res) => {
							if (err){
								console.log(err);
							} 
						});
						message.channel.send("Confirmed subscription to Jaegar alerts");
					}
					else{
						message.channel.send("Error: Channel already subscribed to Jaegar alerts")
					}
				}
				if(message.content.substring(18).toLowerCase().includes('briggs')){
					if(subListAlerts.briggs.indexOf(message.channel.id) == -1){
						subListAlerts.briggs.push(message.channel.id);
						SQLclient.query("INSERT INTO briggs VALUES ("+message.channel.id+");", (err, res) => {
							if (err){
								console.log(err);
							} 
						});
						message.channel.send("Confirmed subscription to Briggs alerts");
					}
					else{
						message.channel.send("Error: Channel already subscribed to Briggs alerts")
					}
				}
				if(message.content.substring(18).toLowerCase().includes('soltech')){
					if(subListAlerts.soltech.indexOf(message.channel.id) == -1){
						subListAlerts.soltech.push(message.channel.id);
						SQLclient.query("INSERT INTO soltech VALUES ("+message.channel.id+");", (err, res) => {
							if (err){
								console.log(err);
							} 
						});
						message.channel.send("Confirmed subscription to SolTech alerts");
					}
					else{
						message.channel.send("Error: Channel already subscribed to SolTech alerts")
					}
				}
			}
			if (message.content.substring(0,19) == '!unsubscribe alerts'){
				if(message.content.substring(20).toLowerCase().includes('connery')){
					index = subListAlerts.connery.indexOf(message.channel.id);
					if(index > -1){
						subListAlerts.connery.splice(index, 1);
						SQLclient.query("DELETE FROM connery WHERE channel='"+message.channel.id+"';", (err, res) => {
							if (err){
								console.log(err);
							} 
						});
						message.channel.send("Unsubscribed from Connery alerts");
					}
					else{
						message.channel.send("Error: Not subscribed to Connery alerts");
					}
				}
				if(message.content.substring(20).toLowerCase().includes('cobalt')){
					index = subListAlerts.cobalt.indexOf(message.channel.id);
					if(index > -1){
						subListAlerts.cobalt.splice(index, 1);
						SQLclient.query("DELETE FROM connery WHERE channel='"+message.channel.id+"';", (err, res) => {
							if (err){
								console.log(err);
							} 
						});
						message.channel.send("Unsubscribed from Cobalt alerts");
					}
					else{
						message.channel.send("Error: Not subscribed to Cobalt alerts");
					}
				}
				if(message.content.substring(20).toLowerCase().includes('miller')){
					index = subListAlerts.miller.indexOf(message.channel.id);
					if(index > -1){
						subListAlerts.miller.splice(index, 1);
						SQLclient.query("DELETE FROM miller WHERE channel='"+message.channel.id+"';", (err, res) => {
							if (err){
								console.log(err);
							} 
						});
						message.channel.send("Unsubscribed from Miller alerts");
					}
					else{
						message.channel.send("Error: Not subscribed to Miller alerts");
					}
				}
				if(message.content.substring(20).toLowerCase().includes('emerald')){
					index = subListAlerts.emerald.indexOf(message.channel.id);
					if(index > -1){
						subListAlerts.emerald.splice(index, 1);
						SQLclient.query("DELETE FROM emerald WHERE channel='"+message.channel.id+"';", (err, res) => {
							if (err){
								console.log(err);
							} 
						});
						message.channel.send("Unsubscribed from Emerald alerts");
					}
					else{
						message.channel.send("Error: Not subscribed to Emerald alerts");
					}
				}
				if(message.content.substring(20).toLowerCase().includes('jaegar')){
					index = subListAlerts.jaegar.indexOf(message.channel.id);
					if(index > -1){
						subListAlerts.jaegar.splice(index, 1);
						SQLclient.query("DELETE FROM jaegar WHERE channel='"+message.channel.id+"';", (err, res) => {
							if (err){
								console.log(err);
							} 
						});
						message.channel.send("Unsubscribed from Jaegar alerts");
					}
					else{
						message.channel.send("Error: Not subscribed to Jaegar alerts");
					}
				}
				if(message.content.substring(20).toLowerCase().includes('briggs')){
					index = subListAlerts.briggs.indexOf(message.channel.id);
					if(index > -1){
						subListAlerts.briggs.splice(index, 1);
						SQLclient.query("DELETE FROM briggs WHERE channel='"+message.channel.id+"';", (err, res) => {
							if (err){
								console.log(err);
							} 
						});
						message.channel.send("Unsubscribed from Briggs alerts");
					}
					else{
						message.channel.send("Error: Not subscribed to Briggs alerts");
					}
				}
				if(message.content.substring(20).toLowerCase().includes('soltech')){
					index = subListAlerts.soltech.indexOf(message.channel.id);
					if(index > -1){
						subListAlerts.soltech.splice(index, 1);
						SQLclient.query("DELETE FROM soltech WHERE channel='"+message.channel.id+"';", (err, res) => {
							if (err){
								console.log(err);
							} 
						});
						message.channel.send("Unsubscribed from SolTech alerts");
					}
					else{
						message.channel.send("Error: Not subscribed to SolTech alerts");
					}
				}
			}
		})
	}
}

//handle outfit activity requests, grabs outfit id and adds/removes from arrays
function outfitID(oTagLong, subListOutfits, action, channel, SQLclient){
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

				//keys = Object.keys(subListOutfits);
				if(action == 'subscribe' && subListOutfits.indexOf(ID) == -1){
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
					subListOutfits.push(ID);
					SQLclient.query("INSERT INTO outfit (id, alias, color, channel) VALUES ("+ID+", '"+resOut.alias+"', '"+color+"', '"+channel.id+"');", (err, res) => {
						if (err){
							console.log('pos 1');
							console.log(err);
						} 
					});
					//subListOutfits[ID] = [data.outfit_list[0].alias, color, channel];
					channel.send('Subscribed to '+resOut.alias);
				}
				else if(action == 'subscribe' && subListOutfits.indexOf(ID) > -1){
					//existing subscription
					SQLclient.query("SELECT COUNT(channel) AS quant FROM outfit WHERE id="+ID+" AND channel='"+channel.id+"';", (err, res) => {
						if (err){
							console.log('pos 2');
							console.log(err);
						} 
						console.log(JSON.stringify(res.rows));
						console.log(ID+", "+channel.id);
						subCount = res.rows[0].quant;
						if(subCount == 1){
							//source channel is subscribed
							channel.send('Error: already subscribed to '+resOut.alias);
						}
						else{
							//source channel is not subscribed
							//subListOutfits[ID].push(channel);
							if(resOut.leader_character_id_join_character.faction_id == "1"){
								color = 'PURPLE';
							}
							else if(resOut.leader_character_id_join_character.faction_id == "2"){
								color = 'BLUE';
							}
							else{
								color = 'RED';
							}
							SQLclient.query("INSERT INTO outfit (id, alias, color, channel) VALUES ("+ID+", '"+resOut.alias+"', '"+color+"', '"+channel.id+"');", (err, res) => {
								if (err){
									console.log('pos 3');
									console.log(err);
								} 
							});
							channel.send('Subscribed to '+resOut.alias);
						}
					});
					
				}
				else if(action == 'unsubscribe' && subListOutfits.indexOf(ID) == -1){
					//no active subscriptions to outfit
					channel.send('Error: not subscribed to '+resOut.alias)
				}
				else if(action == 'unsubscribe' && subListOutfits.indexOf(ID) > -1){
					//active subscriptions to outfit
					SQLclient.query("SELECT channel FROM outfit WHERE (id = "+ID+");", (err, res) => {
						if (err){
							console.log(err);
						}
						console.log(res);
						//count = res.rows[0].quant;
						subCount = 0;
						subArray = [];
						for(let row of res.rows) {
							subCount += 1;
							subArray.push(row.channel);
						}
						if(subCount == 1 && subArray.indexOf(channel.id) > -1){ //modify subListOutfits
							//source channel is only active subscription
							channel.send('Unsubscribed from '+resOut.alias)
							SQLclient.query("DELETE FROM outfit WHERE id="+ID+" AND channel='"+channel.id+"';", (err, res) => {
								if (err){
									console.log(err);
								} 
							});
							index = subListOutfits.indexOf(ID);
							subListOutfits.splice(index, 1);
						}
						else if(subCount > 1 && subArray.indexOf(channel.id) > -1){
							//source channel is not only active subscription
							SQLclient.query("DELETE FROM outfit WHERE id="+ID+" AND channel='"+channel.id+"';", (err, res) => {
								if (err){
									console.log(err);
								} 
							});
							channel.send('Unsubscribed from '+resOut.alias);
						}
						else{
							//not subscribed
							channel.send('Error: not subscribed to '+resOut.alias);
						}
					});
				}
			}
		})
	}
	
}