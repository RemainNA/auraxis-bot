/**
 * This file defines functions for retrieving population by faction for a given server/world
 * @module population
 */

const Discord = require('discord.js');
const { fetch } = require('undici');
const {servers, serverIDs, serverNames, localeNumber, continentNames} = require('./utils.js');
const i18n = require('i18n');

/**
 * Get the populations of all servers
 * @param {string} locale - the locale to use for the Error response
 * @returns an object showing the total population of the server by faction
 * @throw if there are API errors
 */
async function getPopulation(locale='en-US'){
	try{
		const request = await fetch("https://wt.honu.pw/api/world/overview");
		if(!request.ok) {
			console.log(`Population API Error: ${request.status}`);
			throw i18n.__({phrase: "API Unreachable", locale: locale});
		}
		const response = await request.json();
		if(typeof(response.error) !== 'undefined'){
			throw response.error;
		}
		const resObj = {
			1: {},
			10: {},
			13: {},
			17: {},
			19: {},
			40: {},
			1000: {},
			2000: {}
		}
		response.forEach(state => {
			const worldObj = {
				global: {
					all: 0,
					vs: 0,
					nc: 0,
					tr: 0,
					unknown: 0
				},
				2: {},
				4: {},
				6: {},
				8: {},
				344: {},
				worldID: state.worldID
			}
			for(const zone of state.zones){
				worldObj[zone.zoneID] = zone.players;
				worldObj[zone.zoneID].open = zone.isOpened;
				worldObj.global.all += zone.players.all;
				worldObj.global.vs += zone.players.vs;
				worldObj.global.nc += zone.players.nc;
				worldObj.global.tr += zone.players.tr;
				worldObj.global.unknown += zone.players.unknown;
			}
			resObj[state.worldID] = worldObj;
		})
		return resObj;
	}
	catch(err){
		if(typeof(err) === 'string'){
			throw(err);
		}
		throw `Error retrieving population statistics: ${err.cause.code}`;
	}
}

/**
 * Get the fisu URL to the faction population of a server
 * @param {number} serverID - the server to get the population of
 * @returns the fisu url to the server's population
 */
const fisuPopulation = function(serverID){
	if(serverID == 2000){
		return 'http://ps4eu.ps2.fisu.pw/activity/?world=2000';
	}
	else if(serverID == 1000){
		return 'http://ps4us.ps2.fisu.pw/activity/?world=1000';
	}
	else{
		return `http://ps2.fisu.pw/activity/?world=${serverID}`;
	}
}

