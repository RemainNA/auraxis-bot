// This file defines functions for retrieving population by faction for a given server/world

const Discord = require('discord.js');
var messageHandler = require('./messageHandler.js');

var getPopulation = async function(world, pgClient){
	let response = []
	let resObj = {
		vs: 0,
		nc: 0,
		tr: 0,
		ns: 0
	}
	try{
		response = await pgClient.query("SELECT COUNT(id) FROM population WHERE\
		WORLD=$1 AND faction=1", [world])
		resObj.vs = response.rows[0].count || 0;
	}
	catch(err){
		console.log(err);
		return new Promise(function(resolve, reject){
			reject("Error retrieving population");
		})
	}
	try{
		response = await pgClient.query("SELECT COUNT(id) FROM population WHERE\
		WORLD=$1 AND faction=2", [world])
		resObj.nc = response.rows[0].count || 0;
	}
	catch(err){
		console.log(err);
		return new Promise(function(resolve, reject){
			reject("Error retrieving population");
		})
	}
	try{
		response = await pgClient.query("SELECT COUNT(id) FROM population WHERE\
		WORLD=$1 AND faction=3", [world])
		resObj.tr = response.rows[0].count || 0;
	}
	catch(err){
		console.log(err);
		return new Promise(function(resolve, reject){
			reject("Error retrieving population");
		})
	}
	try{
		response = await pgClient.query("SELECT COUNT(id) FROM population WHERE\
		WORLD=$1 AND faction=4", [world])
		resObj.ns = response.rows[0].count || 0;
	}
	catch(err){
		console.log(err);
		return new Promise(function(resolve, reject){
			reject("Error retrieving population");
		})
	}
	return new Promise(function(resolve, reject){
		resolve(resObj);
	})
}

function nameToWorld(name){
	switch (name.toLowerCase()){
		case "connery":
			return 1;
		case "miller":
			return 10;
		case "cobalt":
			return 13;
		case "emerald":
			return 17;
		case "jaegar":
			return 19;
		case "soltech":
			return 40;
		case "genudine":
			return 1000;
		case "ceres":
			return 2000;
	}
	return null
}

function normalize(name){
	switch (name.toLowerCase()){
		case "connery":
			return "Connery";
		case "miller":
			return "Miller";
		case "cobalt":
			return "Cobalt";
		case "emerald":
			return "Emerald";
		case "jaegar":
			return "Jaegar";
		case "soltech":
			return "SolTech";
		case "genudine":
			return "Genudine";
		case "ceres":
			return "Ceres";
	}
	return null
}

module.exports = {
	lookup: async function(server, pgClient){
		if(messageHandler.badQuery(server)){
			return new Promise(function(resolve, reject){
                reject("Server search contains disallowed characters");
            })
		}

		let world = nameToWorld(server);
		let normalized = normalize(server);
		if(world == null){
			return new Promise(function(resolve, reject){
				reject(server+" not found.");
			})
		}
		let res = {}
		try{
			res = await getPopulation(world,pgClient)
		}
		catch(err){
			return new Promise(function(resolve, reject){
					reject(err);
				})
		}
		let sendEmbed = new Discord.MessageEmbed();
		let total = Number(res.vs) + Number(res.nc) + Number(res.tr) + Number(res.ns);
		sendEmbed.setTitle(normalized+" Population - "+total);
		let vsPc = (res.vs/total)*100;
		vsPc = Number.parseFloat(vsPc).toPrecision(3);
		let ncPc = (res.nc/total)*100;
		ncPc = Number.parseFloat(ncPc).toPrecision(3);
		let trPc = (res.tr/total)*100;
		trPc = Number.parseFloat(trPc).toPrecision(3);
		let nsPc = (res.ns/total)*100;
		nsPc = Number.parseFloat(nsPc).toPrecision(3);
		sendEmbed.addField('VS', res.vs+" ("+vsPc+"%)", true);
		sendEmbed.addField('NC', res.nc+" ("+ncPc+"%)", true);
		sendEmbed.addField('TR', res.tr+" ("+trPc+"%)", true);
		sendEmbed.addField('NSO', res.ns+" ("+nsPc+"%)", true);
		sendEmbed.setTimestamp();
		return new Promise(function(resolve, reject){
			resolve(sendEmbed);z
		})
	}
}