// Import the discord.js module
const Discord = require('discord.js');

// Import request for API access
var request = require('request');

var async = require('async');

//commands
var handler = require('./websocketHandler.js');

var WebSocket = require('websocket').client;

var initialize = require('./initializeSQL.js');

//PostgreSQL connection
const { Client } = require('pg');

module.exports = {
	subscribe: function(discordClient, SQLclient) {
		//make sure SQL is set up
		initialize.start(SQLclient);
		
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
						handler.check(parsed, SQLclient, discordClient);
					}
				}
				
			});
		})
		
		discordClient.on('message', message => {
			//listen to discord for subscribe/unsubscribe requests
			if(message.content.substring(0,19) == '!subscribe activity'){
				outfitID(message.content.substring(20).toLowerCase(), 'subscribe', message.channel, SQLclient)
			}
			if(message.content.substring(0,21) == '!unsubscribe activity'){
				outfitID(message.content.substring(22).toLowerCase(), 'unsubscribe', message.channel, SQLclient)
			}
			if (message.content.substring(0,17) == '!subscribe alerts'){
				console.log(message.content);
				if(message.content.substring(18).toLowerCase().includes('connery')){
					queryText = "SELECT count(*) FROM connery WHERE channel='$1'";
					queryValues = [message.channel.id];
					SQLclient.query(queryText, queryValues, (err, res) =>{
						if(err){
							console.log(err);
						}
						else{
							if(res.rows[0].count == 0){
								insertQueryText = "INSERT INTO connery VALUES ('$1')";
								insertQueryValues = [message.channel.id];
								SQLclient.query(insertQueryText, insertQueryValues, (err,res) =>{
									if(err){
										console.log(err);
									}
									else{
										message.channel.send("Subscribed to Connery alerts").then(function(result){
							
										}, function(err){
											console.log("Insufficient permissions on !subscribe alerts connery");
											console.log(message.guild.name);
										});
									}
								})
							}
							else{
								message.channel.send("Error: Already subscribed to Connery alerts").then(function(result){
							
								}, function(err){
									console.log("Insufficient permissions on !subscribe alerts connery error");
									console.log(message.guild.name);
								});
							}
						}
					})
				}
				if(message.content.substring(18).toLowerCase().includes('miller')){
					queryText = "SELECT count(*) FROM miller WHERE channel='$1'";
					queryValues = [message.channel.id];
					SQLclient.query(queryText, queryValues, (err, res) =>{
						if(err){
							console.log(err);
						}
						else{
							if(res.rows[0].count == 0){
								insertQueryText = "INSERT INTO miller VALUES ('$1')";
								insertQueryValues = [message.channel.id];
								SQLclient.query(insertQueryText, insertQueryValues, (err,res) =>{
									if(err){
										console.log(err);
									}
									else{
										message.channel.send("Subscribed to Miller alerts").then(function(result){
							
										}, function(err){
											console.log("Insufficient permissions on !subscribe alerts miller");
											console.log(message.guild.name);
										});
									}
								})
							}
							else{
								message.channel.send("Error: Already subscribed to Miller alerts").then(function(result){
							
								}, function(err){
									console.log("Insufficient permissions on !subscribe alerts miller error");
									console.log(message.guild.name);
								});
							}
						}
					})
				}
				if(message.content.substring(18).toLowerCase().includes('cobalt')){
					queryText = "SELECT count(*) FROM cobalt WHERE channel='$1'";
					queryValues = [message.channel.id];
					SQLclient.query(queryText, queryValues, (err, res) =>{
						if(err){
							console.log(err);
						}
						else{
							if(res.rows[0].count == 0){
								insertQueryText = "INSERT INTO cobalt VALUES ('$1')";
								insertQueryValues = [message.channel.id];
								SQLclient.query(insertQueryText, insertQueryValues, (err,res) =>{
									if(err){
										console.log(err);
									}
									else{
										message.channel.send("Subscribed to Cobalt alerts").then(function(result){
							
										}, function(err){
											console.log("Insufficient permissions on !subscribe alerts cobalt");
											console.log(message.guild.name);
										});
									}
								})
							}
							else{
								message.channel.send("Error: Already subscribed to Cobalt alerts").then(function(result){
							
								}, function(err){
									console.log("Insufficient permissions on !subscribe alerts cobalt error");
									console.log(message.guild.name);
								});
							}
						}
					})
				}
				if(message.content.substring(18).toLowerCase().includes('emerald')){
					queryText = "SELECT count(*) FROM emerald WHERE channel='$1'";
					queryValues = [message.channel.id];
					SQLclient.query(queryText, queryValues, (err, res) =>{
						if(err){
							console.log(err);
						}
						else{
							if(res.rows[0].count == 0){
								insertQueryText = "INSERT INTO emerald VALUES ('$1')";
								insertQueryValues = [message.channel.id];
								SQLclient.query(insertQueryText, insertQueryValues, (err,res) =>{
									if(err){
										console.log(err);
									}
									else{
										message.channel.send("Subscribed to Emerald alerts").then(function(result){
							
										}, function(err){
											console.log("Insufficient permissions on !subscribe alerts emerald");
											console.log(message.guild.name);
										});
									}
								})
							}
							else{
								message.channel.send("Error: Already subscribed to Emerald alerts").then(function(result){
							
								}, function(err){
									console.log("Insufficient permissions on !subscribe alerts emerald error");
									console.log(message.guild.name);
								});
							}
						}
					})
				}
				if(message.content.substring(18).toLowerCase().includes('jaegar')){
					queryText = "SELECT count(*) FROM jaegar WHERE channel='$1'";
					queryValues = [message.channel.id];
					SQLclient.query(queryText, queryValues, (err, res) =>{
						if(err){
							console.log(err);
						}
						else{
							if(res.rows[0].count == 0){
								insertQueryText = "INSERT INTO jaegar VALUES ('$1')";
								insertQueryValues = [message.channel.id];
								SQLclient.query(insertQueryText, insertQueryValues, (err,res) =>{
									if(err){
										console.log(err);
									}
									else{
										message.channel.send("Subscribed to Jaegar alerts").then(function(result){
							
										}, function(err){
											console.log("Insufficient permissions on !subscribe alerts jaegar");
											console.log(message.guild.name);
										});
									}
								})
							}
							else{
								message.channel.send("Error: Already subscribed to Jaegar alerts").then(function(result){
							
								}, function(err){
									console.log("Insufficient permissions on !subscribe alerts jaegar error");
									console.log(message.guild.name);
								});
							}
						}
					})
				}
				if(message.content.substring(18).toLowerCase().includes('briggs')){
					queryText = "SELECT count(*) FROM briggs WHERE channel='$1'";
					queryValues = [message.channel.id];
					SQLclient.query(queryText, queryValues, (err, res) =>{
						if(err){
							console.log(err);
						}
						else{
							if(res.rows[0].count == 0){
								insertQueryText = "INSERT INTO briggs VALUES ('$1')";
								insertQueryValues = [message.channel.id];
								SQLclient.query(insertQueryText, insertQueryValues, (err,res) =>{
									if(err){
										console.log(err);
									}
									else{
										message.channel.send("Subscribed to Briggs alerts").then(function(result){
							
										}, function(err){
											console.log("Insufficient permissions on !subscribe alerts briggs");
											console.log(message.guild.name);
										});
									}
								})
							}
							else{
								message.channel.send("Error: Already subscribed to Briggs alerts").then(function(result){
							
								}, function(err){
									console.log("Insufficient permissions on !subscribe alerts briggs error");
									console.log(message.guild.name);
								});
							}
						}
					})
				}
				if(message.content.substring(18).toLowerCase().includes('soltech')){
					queryText = "SELECT count(*) FROM soltech WHERE channel='$1'";
					queryValues = [message.channel.id];
					SQLclient.query(queryText, queryValues, (err, res) =>{
						if(err){
							console.log(err);
						}
						else{
							if(res.rows[0].count == 0){
								insertQueryText = "INSERT INTO soltech VALUES ('$1')";
								insertQueryValues = [message.channel.id];
								SQLclient.query(insertQueryText, insertQueryValues, (err,res) =>{
									if(err){
										console.log(err);
									}
									else{
										message.channel.send("Subscribed to SolTech alerts").then(function(result){
							
										}, function(err){
											console.log("Insufficient permissions on !subscribe alerts soltech");
											console.log(message.guild.name);
										});
									}
								})
							}
							else{
								message.channel.send("Error: Already subscribed to Soltech alerts").then(function(result){
							
								}, function(err){
									console.log("Insufficient permissions on !subscribe alerts soltech error");
									console.log(message.guild.name);
								});
							}
						}
					})
				}
			}
			if (message.content.substring(0,19) == '!unsubscribe alerts'){
				if(message.content.substring(20).toLowerCase().includes('connery')){
					queryText = "SELECT count(*) FROM connery WHERE channel='$1'";
					queryValues = [message.channel.id];
					SQLclient.query(queryText, queryValues, (err, res) =>{
						if(err){
							console.log(err);
						}
						else{
							if(res.rows[0].count > 0){
								removeQueryText = "DELETE FROM connery WHERE channel='$1'";
								removeQueryValues = [message.channel.id];
								SQLclient.query(removeQueryText, removeQueryValues, (err,res) =>{
									if(err){
										console.log(err);
									}
									else{
										message.channel.send("Unsubscribed from Connery alerts").then(function(result){
							
										}, function(err){
											console.log("Insufficient permissions on !unsubscribe alerts connery");
											console.log(message.guild.name);
										});
									}
								})
							}
							else{
								message.channel.send("Error: Not subscribed to Connery alerts").then(function(result){
							
								}, function(err){
									console.log("Insufficient permissions on !unsubscribe alerts connery error");
									console.log(message.guild.name);
								});
							}
						}
					})
				}
				if(message.content.substring(20).toLowerCase().includes('cobalt')){
					queryText = "SELECT count(*) FROM cobalt WHERE channel='$1'";
					queryValues = [message.channel.id];
					SQLclient.query(queryText, queryValues, (err, res) =>{
						if(err){
							console.log(err);
						}
						else{
							if(res.rows[0].count > 0){
								removeQueryText = "DELETE FROM cobalt WHERE channel='$1'";
								removeQueryValues = [message.channel.id];
								SQLclient.query(removeQueryText, removeQueryValues, (err,res) =>{
									if(err){
										console.log(err);
									}
									else{
										message.channel.send("Unsubscribed from Cobalt alerts").then(function(result){
							
										}, function(err){
											console.log("Insufficient permissions on !unsubscribe alerts cobalt");
											console.log(message.guild.name);
										});
									}
								})
							}
							else{
								message.channel.send("Error: Not subscribed to Cobalt alerts").then(function(result){
							
								}, function(err){
									console.log("Insufficient permissions on !unsubscribe alerts cobalt error");
									console.log(message.guild.name);
								});
							}
						}
					})
				}
				if(message.content.substring(20).toLowerCase().includes('miller')){
					queryText = "SELECT count(*) FROM miller WHERE channel='$1'";
					queryValues = [message.channel.id];
					SQLclient.query(queryText, queryValues, (err, res) =>{
						if(err){
							console.log(err);
						}
						else{
							if(res.rows[0].count > 0){
								removeQueryText = "DELETE FROM milller WHERE channel='$1'";
								removeQueryValues = [message.channel.id];
								SQLclient.query(removeQueryText, removeQueryValues, (err,res) =>{
									if(err){
										console.log(err);
									}
									else{
										message.channel.send("Unsubscribed from Miller alerts").then(function(result){
							
										}, function(err){
											console.log("Insufficient permissions on !unsubscribe alerts miller");
											console.log(message.guild.name);
										});
									}
								})
							}
							else{
								message.channel.send("Error: Not subscribed to Miller alerts").then(function(result){
							
								}, function(err){
									console.log("Insufficient permissions on !unsubscribe alerts miller error");
									console.log(message.guild.name);
								});
							}
						}
					})
				}
				if(message.content.substring(20).toLowerCase().includes('emerald')){
					queryText = "SELECT count(*) FROM emerald WHERE channel='$1'";
					queryValues = [message.channel.id];
					SQLclient.query(queryText, queryValues, (err, res) =>{
						if(err){
							console.log(err);
						}
						else{
							if(res.rows[0].count > 0){
								removeQueryText = "DELETE FROM emerald WHERE channel='$1'";
								removeQueryValues = [message.channel.id];
								SQLclient.query(removeQueryText, removeQueryValues, (err,res) =>{
									if(err){
										console.log(err);
									}
									else{
										message.channel.send("Unsubscribed from Emerald alerts").then(function(result){
							
										}, function(err){
											console.log("Insufficient permissions on !unsubscribe alerts emerald");
											console.log(message.guild.name);
										});
									}
								})
							}
							else{
								message.channel.send("Error: Not subscribed to Emerald alerts").then(function(result){
							
								}, function(err){
									console.log("Insufficient permissions on !unsubscribe alerts emerald error");
									console.log(message.guild.name);
								});
							}
						}
					})
				}
				if(message.content.substring(20).toLowerCase().includes('jaegar')){
					queryText = "SELECT count(*) FROM jaegar WHERE channel='$1'";
					queryValues = [message.channel.id];
					SQLclient.query(queryText, queryValues, (err, res) =>{
						if(err){
							console.log(err);
						}
						else{
							if(res.rows[0].count > 0){
								removeQueryText = "DELETE FROM jaegar WHERE channel='$1'";
								removeQueryValues = [message.channel.id];
								SQLclient.query(removeQueryText, removeQueryValues, (err,res) =>{
									if(err){
										console.log(err);
									}
									else{
										message.channel.send("Unsubscribed from Jaegar alerts").then(function(result){
							
										}, function(err){
											console.log("Insufficient permissions on !unsubscribe alerts jaegar");
											console.log(message.guild.name);
										});
									}
								})
							}
							else{
								message.channel.send("Error: Not subscribed to Jaegar alerts").then(function(result){
							
								}, function(err){
									console.log("Insufficient permissions on !unsubscribe alerts jaegar error");
									console.log(message.guild.name);
								});
							}
						}
					})
				}
				if(message.content.substring(20).toLowerCase().includes('briggs')){
					queryText = "SELECT count(*) FROM briggs WHERE channel='$1'";
					queryValues = [message.channel.id];
					SQLclient.query(queryText, queryValues, (err, res) =>{
						if(err){
							console.log(err);
						}
						else{
							if(res.rows[0].count > 0){
								removeQueryText = "DELETE FROM briggs WHERE channel='$1'";
								removeQueryValues = [message.channel.id];
								SQLclient.query(removeQueryText, removeQueryValues, (err,res) =>{
									if(err){
										console.log(err);
									}
									else{
										message.channel.send("Unsubscribed from Briggs alerts").then(function(result){
							
										}, function(err){
											console.log("Insufficient permissions on !unsubscribe alerts briggs");
											console.log(message.guild.name);
										});
									}
								})
							}
							else{
								message.channel.send("Error: Not subscribed to Briggs alerts").then(function(result){
							
								}, function(err){
									console.log("Insufficient permissions on !unsubscribe alerts briggs error");
									console.log(message.guild.name);
								});
							}
						}
					})
				}
				if(message.content.substring(20).toLowerCase().includes('soltech')){
					queryText = "SELECT count(*) FROM soltech WHERE channel='$1'";
					queryValues = [message.channel.id];
					SQLclient.query(queryText, queryValues, (err, res) =>{
						if(err){
							console.log(err);
						}
						else{
							if(res.rows[0].count > 0){
								removeQueryText = "DELETE FROM soltech WHERE channel='$1'";
								removeQueryValues = [message.channel.id];
								SQLclient.query(removeQueryText, removeQueryValues, (err,res) =>{
									if(err){
										console.log(err);
									}
									else{
										message.channel.send("Unsubscribed from SolTech alerts").then(function(result){
							
										}, function(err){
											console.log("Insufficient permissions on !unsubscribe alerts soltech");
											console.log(message.guild.name);
										});
									}
								})
							}
							else{
								message.channel.send("Error: Not subscribed to SolTech alerts").then(function(result){
							
								}, function(err){
									console.log("Insufficient permissions on !unsubscribe alerts soltech error");
									console.log(message.guild.name);
								});
							}
						}
					})
				}
			}
		})
	}
}

