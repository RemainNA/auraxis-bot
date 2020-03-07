// Import the discord.js module
const Discord = require('discord.js');

// Import request for API access
var request = require('request');

var async = require('async');

//commands
var handlerUS = require('./websocketHandlerUS.js');

var WebSocket = require('ws');

//PostgreSQL connection
const { Client } = require('pg');

module.exports = {
	subscribe: function(discordClient, SQLclient) {
		//subscription messages to send to websocket
		let subscribeRequestLogin = '{"service":"event","action":"subscribe","worlds":["1000"],"eventNames":["PlayerLogin","PlayerLogout"]}'
		let subscribeRequestAlerts = '{"service":"event","action":"subscribe","worlds":["1000"],"eventNames":["MetagameEvent"]}';
		uri = 'wss://push.planetside2.com/streaming?environment=ps2ps4us&service-id=s:'+process.env.serviceID;

		var client = new WebSocket(uri);
		
		client.on('open', function open() {
			console.log('Connected to PS4 US Stream API')
			client.send(subscribeRequestAlerts);
			client.send(subscribeRequestLogin);
		})

		client.on('message', function incoming(data) {
			let parsed = JSON.parse(data);
			if(parsed.payload != null){
				handlerUS.check(parsed, SQLclient, discordClient);
			}
		})

		client.on('error', function err(error) {
			console.log(error);
		})
		
		discordClient.on('message', message => {
			//listen to discord for subscribe/unsubscribe requests
			if(message.content.substring(0,25) == '!ps4us subscribe activity'){
				outfitID(message.content.substring(26).toLowerCase(), 'subscribe', message.channel, SQLclient)
			}
			if(message.content.substring(0,27) == '!ps4us unsubscribe activity'){
				outfitID(message.content.substring(28).toLowerCase(), 'unsubscribe', message.channel, SQLclient)
			}
			if (message.content.substring(0,17) == '!subscribe alerts'){
				console.log(message.content);
				if(message.content.substring(18).toLowerCase().includes('genudine')){
					queryText = "SELECT count(*) FROM genudine WHERE channel=$1";
					queryValues = [message.channel.id];
					SQLclient.query(queryText, queryValues, (err, res) =>{
						if(err){
							console.log(err);
						}
						else{
							if(res.rows[0].count == 0){
								insertQueryText = "INSERT INTO genudine VALUES ($1)";
								insertQueryValues = [message.channel.id];
								SQLclient.query(insertQueryText, insertQueryValues, (err,res) =>{
									if(err){
										console.log(err);
									}
									else{
										message.channel.send("Subscribed to Genudine alerts").then(function(result){
							
										}, function(err){
											console.log("Insufficient permissions on !subscribe alerts genudine");
											console.log(message.guild.name);
										});
									}
								})
							}
							else{
								message.channel.send("Error: Already subscribed to Genudine alerts").then(function(result){
							
								}, function(err){
									console.log("Insufficient permissions on !subscribe alerts genudine error");
									console.log(message.guild.name);
								});
							}
						}
					})
				}
			}
			if (message.content.substring(0,19) == '!unsubscribe alerts'){
				if(message.content.substring(20).toLowerCase().includes('genudine')){
					queryText = "SELECT count(*) FROM genudine WHERE channel=$1";
					queryValues = [message.channel.id];
					SQLclient.query(queryText, queryValues, (err, res) =>{
						if(err){
							console.log(err);
						}
						else{
							if(res.rows[0].count > 0){
								removeQueryText = "DELETE FROM genudine WHERE channel=$1";
								removeQueryValues = [message.channel.id];
								SQLclient.query(removeQueryText, removeQueryValues, (err,res) =>{
									if(err){
										console.log(err);
									}
									else{
										message.channel.send("Unsubscribed from Genudine alerts").then(function(result){
							
										}, function(err){
											console.log("Insufficient permissions on !unsubscribe alerts genudine");
											console.log(message.guild.name);
										});
									}
								})
							}
							else{
								message.channel.send("Error: Not subscribed to Genudine alerts").then(function(result){
							
								}, function(err){
									console.log("Insufficient permissions on !unsubscribe alerts genudine error");
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
		uri = 'http://census.daybreakgames.com/s:'+process.env.serviceID+'/get/ps2ps4us:v2/outfit?alias_lower='+oTag+'&c:join=character^on:leader_character_id^to:character_id';
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
					queryText = "SELECT COUNT(channel) FROM ps4usoutfit WHERE id=$1 AND channel=$2";
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
								subscribeQueryText = "INSERT INTO ps4usoutfit (id, alias, color, channel) VALUES ($1, $2, $3, $4)";
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
					queryText = "SELECT COUNT(channel) FROM ps4usoutfit WHERE id=$1 AND channel=$2";
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
								subscribeQueryText = "DELETE FROM ps4usoutfit WHERE id=$1 and channel=$2";
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