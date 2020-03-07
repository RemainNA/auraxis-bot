// Import the discord.js module
const Discord = require('discord.js');

// Import request for API access
var request = require('request');

var async = require('async');

//commands
var handlerEU = require('./websocketHandlerEU.js');

var WebSocket = require('ws');

//PostgreSQL connection
const { Client } = require('pg');

module.exports = {
	subscribe: function(discordClient, SQLclient) {
		//subscription messages to send to websocket
		let subscribeRequestLogin = '{"service":"event","action":"subscribe","worlds":["2000"],"eventNames":["PlayerLogin","PlayerLogout"]}'
		let subscribeRequestAlerts = '{"service":"event","action":"subscribe","worlds":["2000"],"eventNames":["MetagameEvent"]}';
		uri = 'wss://push.planetside2.com/streaming?environment=ps2ps4eu&service-id=s:'+process.env.serviceID;
		console.log(uri);
		var client = new WebSocket(uri);
		
		// client.connect('wss://push.planetside2.com/streaming?environment=ps2ps4eu&service-id=s:'+process.env.serviceID);
		
		client.on('open', function open() {
			client.send(subscribeRequestAlerts);
			client.send(subscribeRequestLogin);
		})

		client.on('message', function incoming(data) {
			let parsed = JSON.parse(data);
			if(parsed.payload != null){
				handlerEU.check(parsed, SQLclient, discordClient);
			}
		})

		client.on('error', function err(error) {
			console.log(error);
		})

		// client.on('connectFailed', function(error){
		// 	console.log('Connection failed: '+error);
		// });
		
		// client.on('connect', function(connection) {
		// 	console.log('Connected to Stream API');
		// 	connection.sendUTF(subscribeRequestLogin);
		// 	connection.sendUTF(subscribeRequestAlerts);
			
		// 	connection.on('error', function(error){
		// 		console.log("Connection error: " +error);
		// 	});
			
		// 	connection.on('close', function(){
		// 		console.log("Connection closed");
		// 		client.connect('wss://push.planetside2.com/streaming?environment=ps2ps4eu&service-id=s:'+process.env.serviceID);
		// 	});
			
		// 	connection.on('message', function(message){
		// 		//on message parse JSON and send to handler
		// 		if(message.utf8Data != null && message.utf8Data != undefined){
		// 			try{
		// 				parsed = JSON.parse(message.utf8Data);
		// 			}
		// 			catch(e){
		// 				console.log('JSON parse error: '+message.utf8Data);
		// 			}
		// 			if(parsed.payload != null){
		// 				handlerEU.check(parsed, SQLclient, discordClient);
		// 			}
		// 		}
				
		// 	});
		// })
		
		discordClient.on('message', message => {
			//listen to discord for subscribe/unsubscribe requests
			if(message.content.substring(0,25) == '!ps4eu subscribe activity'){
				outfitID(message.content.substring(26).toLowerCase(), 'subscribe', message.channel, SQLclient)
			}
			if(message.content.substring(0,27) == '!ps4eu unsubscribe activity'){
				outfitID(message.content.substring(28).toLowerCase(), 'unsubscribe', message.channel, SQLclient)
			}
			if (message.content.substring(0,17) == '!subscribe alerts'){
				console.log(message.content);
				if(message.content.substring(18).toLowerCase().includes('ceres')){
					queryText = "SELECT count(*) FROM ceres WHERE channel=$1";
					queryValues = [message.channel.id];
					SQLclient.query(queryText, queryValues, (err, res) =>{
						if(err){
							console.log(err);
						}
						else{
							if(res.rows[0].count == 0){
								insertQueryText = "INSERT INTO ceres VALUES ($1)";
								insertQueryValues = [message.channel.id];
								SQLclient.query(insertQueryText, insertQueryValues, (err,res) =>{
									if(err){
										console.log(err);
									}
									else{
										message.channel.send("Subscribed to Ceres alerts").then(function(result){
							
										}, function(err){
											console.log("Insufficient permissions on !subscribe alerts ceres");
											console.log(message.guild.name);
										});
									}
								})
							}
							else{
								message.channel.send("Error: Already subscribed to Ceres alerts").then(function(result){
							
								}, function(err){
									console.log("Insufficient permissions on !subscribe alerts ceres error");
									console.log(message.guild.name);
								});
							}
						}
					})
				}
			}
			if (message.content.substring(0,19) == '!unsubscribe alerts'){
				if(message.content.substring(20).toLowerCase().includes('ceres')){
					queryText = "SELECT count(*) FROM ceres WHERE channel=$1";
					queryValues = [message.channel.id];
					SQLclient.query(queryText, queryValues, (err, res) =>{
						if(err){
							console.log(err);
						}
						else{
							if(res.rows[0].count > 0){
								removeQueryText = "DELETE FROM ceres WHERE channel=$1";
								removeQueryValues = [message.channel.id];
								SQLclient.query(removeQueryText, removeQueryValues, (err,res) =>{
									if(err){
										console.log(err);
									}
									else{
										message.channel.send("Unsubscribed from Ceres alerts").then(function(result){
							
										}, function(err){
											console.log("Insufficient permissions on !unsubscribe alerts ceres");
											console.log(message.guild.name);
										});
									}
								})
							}
							else{
								message.channel.send("Error: Not subscribed to Ceres alerts").then(function(result){
							
								}, function(err){
									console.log("Insufficient permissions on !unsubscribe alerts ceres error");
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
		uri = 'http://census.daybreakgames.com/s:'+process.env.serviceID+'/get/ps2ps4eu:v2/outfit?alias_lower='+oTag+'&c:join=character^on:leader_character_id^to:character_id';
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
					queryText = "SELECT COUNT(channel) FROM ps4euoutfit WHERE id=$1 AND channel=$2";
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
								subscribeQueryText = "INSERT INTO ps4euoutfit (id, alias, color, channel) VALUES ($1, $2, $3, $4)";
								subscribeQueryValues = [ID, resOut.alias, color, channel.id];
								SQLclient.query(subscribeQueryText, subscribeQueryValues, (err, res) => {
									if(err){
										console.log(err);
									}
									else{
										channel.send("Subscribed to "+resOut.alias).then(function(result){
								
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
					queryText = "SELECT COUNT(channel) FROM ps4euoutfit WHERE id=$1 AND channel=$2";
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
								subscribeQueryText = "DELETE FROM ps4euoutfit WHERE id=$1 and channel=$2";
								subscribeQueryValues = [ID, channel.id];
								SQLclient.query(subscribeQueryText, subscribeQueryValues, (err, res) => {
									if(err){
										console.log(err);
									}
									else{
										channel.send("Unsubscribed from "+resOut.alias).then(function(result){
								
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