// This file defines functions for retrieving population by faction for a given server/world
const Discord = require('discord.js');
const got = require('got')
const {servers, serverIDs, serverNames, badQuery} = require('./utils.js');
const i18n = require('i18n');

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
			ns: response.result[0].ns,
			world: world
		}
		return resObj;
	}
	catch(err){
		if(typeof(err) === 'string'){
			throw(err)
		}
		else if(err.code == 'ECONNREFUSED'){
			throw("ECONNREFUSED")
		}
		else{
			throw("Error retrieving population statistics.")
		}
	}
}

const fisuPopulation = function(serverID){
	if(serverID == 2000){
		return 'http://ps4eu.ps2.fisu.pw/activity/?world=2000';
	}
	else if(serverID == 1000){
		return 'http://ps4us.ps2.fisu.pw/activity/?world=1000';
	}
	else{
		return 'http://ps2.fisu.pw/activity/?world='+serverID;
	}
}

module.exports = {
	lookup: async function(server, locale="en-US"){
		if(badQuery(server)){
			throw "Server search contains disallowed characters";
		}

		if(server == 'all'){
			let resEmbed = new Discord.MessageEmbed();
			let total = 0;
			//Construct an array of promises and await them all in parallel
			const results = await Promise.all(Array.from(servers, x=> getPopulation(serverIDs[x])))
			for(const pop of results){
				const serverTotal = pop.vs + pop.nc + pop.tr + pop.ns;
				const vsPc = Number.parseFloat((pop.vs/(serverTotal||1))*100).toPrecision(3);
				const ncPc = Number.parseFloat((pop.nc/(serverTotal||1))*100).toPrecision(3);
				const trPc = Number.parseFloat((pop.tr/(serverTotal||1))*100).toPrecision(3);
				const nsPc = Number.parseFloat((pop.ns/(serverTotal||1))*100).toPrecision(3);
				const populationField = `\
				\n<:VS:818766983918518272> **${i18n.__({phrase: 'VS', locale: locale})}**: ${pop.vs}  |  ${vsPc}%\
				\n<:NC:818767043138027580> **${i18n.__({phrase: 'NC', locale: locale})}**: ${pop.nc}  |  ${ncPc}%\
				\n<:TR:818988588049629256> **${i18n.__({phrase: 'TR', locale: locale})}**: ${pop.tr}  |  ${trPc}%\
				\n<:NS:819511690726866986> **${i18n.__({phrase: 'NSO', locale: locale})}**: ${pop.ns}  |  ${nsPc}%`
				const populationTitle = i18n.__mf({phrase: "{server} population - {total}", locale: locale}, {server: i18n.__({phrase: serverNames[pop.world], locale: locale}), total: serverTotal})
				resEmbed.addField(populationTitle, populationField, true);
				total += serverTotal;
			}
			resEmbed.setTitle(i18n.__mf({phrase: "Total population - {total}", locale: locale}, {total: total}));
			resEmbed.setFooter({text: i18n.__mf({phrase: "Data from {site}", locale: locale}, {site: "ps2.fisu.pw"})});
			resEmbed.setTimestamp();
			return resEmbed
		}
		else{
			const serverID = serverIDs[server];
			const normalized = serverNames[serverID];
			const res = await getPopulation(serverID);

			let sendEmbed = new Discord.MessageEmbed();
			let total = Number(res.vs) + Number(res.nc) + Number(res.tr) + Number(res.ns);
			sendEmbed.setTitle(i18n.__mf({phrase: "{server} population - {total}", locale: locale}, {server: i18n.__({phrase: normalized, locale: locale}), total: total}));
			total = Math.max(total, 1);
			const vsPc = Number.parseFloat((res.vs/total)*100).toPrecision(3);
			const ncPc = Number.parseFloat((res.nc/total)*100).toPrecision(3);
			const trPc = Number.parseFloat((res.tr/total)*100).toPrecision(3);
			const nsPc = Number.parseFloat((res.ns/total)*100).toPrecision(3);
			sendEmbed.setDescription(`\
			\n<:VS:818766983918518272> **${i18n.__({phrase: 'VS', locale: locale})}**: ${res.vs}  |  ${vsPc}%\
			\n<:NC:818767043138027580> **${i18n.__({phrase: 'NC', locale: locale})}**: ${res.nc}  |  ${ncPc}%\
			\n<:TR:818988588049629256> **${i18n.__({phrase: 'TR', locale: locale})}**: ${res.tr}  |  ${trPc}%\
			\n<:NS:819511690726866986> **${i18n.__({phrase: 'NSO', locale: locale})}**: ${res.ns}  |  ${nsPc}%`)
			sendEmbed.setTimestamp();
			sendEmbed.setURL(fisuPopulation(serverID));
			if(serverID == 2000){
				sendEmbed.setFooter({text: i18n.__mf({phrase: "Data from {site}", locale: locale}, {site: "ps4eu.ps2.fisu.pw"})});
			}
			else if(serverID == 1000){
				sendEmbed.setFooter({text: i18n.__mf({phrase: "Data from {site}", locale: locale}, {site: "ps4us.ps2.fisu.pw"})});
			}
			else{
				sendEmbed.setFooter({text: i18n.__mf({phrase: "Data from {site}", locale: locale}, {site: "ps2.fisu.pw"})});
			}

			return sendEmbed;
		}
	},

	getPopulation: getPopulation
}