/**
 * This file implements functions to look up currently active alerts from the ps2 alerts website
 * @ts-check
 * @module alerts
 */

const {MessageEmbed: EmbedBuilder} = require('discord.js');
const alerts = require('./static/alerts.json');
const got = require('got');
const { serverNames, serverIDs } = require('./utils');
const i18n = require('i18n');

/**
 * The possible population levels of a server
 */
const popLevels = {
	1: "Dead",
	2: "Low",
	3: "Medium",
	4: "High",
	5: "Prime"
};

/**
 * Get information for active alert on `server`
 * @param {number} server - the server to get the alerts for
 * @param {string} locale - the locale to use for messages
 * @returns all  currently active alerts on `server`
 * @throws if error retrieving alerts from ps2alerts
 */
const alertInfo = async function(server, locale='en-US'){
	try{
		let uri = 'https://api.ps2alerts.com/instances/active?world='+server;
		let response = await got(uri).json();
		if(typeof(response.error) !== 'undefined'){
			throw response.error;
		}
		if(response.statusCode == 404){
			throw i18n.__({phrase: "API Unreachable", locale: locale});
		}
		if(response.length == 0){
			throw i18n.__mf({phrase: "No active alerts on {server}", locale: locale}, {server: i18n.__({phrase: serverNames[server], locale: locale})});
		}
		let allAlerts = [];
		for(let alert of response){
			if(typeof(alerts[alert.censusMetagameEventType]) === 'undefined'){
				console.log("Unable to find alert info for id "+alert.censusMetagameEventType);
				throw "Alert lookup error";
			}
			let now = Date.now();
			let start = Date.parse(alert.timeStarted);
			let resObj = {
				name: alerts[alert.censusMetagameEventType].name,
				description: alerts[alert.censusMetagameEventType].description,
				vs: alert.result.vs,
				nc: alert.result.nc,
				tr: alert.result.tr,
				continent: alert.zone,
				timeSinceStart: now-start,
				timeLeft: (start+alert.duration)-now,
				timeEnd: (start+alert.duration)/1000, //In Unix Epoch, not JS
				timeStart: start/1000,
				instanceId: alert.instanceId,
				bracket: alert.bracket
			};
			allAlerts.push(resObj);
		}
		
		return allAlerts;
	}
	catch(err){
		if(typeof(err) == 'string'){
			throw err;
		}
		else{
			throw `Error retrieving alert information: ${err.message}`;
		}
	}
}

module.exports = {
	/**
	 * Create a discord embed of all active alerts on `server`
	 * @param {string} server - the server to get the alerts for
	 * @param {string} locale - the locale to use for messages
	 * @returns a discord embed of all active alerts on `server`
	 * @throws if error retrieving alerts from ps2alerts
	 */
	activeAlerts: async function(server, locale="en-US"){
		const serverID = serverIDs[server];
		let alertObj = {};
		try{
			alertObj = await alertInfo(serverID);
		}
		catch(err){
			throw err;
		}
		const sendEmbed = new EmbedBuilder();
		sendEmbed.setTitle(serverNames[serverID]+" alerts");
		sendEmbed.setFooter({text: i18n.__mf({phrase: "Data from {site}", locale: locale}, {site: "ps2alerts.com"})});
		sendEmbed.setTimestamp();
		for(const x in alertObj){
			sendEmbed.addFields([
				{name: alertObj[x].name, value: "["+alertObj[x].description+"](https://ps2alerts.com/alert/"+alertObj[x].instanceId+"?utm_source=auraxis-bot&utm_medium=discord&utm_campaign=partners)"},
				{name: i18n.__({phrase: "Start time", locale: locale}), value: `<t:${alertObj[x].timeStart}:t>`, inline: true},
				{name: i18n.__({phrase: "Time left", locale: locale}), value: i18n.__mf({phrase: "Ends {time}", locale: locale}, {time: `<t:${alertObj[x].timeEnd}:R>`}), inline: true},
				{name: i18n.__({phrase: "Activity Level", locale: locale}), value: i18n.__({phrase: popLevels[alertObj[x].bracket], locale: locale}), inline: true},
				{name: i18n.__({phrase: "Territory Control", locale: locale}), value: `\
					\n<:VS:818766983918518272> **${i18n.__({phrase: "VS", locale: locale})}**: ${alertObj[x].vs}%\
					\n<:NC:818767043138027580> **${i18n.__({phrase: "NC", locale: locale})}**: ${alertObj[x].nc}%\
					\n<:TR:818988588049629256> **${i18n.__({phrase: "TR", locale: locale})}**: ${alertObj[x].tr}%`}
			]);
			if(x != alertObj.length-1){
				sendEmbed.addFields({name: '\u200b', value: '\u200b'});
			}
		}
		return sendEmbed;
	},

	alertInfo: alertInfo,
	popLevels: popLevels
}