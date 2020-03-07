// Import the discord.js module
const Discord = require('discord.js');

const { Client } = require('pg');

// Import request for API access
var request = require('request');

// import async
var async = require('async');

var qu = async.queue(function(task, callback) {
	message = task.msg;
	SQLclient = task.SClient;
	discordClient = task.dClient;
	//if message is a login/out event
	if(message.payload.character_id != null){
		character_id = message.payload.character_id;
		playerEvent = message.payload.event_name.substring(6);
		uri = 'https://census.daybreakgames.com/s:'+process.env.serviceID+'/get/ps2ps4eu:v2/character/'+character_id+'?c:resolve=outfit_member'
		//lookup character info and outfit membership
		var options = {uri:uri, playerEvent:playerEvent}
		request(options, function (error, response, body) {
			if(body != null && body != undefined){
				try{
					data = JSON.parse(body);
				}
				catch(e){
					console.log('Error with '+JSON.stringify(message.payload));
					//callback();
				}
				if (data == undefined || data.character_list == null)
				{
					callback();
				}
				else{
					resChar = data.character_list[0];
					if(resChar != null && resChar.outfit_member != null){
							//create and send rich embed to all subscribed channels
						queryText = "SELECT * FROM outfit WHERE id=$1";
						queryValues = [resChar.outfit_member.outfit_id];
						SQLclient.query(queryText, queryValues, (err, res) => {
							if (err){
								console.log(err);
							} 
							if (res.rows.length > 0){
								sendEmbed = new Discord.RichEmbed();
								sendEmbed.setTitle(res.rows[0].alias+' '+playerEvent);
								sendEmbed.setDescription(resChar.name.first);
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
								else //NSO
								{
									sendEmbed.setColor('GREY');
								}
								for (let row of res.rows){
									resChann = discordClient.channels.get(row.channel);
									if(resChann != undefined){
										resChann.send(sendEmbed).then(function(result){
											
										}, function(err){
											console.log("Insufficient permissions on outfit activity message");
											console.log(resChann.guild.name);
										});
									}
									//in case channel is deleted or otherwise inaccessible
									else{
										removeQueryText = "DELETE FROM outfit WHERE id=$1 AND channel=$2";
										removeQueryValues = [resChar.outfit_member.outfit_id, row.channel];
										SQLclient.query(removeQueryText, removeQueryValues, (err, res) => {
											if (err){
												console.log(err);
											} 
										});
									}
								}
								callback();
							}
							else{
								callback();
							}
						});
						
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
	//alert notification
	else if(message.payload.metagame_event_state_name != null){
		console.log('Alert notification');
		//ignore ending alerts
		if(message.payload.metagame_event_state_name == "started"){
			console.log("Alert start")
			url = 'https://census.daybreakgames.com/s:'+process.env.serviceID+'/get/ps2ps4eu:v2/metagame_event/'+message.payload.metagame_event_id;
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
							sendEmbed.setTimestamp();
							//color rich embed based on starting faction if applicable
							if (resEvent.name.en.includes('Enlightenment')){
								sendEmbed.setColor('PURPLE');
							}
							else if (resEvent.name.en.includes('Liberation')){
								sendEmbed.setColor('BLUE');
							}
							else if (resEvent.name.en.includes('Superiority')){
								sendEmbed.setColor('RED');
							}
							//add server to embed
							sendEmbed.addField('Server', 'Ceres', true);
							queryText = "SELECT * from ceres";
							removeQueryText = "DELETE from ceres WHERE channel=$1";
							//pull list of subscriptions from SQL
							SQLclient.query(queryText, (err, res) => {
								if(err){
									console.log(err);
								}
								else{
									for (let row of res.rows){
										//send notification
										resChann = discordClient.channels.get(row.channel);
										if(resChann != undefined){
											resChann.send(sendEmbed).then(function(result){
												
											}, function(err){
												console.log("Insufficient permissions on alert notification");
												console.log(resChann.guild.name);
											});
										}
										else{
											removeQueryValues = [row.channel];
											SQLclient.query(removeQueryText, removeQueryValues, (err, res) => {
												if(err){
													console.log(err);
												}
											});
										}
									}
								}
								callback();
							});
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
	check: function(message, SQLclient, discordClient){ 
		qu.push({msg: message, SClient: SQLclient, dClient: discordClient}, function(err) {
			
		})
	}
}