// Import the discord.js module
const Discord = require('discord.js');

// Import request for API access
var request = require('request');

// auth file
var auth = require('./auth.json');

// import async
var async = require('async');

var q = async.queue(function(task, callback){
	servers = task.sList.toLowerCase();
	channel = task.chnl;
	if(servers.includes('connery')){
		options = {uri:'http://ps2.fisu.pw/api/population/?world=1', headers: {'User-Agent': "Auraxis bot"}};
		try{
			request(options, function (error, response, body) {
				//console.log(body);
				data = JSON.parse(body);
				sendEmbed = new Discord.RichEmbed();
				sendEmbed.setTitle('Connery Population');
				sendEmbed.setFooter('From ps2.fisu.pw');
				sendEmbed.addField('VS', data.result[0].vs, true);
				sendEmbed.addField('NC', data.result[0].nc, true);
				sendEmbed.addField('TR', data.result[0].tr, true);
				channel.send(sendEmbed);
			})
		}
		catch{
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
				sendEmbed.setTitle('Miller Population');
				sendEmbed.setFooter('From ps2.fisu.pw');
				sendEmbed.addField('VS', data.result[0].vs, true);
				sendEmbed.addField('NC', data.result[0].nc, true);
				sendEmbed.addField('TR', data.result[0].tr, true);
				channel.send(sendEmbed);
			})
		}
		catch{
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
				sendEmbed.setTitle('Cobalt Population');
				sendEmbed.setFooter('From ps2.fisu.pw');
				sendEmbed.addField('VS', data.result[0].vs, true);
				sendEmbed.addField('NC', data.result[0].nc, true);
				sendEmbed.addField('TR', data.result[0].tr, true);
				channel.send(sendEmbed);
			})
		}
		catch{
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
				sendEmbed.setTitle('Emerald Population');
				sendEmbed.setFooter('From ps2.fisu.pw');
				sendEmbed.addField('VS', data.result[0].vs, true);
				sendEmbed.addField('NC', data.result[0].nc, true);
				sendEmbed.addField('TR', data.result[0].tr, true);
				channel.send(sendEmbed);
			})
		}
		catch{
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
				sendEmbed.setTitle('Jaegar Population');
				sendEmbed.setFooter('From ps2.fisu.pw');
				sendEmbed.addField('VS', data.result[0].vs, true);
				sendEmbed.addField('NC', data.result[0].nc, true);
				sendEmbed.addField('TR', data.result[0].tr, true);
				channel.send(sendEmbed);
			})
		}
		catch{
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
				sendEmbed.setTitle('Briggs Population');
				sendEmbed.setFooter('From ps2.fisu.pw');
				sendEmbed.addField('VS', data.result[0].vs, true);
				sendEmbed.addField('NC', data.result[0].nc, true);
				sendEmbed.addField('TR', data.result[0].tr, true);
				channel.send(sendEmbed);
			})
		}
		catch{
			console.log('Briggs pop error');
		}
	}
	callback();
})

module.exports = {
	check: function(servers, channel) {
		q.push({sList: servers, chnl: channel}, function (err) {
			console.log(servers);
		});
	}
}