//handle outfit activity requests, grabs outfit id and adds/removes from arrays
function outfitID(oTagLong, action, channel, SQLclient){
	oTagList = oTagLong.split(" ");
	for (x in oTagList){
		if (oTagList[x] != ""){
			oTag = oTagList[x];
		}
		else{
			continue;
		}
		uri = 'http://census.daybreakgames.com/s:'+process.env.serviceID+'/get/ps2:v2/outfit?alias_lower='+oTag+'&c:join=character^on:leader_character_id^to:character_id';
		var options = {uri:uri, action:action, channel:channel, oTag:oTag}
		request(options, function(error, respose, body){
			data = JSON.parse(body)
			if(data.outfit_list[0] == null){
				//outfit not found
				channel.send(oTag+' not found').then(function(result){
					
				}, function(err){
					console.log("Insufficient permissions on outfitID tag not found");
					console.log(channel.guild.name);
				});
			}
			else{
				//tag found, returned results
				ID = data.outfit_list[0].outfit_id;
				resOut = data.outfit_list[0];
				
				if(action == 'subscribe'){
					queryText = "SELECT COUNT(channel) FROM outfit WHERE id=$1 AND channel='$2'";
					queryValues = [ID, channel.id];
					SQLclient.query(queryText, queryValues, (err, res) => {
						if(err){
							console.log(err);
							channel.send("An error occurred, unable to process request").then(function(result){
								
							}, function(err){
								console.log("Insufficient permissions on SQL error 1");
								console.log(channel.guild.name);
							});
						}
						else{
							if (res.rows[0].count == 0){
								//channel is not subscribed
								if(resOut.leader_character_id_join_character.faction_id == "1"){
									color = 'PURPLE';
								}
								else if(resOut.leader_character_id_join_character.faction_id == "2"){
									color = 'BLUE';
								}
								else if(resOut.leader_character_id_join_character.faction_id == "3"){
									color = 'RED';
								}
								else{
									color = 'GREY';
								}
								subscribeQueryText = "INSERT INTO outfit (id, alias, color, channel) VALUES ($1, '$'2, '$3', '$4')";
								subscribeQueryValues = [ID, resOut.alias, color, channel.id];
								SQLclient.query(subscribeQueryText, subscribeQueryValues, (err, res) => {
									if(err){
										console.log(err);
									}
									else{
										channel.send("Subscribed to "+resout.alias).then(function(result){
								
										}, function(err){
											console.log("Insufficient permissions on subscribe success");
											console.log(channel.guild.name);
										});
									}
								});
							}
							else{
								//channel is already subscribed
								channel.send("Error: already subscribed to "+resOut.alias).then(function(result){
									
								}, function(err){
									console.log("Insufficient permissions on !subscribe activity already subscribed");
									console.log(channel.guild.name);
								});
							};
						}
					});
				}
				else if(action == 'unsubscribe'){
					queryText = "SELECT COUNT(channel) FROM outfit WHERE id=$1 AND channel='$2'";
					queryValues = [ID, channel.id];
					SQLclient.query(queryText, queryValues, (err, res) => {
						if(err){
							console.log(err);
							channel.send("An error occurred, unable to process request").then(function(result){
								
							}, function(err){
								console.log("Insufficient permissions on SQL error 2");
								console.log(channel.guild.name);
							});
						}
						else{
							if (res.rows[0].count > 0){
								//channel is subscribed
								subscribeQueryText = "DELETE FROM outfit WHERE id=$1 and channel='$2'";
								subscribeQueryValues = [ID, channel.id];
								SQLclient.query(subscribeQueryText, subscribeQueryValues, (err, res) => {
									if(err){
										console.log(err);
									}
									else{
										channel.send("Unsubscribed from "+resout.alias).then(function(result){
								
										}, function(err){
											console.log("Insufficient permissions on subscribe success");
											console.log(channel.guild.name);
										});
									}
								});
							}
							else{
								//channel is not subscribed
								channel.send("Error: not subscribed to "+resOut.alias).then(function(result){
									
								}, function(err){
									console.log("Insufficient permissions on !unsubscribe activity not subscribed");
									console.log(channel.guild.name);
								});
							};
						}
					});
				}
			}
		})
	}
	
}