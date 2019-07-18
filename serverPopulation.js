// Import the discord.js module
const Discord = require('discord.js');

// Import request for API access
var request = require('request');

// import async
var async = require('async');

var q = async.queue(function(task, callback){
	servers = task.sList.toLowerCase();
	channel = task.chnl;
	//using if instead of else if allows for multiple server population checks in one command
	if(servers.includes('connery')){
		//call fisu api.  User agent is because fisu will refuse connections without one
		options = {uri:'http://ps2.fisu.pw/api/population/?world=1', headers: {'User-Agent': "Auraxis bot"}};
		try{
			request(options, function (error, response, body) {
				//console.log(body);
				data = JSON.parse(body);
				sendEmbed = new Discord.RichEmbed();
				totalPop = data.result[0].vs + data.result[0].nc + data.result[0].tr;
				sendEmbed.setTitle('Connery Population - '+totalPop);
				sendEmbed.setFooter('From ps2.fisu.pw');
				vsPc = (data.result[0].vs/totalPop)*100;
				vsPc = Number.parseFloat(vsPc).toPrecision(3);
				ncPc = (data.result[0].nc/totalPop)*100;
				ncPc = Number.parseFloat(ncPc).toPrecision(3);
				trPc = (data.result[0].tr/totalPop)*100;
				trPc = Number.parseFloat(trPc).toPrecision(3);
				sendEmbed.addField('VS', data.result[0].vs+" ("+vsPc+"%)", true);
				sendEmbed.addField('NC', data.result[0].nc+" ("+ncPc+"%)", true);
				sendEmbed.addField('TR', data.result[0].tr+" ("+trPc+"%)", true);
				channel.send(sendEmbed).then(function(result){
					
				}, function(err){
					console.log("Insufficient permission on !population connery");
					console.log(channel.guild.name);
				});
			})
		}
		catch(e){
			console.log('connery pop error');
		}
	}
	if(servers.includes('miller')){
		options = {uri:'http://ps2.fisu.pw/api/population/?world=10', headers: {'User-Agent': "Auraxis bot"}};
		try{
			request(options, function (error, response, body) {
				//console.log(body);
				data = JSON.parse(body);
				sendEmbed = new Discord.RichEmbed();
				totalPop = data.result[0].vs + data.result[0].nc + data.result[0].tr;
				sendEmbed.setTitle('Miller Population - '+totalPop);
				sendEmbed.setFooter('From ps2.fisu.pw');
				vsPc = (data.result[0].vs/totalPop)*100;
				vsPc = Number.parseFloat(vsPc).toPrecision(3);
				ncPc = (data.result[0].nc/totalPop)*100;
				ncPc = Number.parseFloat(ncPc).toPrecision(3);
				trPc = (data.result[0].tr/totalPop)*100;
				trPc = Number.parseFloat(trPc).toPrecision(3);
				sendEmbed.addField('VS', data.result[0].vs+" ("+vsPc+"%)", true);
				sendEmbed.addField('NC', data.result[0].nc+" ("+ncPc+"%)", true);
				sendEmbed.addField('TR', data.result[0].tr+" ("+trPc+"%)", true);
				channel.send(sendEmbed).then(function(result){
					
				}, function(err){
					console.log("Insufficient permission on !population miller");
					console.log(channel.guild.name);
				});
			})
		}
		catch(e){
			console.log('miller pop error');
		}
	}
	if(servers.includes('cobalt')){
		options = {uri:'http://ps2.fisu.pw/api/population/?world=13', headers: {'User-Agent': "Auraxis bot"}};
		try{
			request(options, function (error, response, body) {
				//console.log(body);
				data = JSON.parse(body);
				sendEmbed = new Discord.RichEmbed();
				totalPop = data.result[0].vs + data.result[0].nc + data.result[0].tr;
				sendEmbed.setTitle('Cobalt Population - '+totalPop);
				sendEmbed.setFooter('From ps2.fisu.pw');
				vsPc = (data.result[0].vs/totalPop)*100;
				vsPc = Number.parseFloat(vsPc).toPrecision(3);
				ncPc = (data.result[0].nc/totalPop)*100;
				ncPc = Number.parseFloat(ncPc).toPrecision(3);
				trPc = (data.result[0].tr/totalPop)*100;
				trPc = Number.parseFloat(trPc).toPrecision(3);
				sendEmbed.addField('VS', data.result[0].vs+" ("+vsPc+"%)", true);
				sendEmbed.addField('NC', data.result[0].nc+" ("+ncPc+"%)", true);
				sendEmbed.addField('TR', data.result[0].tr+" ("+trPc+"%)", true);
				channel.send(sendEmbed).then(function(result){
					
				}, function(err){
					console.log("Insufficient permission on !population cobalt");
					console.log(channel.guild.name);
				});
			})
		}
		catch(e){
			console.log('cobalt pop error');
		}
	}
	if(servers.includes('emerald')){
		options = {uri:'http://ps2.fisu.pw/api/population/?world=17', headers: {'User-Agent': "Auraxis bot"}};
		try{
			request(options, function (error, response, body) {
				//console.log(body);
				data = JSON.parse(body);
				sendEmbed = new Discord.RichEmbed();
				totalPop = data.result[0].vs + data.result[0].nc + data.result[0].tr;
				sendEmbed.setTitle('Emerald Population - '+totalPop);
				sendEmbed.setFooter('From ps2.fisu.pw');
				vsPc = (data.result[0].vs/totalPop)*100;
				vsPc = Number.parseFloat(vsPc).toPrecision(3);
				ncPc = (data.result[0].nc/totalPop)*100;
				ncPc = Number.parseFloat(ncPc).toPrecision(3);
				trPc = (data.result[0].tr/totalPop)*100;
				trPc = Number.parseFloat(trPc).toPrecision(3);
				sendEmbed.addField('VS', data.result[0].vs+" ("+vsPc+"%)", true);
				sendEmbed.addField('NC', data.result[0].nc+" ("+ncPc+"%)", true);
				sendEmbed.addField('TR', data.result[0].tr+" ("+trPc+"%)", true);
				channel.send(sendEmbed).then(function(result){
					
				}, function(err){
					console.log("Insufficient permission on !population emerald");
					console.log(channel.guild.name);
				});
			})
		}
		catch(e){
			console.log('emerald pop error');
		}
	}
	if(servers.includes('jaegar')){
		options = {uri:'http://ps2.fisu.pw/api/population/?world=19', headers: {'User-Agent': "Auraxis bot"}};
		try{
			request(options, function (error, response, body) {
				//console.log(body);
				data = JSON.parse(body);
				sendEmbed = new Discord.RichEmbed();
				totalPop = data.result[0].vs + data.result[0].nc + data.result[0].tr;
				sendEmbed.setTitle('Jaegar Population - '+totalPop);
				sendEmbed.setFooter('From ps2.fisu.pw');
				vsPc = (data.result[0].vs/totalPop)*100;
				vsPc = Number.parseFloat(vsPc).toPrecision(3);
				ncPc = (data.result[0].nc/totalPop)*100;
				ncPc = Number.parseFloat(ncPc).toPrecision(3);
				trPc = (data.result[0].tr/totalPop)*100;
				trPc = Number.parseFloat(trPc).toPrecision(3);
				sendEmbed.addField('VS', data.result[0].vs+" ("+vsPc+"%)", true);
				sendEmbed.addField('NC', data.result[0].nc+" ("+ncPc+"%)", true);
				sendEmbed.addField('TR', data.result[0].tr+" ("+trPc+"%)", true);
				channel.send(sendEmbed).then(function(result){
					
				}, function(err){
					console.log("Insufficient permission on !population jaegar");
					console.log(channel.guild.name);
				});
			})
		}
		catch(e){
			console.log('jaegar pop error');
		}
	}
	if(servers.includes('briggs')){
		options = {uri:'http://ps2.fisu.pw/api/population/?world=25', headers: {'User-Agent': "Auraxis bot"}};
		try{
			request(options, function (error, response, body) {
				//console.log(body);
				data = JSON.parse(body);
				sendEmbed = new Discord.RichEmbed();
				totalPop = data.result[0].vs + data.result[0].nc + data.result[0].tr;
				sendEmbed.setTitle('Briggs Population - '+totalPop);
				sendEmbed.setFooter('From ps2.fisu.pw');
				vsPc = (data.result[0].vs/totalPop)*100;
				vsPc = Number.parseFloat(vsPc).toPrecision(3);
				ncPc = (data.result[0].nc/totalPop)*100;
				ncPc = Number.parseFloat(ncPc).toPrecision(3);
				trPc = (data.result[0].tr/totalPop)*100;
				trPc = Number.parseFloat(trPc).toPrecision(3);
				sendEmbed.addField('VS', data.result[0].vs+" ("+vsPc+"%)", true);
				sendEmbed.addField('NC', data.result[0].nc+" ("+ncPc+"%)", true);
				sendEmbed.addField('TR', data.result[0].tr+" ("+trPc+"%)", true);
				channel.send(sendEmbed).then(function(result){
					
				}, function(err){
					console.log("Insufficient permission on !population briggs");
					console.log(channel.guild.name);
				});
			})
		}
		catch(e){
			console.log('Briggs pop error');
		}
	}
	if(servers.includes('soltech')){
		options = {uri:'http://ps2.fisu.pw/api/population/?world=40', headers: {'User-Agent': "Auraxis bot"}};
		try{
			request(options, function (error, response, body) {
				//console.log(body);
				data = JSON.parse(body);
				sendEmbed = new Discord.RichEmbed();
				totalPop = data.result[0].vs + data.result[0].nc + data.result[0].tr;
				sendEmbed.setTitle('SolTech Population - '+totalPop);
				sendEmbed.setFooter('From ps2.fisu.pw');
				vsPc = (data.result[0].vs/totalPop)*100;
				vsPc = Number.parseFloat(vsPc).toPrecision(3);
				ncPc = (data.result[0].nc/totalPop)*100;
				ncPc = Number.parseFloat(ncPc).toPrecision(3);
				trPc = (data.result[0].tr/totalPop)*100;
				trPc = Number.parseFloat(trPc).toPrecision(3);
				sendEmbed.addField('VS', data.result[0].vs+" ("+vsPc+"%)", true);
				sendEmbed.addField('NC', data.result[0].nc+" ("+ncPc+"%)", true);
				sendEmbed.addField('TR', data.result[0].tr+" ("+trPc+"%)", true);
				channel.send(sendEmbed).then(function(result){
					
				}, function(err){
					console.log("Insufficient permission on !population soltech");
					console.log(channel.guild.name);
				});
			})
		}
		catch(e){
			console.log('SolTech pop error');
		}
	}
	callback();
})

q.drain = function() {
	console.log('Done');
}

module.exports = {
	check: function(servers, channel) {
		q.push({sList: servers, chnl: channel}, function (err) {
			console.log(servers);
		});
	}
}