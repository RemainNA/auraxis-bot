//This file implements functions to look up currently active alerts from the ps2 alerts website

const Discord = require('discord.js');
const alerts = require('./static/alerts.json');
const got = require('got');
const { serverNames, serverIDs, badQuery } = require('./utils');

const popLevels = {
	1: "Dead",
	2: "Low",
	3: "Medium",
	4: "High",
	5: "Prime"
}

const alertInfo = async function(server){
	let uri = 'https://api.ps2alerts.com/instances/active?world='+server;
	let response = await got(uri).json();
	if(typeof(response.error) !== 'undefined'){
		throw response.error;
	}
	if(response.statusCode == 404){
		throw "API Unreachable";
	}
	if(response.length == 0){
		throw `No active alerts on ${serverNames[server]}`;
	}
	let allAlerts = []
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
		}
		allAlerts.push(resObj);
	}
	
	return allAlerts;
}

module.exports = {
	activeAlerts: async function(server){
		if(badQuery(server)){
			throw "Server search contains disallowed characters";
		}

		if(!(server in serverIDs)){
			throw `${server} not found.`;
		}

		const serverID = serverIDs[server];
		let alertObj = "";
		try{
			alertObj = await alertInfo(serverID);
		}
		catch(err){
			throw err;
		}
		let sendEmbed = new Discord.MessageEmbed();
		sendEmbed.setTitle(serverNames[serverID]+" alerts");
		sendEmbed.setFooter("Data from ps2alerts.com");
		sendEmbed.setTimestamp();
		for(const x in alertObj){
			sendEmbed.addField(alertObj[x].name, "["+alertObj[x].description+"](https://ps2alerts.com/alert/"+alertObj[x].instanceId+"?utm_source=auraxis-bot&utm_medium=discord&utm_campaign=partners)");
			sendEmbed.addField("Time since start", `Started at <t:${alertObj[x].timeStart}:t>`, true);
			sendEmbed.addField("Time left", `Ends <t:${alertObj[x].timeEnd}:R>`, true);
			sendEmbed.addField("Activity Level", popLevels[alertObj[x].bracket], true)
			sendEmbed.addField('Territory Control', `\
			\n<:VS:818766983918518272> **VS**: ${alertObj[x].vs}%\
			\n<:NC:818767043138027580> **NC**: ${alertObj[x].nc}%\
			\n<:TR:818988588049629256> **TR**: ${alertObj[x].tr}%`)
			if(x != alertObj.length-1){
				sendEmbed.addField('\u200b', '\u200b');
			}
		}
		return sendEmbed;
	},

	alertInfo: alertInfo
}