module.exports = {
	/**
	 * Create a discord embed showing the population of a server
	 * @param {string} server - the server to get the population of 
	 * @param {string} locale - the locale to use for the response
	 * @returns a discord embed of the population of the server 
	 */
	lookup: async function(server, locale="en-US"){
		const results = await getPopulation();
		if(server == 'all'){
			let resEmbed = new Discord.MessageEmbed();
			let total = 0;
			for(const server of servers){
				const pop = results[serverIDs[server]];
				const vsPc = localeNumber((pop.global.vs/(pop.global.all||1))*100, locale);
				const ncPc = localeNumber((pop.global.nc/(pop.global.all||1))*100, locale);
				const trPc = localeNumber((pop.global.tr/(pop.global.all||1))*100, locale);
				const nsPc = localeNumber((pop.global.unknown/(pop.global.all||1))*100, locale);
				const populationField = `\
				\n<:VS:818766983918518272> **${i18n.__({phrase: 'VS', locale: locale})}**: ${pop.global.vs}  |  ${vsPc}%\
				\n<:NC:818767043138027580> **${i18n.__({phrase: 'NC', locale: locale})}**: ${pop.global.nc}  |  ${ncPc}%\
				\n<:TR:818988588049629256> **${i18n.__({phrase: 'TR', locale: locale})}**: ${pop.global.tr}  |  ${trPc}%\
				\n:question: **?**: ${pop.global.unknown}  |  ${nsPc}%`
				const populationTitle = i18n.__mf({phrase: "{server} population - {total}", locale: locale}, {server: i18n.__({phrase: serverNames[pop.worldID], locale: locale}), total: pop.global.all})
				resEmbed.addField(populationTitle, populationField, true);
				total += pop.global.all;
			}
			resEmbed.setTitle(i18n.__mf({phrase: "Total population - {total}", locale: locale}, {total: total.toLocaleString(locale)}));
			resEmbed.setFooter({text: i18n.__mf({phrase: "Data from {site}", locale: locale}, {site: "wt.honu.pw"})});
			resEmbed.setTimestamp();
			return resEmbed;
		}
		else{
			const serverID = serverIDs[server];
			const normalized = serverNames[serverID];
			const pop = results[serverID];
			let sendEmbed = new Discord.MessageEmbed();
			sendEmbed.setTitle(i18n.__mf({phrase: "{server} population - {total}", locale: locale}, 
				{server: i18n.__({phrase: normalized, locale: locale}), total: pop.global.all.toLocaleString(locale)}));
			const vsPc = localeNumber((pop.global.vs/(pop.global.all||1))*100, locale);
			const ncPc = localeNumber((pop.global.nc/(pop.global.all||1))*100, locale);
			const trPc = localeNumber((pop.global.tr/(pop.global.all||1))*100, locale);
			const nsPc = localeNumber((pop.global.unknown/(pop.global.all||1))*100, locale);
			sendEmbed.setDescription(`\
			\n**${i18n.__({phrase: "globalPopulation", locale: locale})}**\
			\n<:VS:818766983918518272> **${i18n.__({phrase: 'VS', locale: locale})}**: ${pop.global.vs}  |  ${vsPc}%\
			\n<:NC:818767043138027580> **${i18n.__({phrase: 'NC', locale: locale})}**: ${pop.global.nc}  |  ${ncPc}%\
			\n<:TR:818988588049629256> **${i18n.__({phrase: 'TR', locale: locale})}**: ${pop.global.tr}  |  ${trPc}%\
			\n:question: **?**: ${pop.global.unknown}  |  ${nsPc}%`);
			for(const contID of [2,4,6,8,344]){
				const contPop = pop[contID];
				if(!contPop.open && contPop.all != 0){
					sendEmbed.addField(i18n.__mf({phrase: "lockedCont", locale: locale}, {continent: i18n.__({phrase: continentNames[contID], locale: locale})}), i18n.__mf({phrase: "numOnline", locale: locale}, {pop: contPop.all}))
					continue;
				}
				else if(!contPop.open){
					sendEmbed.addField(i18n.__mf({phrase: "lockedCont", locale: locale}, {continent: i18n.__({phrase: continentNames[contID], locale: locale})}), i18n.__({phrase: "empty", locale: locale}))
					continue;
				}
				const vsPc = localeNumber((contPop.vs/(contPop.all||1))*100, locale);
				const ncPc = localeNumber((contPop.nc/(contPop.all||1))*100, locale);
				const trPc = localeNumber((contPop.tr/(contPop.all||1))*100, locale);
				const nsPc = localeNumber((contPop.unknown/(contPop.all||1))*100, locale);
				sendEmbed.addField(i18n.__mf({phrase: "{server} population - {total}", locale: locale}, 
					{server: i18n.__({phrase: i18n.__({phrase: continentNames[contID], locale: locale}), locale: locale}), total: contPop.all.toLocaleString(locale)}), `\
					\n<:VS:818766983918518272> **${i18n.__({phrase: 'VS', locale: locale})}**: ${contPop.vs}  |  ${vsPc}%\
					\n<:NC:818767043138027580> **${i18n.__({phrase: 'NC', locale: locale})}**: ${contPop.nc}  |  ${ncPc}%\
					\n<:TR:818988588049629256> **${i18n.__({phrase: 'TR', locale: locale})}**: ${contPop.tr}  |  ${trPc}%\
					\n:question: **?**: ${contPop.unknown}  |  ${nsPc}%`
				)
			}
			sendEmbed.setTimestamp();
			sendEmbed.setURL(fisuPopulation(serverID));
			sendEmbed.setFooter({text: i18n.__mf({phrase: "Data from {site}", locale: locale}, {site: "wt.honu.pw"})});

			return sendEmbed;
		}
	},

	getPopulation: getPopulation
}