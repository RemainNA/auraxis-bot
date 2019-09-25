// Import the discord.js module
const Discord = require('discord.js');

// Import request for API access
var request = require('request');

// import async
var async = require('async');

//var q = async.queue(function(task, callback){
async function checkPopulation(task, callback){
	server = task.inServer.toLowerCase();
	channel = task.chnl;
	isArena = false;
	switch(server){
		case 'connery':
			options = {uri:'http://ps2.fisu.pw/api/population/?world=1', headers: {'User-Agent': "Auraxis bot"}};
			titleBase = 'Connery Population - ';
			break;
		case 'miller':
			options = {uri:'http://ps2.fisu.pw/api/population/?world=10', headers: {'User-Agent': "Auraxis bot"}};
			titleBase = 'Miller Population - ';
			break;
		case 'cobalt':
			options = {uri:'http://ps2.fisu.pw/api/population/?world=13', headers: {'User-Agent': "Auraxis bot"}};
			titleBase = 'Cobalt Population - ';
			break;
		case 'emerald':
			options = {uri:'http://ps2.fisu.pw/api/population/?world=17', headers: {'User-Agent': "Auraxis bot"}};
			titleBase = 'Emerald Population - ';
			break;
		case 'jaegar':
			options = {uri:'http://ps2.fisu.pw/api/population/?world=19', headers: {'User-Agent': "Auraxis bot"}};
			titleBase = 'Jaegar Population - ';
			break;
		case 'soltech':
			options = {uri:'http://ps2.fisu.pw/api/population/?world=40', headers: {'User-Agent': "Auraxis bot"}};
			titleBase = 'SolTech Population - ';
			break;
		case 'arena':
			options = {uri:'https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v0001/?appid=987350', headers: {'User-Agent': 'Auraxis bot'}};
			isArena = true;
			break;
		default:
			callback();
	}
	if(!isArena){
		try{
			request(options, function (error, response, body) {
				data = JSON.parse(body);
				sendEmbed = new Discord.RichEmbed();
				totalPop = data.result[0].vs + data.result[0].nc + data.result[0].tr + data.result[0].ns;
				sendEmbed.setTitle(titleBase+totalPop);
				sendEmbed.setFooter('From ps2.fisu.pw');
				vsPc = (data.result[0].vs/totalPop)*100;
				vsPc = Number.parseFloat(vsPc).toPrecision(3);
				ncPc = (data.result[0].nc/totalPop)*100;
				ncPc = Number.parseFloat(ncPc).toPrecision(3);
				trPc = (data.result[0].tr/totalPop)*100;
				trPc = Number.parseFloat(trPc).toPrecision(3);
				nsPc = (data.result[0].ns/totalPop)*100;
				nsPc = Number.parseFloat(nsPc).toPrecision(3);
				sendEmbed.addField('VS', data.result[0].vs+" ("+vsPc+"%)", true);
				sendEmbed.addField('NC', data.result[0].nc+" ("+ncPc+"%)", true);
				sendEmbed.addField('TR', data.result[0].tr+" ("+trPc+"%)", true);
				sendEmbed.addField('NSO', data.result[0].ns+" ("+nsPc+"%)", true);
				channel.send(sendEmbed).then(function(result){
					
				}, function(err){
					console.log("Insufficient permission on !population "+server);
					console.log(channel.guild.name);
				});
			})
		}
		catch(e){
			console.log('ps2 pop error');
		}
	}
	else{
		try{
			request(options, function(error, response, body){
				data = JSON.parse(body);
				sendEmbed = new Discord.RichEmbed();
				population = data.response.player_count;
				sendEmbed.setTitle('Planetside Arena Population');
				sendEmbed.addField('Players', population, true);
				sendEmbed.setFooter('From Steam API');
				channel.send(sendEmbed).then(function(result){

				}, function(err){
					console.log("Insufficient permission on !population arena");
					console.log(channel.guild.name);
				});
			})
		}
		catch(e){
			console.log('Arena pop error');
		}
	}
	callback();
}

/*q.drain = function() {
	console.log('Done');
}*/

module.exports = {
	check: function(servers, channel) {
		parsed = servers.split(" ");
		async.eachSeries(parsed, checkPopulation, function(err){
			console.log(err);
		});
		/*for (x in parsed){
			if(parsed[x] != ""){
				console.log(parsed[x]+" population");
				q.push({inServer: parsed[x], chnl: channel}, function (err) {
					
				});
			}
		}	*/
	}
}