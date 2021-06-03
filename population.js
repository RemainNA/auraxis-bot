// This file defines functions for retrieving population by faction for a given server/world
const Discord = require('discord.js');
const messageHandler = require('./messageHandler.js');
const got = require('got')

const getPopulation = async function(world){
	let url = '';
	if(world == 2000){
		url = 'http://ps4eu.ps2.fisu.pw/api/population/?world=2000';
	}
	else if(world == 1000){
		url = 'http://ps4us.ps2.fisu.pw/api/population/?world=1000';
	}
	else{
		url = 'http://ps2.fisu.pw/api/population/?world='+world;
	}
	try{
		let response = await got(url).json();
		if(typeof(response.error) !== 'undefined'){
			throw response.error;
		}
		if(response.statusCode == 404){
			throw "API Unreachable"; // TODO: Maybe create an exception instead of a bare string
		}
		let resObj = {
			vs: response.result[0].vs,
			nc: response.result[0].nc,
			tr: response.result[0].tr,
			ns: response.result[0].ns
		}
		return resObj;
	}
	catch(err){
		if(typeof(err) === 'string'){
			throw(err)
		}
		else{
			throw("Error retrieving population statistics.")
		}
	}
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

const fisuPopulation = function(server){
    switch (server.toLowerCase()){
        case "connery":
            return 'https://ps2.fisu.pw/activity/?world=1';
        case "miller":
            return 'https://ps2.fisu.pw/activity/?world=10';
        case "cobalt":
            return 'https://ps2.fisu.pw/activity/?world=13';
        case "emerald":
            return 'https://ps2.fisu.pw/activity/?world=17';
        case "soltech":
            return 'https://ps2.fisu.pw/activity/?world=40';
        case "genudine":
            return 'https://ps4us.ps2.fisu.pw/activity/?world=1000';
        case "ceres":
            return 'https://ps4eu.ps2.fisu.pw/activity/?world=2000';
    }
    return null
}

module.exports = {
	lookup: async function(server){
		if(messageHandler.badQuery(server)){
			throw "Server search contains disallowed characters";
		}

		let world = nameToWorld(server);
		let normalized = normalize(server);
		if(world == null){
			throw`${server} not found.`;
		}
		let res = await getPopulation(world);

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
		sendEmbed.setDescription(`\
		\n<:VS:818766983918518272> **VS**: ${res.vs}  |  ${vsPc}%\
		\n<:NC:818767043138027580> **NC**: ${res.nc}  |  ${ncPc}%\
		\n<:TR:818988588049629256> **TR**: ${res.tr}  |  ${trPc}%\
		\n<:NS:819511690726866986> **NSO**: ${res.ns}  |  ${nsPc}%`)
		sendEmbed.setTimestamp();
		sendEmbed.setURL(fisuPopulation(server));
		if(world == 2000){
			sendEmbed.setFooter('Data from ps4eu.ps2.fisu.pw');
		}
		else if(world == 1000){
			sendEmbed.setFooter('Data from ps4us.ps2.fisu.pw');
		}
		else{
			sendEmbed.setFooter('Data from ps2.fisu.pw');
		}

		return sendEmbed;
	}
}