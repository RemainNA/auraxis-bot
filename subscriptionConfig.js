// This file implements functionality to configure subscriptions and the /config command

const Discord = require('discord.js');

const getAlertStatus = function(continent, shown){
	if(["Indar", "Hossin", "Amerish", "Esamir"].includes(continent)){
		if(shown){
			return `:white_check_mark: **${continent}** alerts and unlocks are displayed`;
		}
		else{
			return `:x: **${continent}** alerts and unlocks are not displayed`;
		}
	}
	else{
		if(shown){
			return `:white_check_mark: **${continent}** alerts are displayed`;
		}
		else{
			return `:x: **${continent}** alerts are not displayed`;
		}
	}
	
}

const continents = [
	"koltyr",
	"indar",
	"hossin",
	"amerish",
	"esamir",
	"other"
]

module.exports = {
	displayConfig: async function(channel, pgClient){
		try{
			let res = await pgClient.query("SELECT * FROM subscriptionConfig WHERE channel=$1", [channel]);
			if(res.rows.length == 0){
				return "This channel currently has no subscriptions";
			}
			let row = res.rows[0];
			let resEmbed = new Discord.MessageEmbed();
			resEmbed.setTitle("Subscription config");
			let alertStatus = "NB: If this channel is not subscribed to alerts you can ignore this section\n";
			alertStatus += getAlertStatus("Koltyr", row.koltyr)+"\n";
			alertStatus += getAlertStatus("Indar", row.indar)+"\n";
			alertStatus += getAlertStatus("Hossin", row.hossin)+"\n";
			alertStatus += getAlertStatus("Amerish", row.amerish)+"\n";
			alertStatus += getAlertStatus("Esamir", row.esamir)+"\n";
			alertStatus += getAlertStatus("Other", row.other);
			resEmbed.addField("Continents", alertStatus);
			if(row.autodelete){
				resEmbed.addField("Auto Delete", ":white_check_mark: Alert and outfit activity notifications are automatically deleted");
			}
			else{
				resEmbed.addField("Auto Delete", ":x: Alert and outfit activity notifications are not automatically deleted");
			}
			resEmbed.setColor("BLUE");
			return resEmbed;
		}
		catch(err){
			console.log("Error in displaying subscriptions config");
			console.log(err);
			throw("Unable to display config, an error occurred");
		}
	},

	initializeConfig: async function(channel, pgClient){
		try{
			await pgClient.query("INSERT INTO subscriptionConfig (channel) VALUES ($1)\
		ON CONFLICT(channel) DO NOTHING;", [channel])
			return "Configuration step succeeded."
		}
		catch(err){
			console.log("Error when initializing subscription config");
			console.log(err);
			throw("Configuration step failed, using default settings");
		}
	},

	setContinent: async function(continent, setting, channel, pgClient){
		let res = await pgClient.query("SELECT * FROM subscriptionConfig WHERE channel = $1", [channel])
		if (res.rows.length == 0){
			throw("This channel has no active subscriptions so cannot be configured.  If you believe this is incorrect please run `/config audit`");
		}
		if(!continents.includes(continent)){
			throw("Continent unrecognized.  Options are Koltyr, Indar, Hossin, Amerish, or Esamir.");
		}
		if(setting == 'enable'){
			switch(continent){
				case "koltyr":
					pgClient.query("UPDATE subscriptionConfig SET koltyr = true WHERE channel = $1;", [channel])
						.catch(err => {throw(err)})
					return("Koltyr alerts will be displayed");
				case "indar":
					pgClient.query("UPDATE subscriptionConfig SET indar = true WHERE channel = $1;", [channel])
						.catch(err => {throw(err)})
					return("Indar alerts and unlocks will be displayed");
				case "hossin":
					pgClient.query("UPDATE subscriptionConfig SET hossin = true WHERE channel = $1;", [channel])
						.catch(err => {throw(err)})
					return("Hossin alerts and unlocks will be displayed");
				case "amerish":
					pgClient.query("UPDATE subscriptionConfig SET amerish = true WHERE channel = $1;", [channel])
						.catch(err => {throw(err)})
					return("Amerish alerts and unlocks will be displayed");
				case "esamir":
					pgClient.query("UPDATE subscriptionConfig SET esamir = true WHERE channel = $1;", [channel])
						.catch(err => {throw(err)})
					return("Esamir alerts and unlocks will be displayed");
				case "other":
					pgClient.query("UPDATE subscriptionConfig SET other = true WHERE channel = $1;", [channel])
						.catch(err => {throw(err)})
					return("Other alerts will be displayed");
			}
		}
		else if(setting == 'disable'){
			switch(continent){
				case "koltyr":
					pgClient.query("UPDATE subscriptionConfig SET koltyr = false WHERE channel = $1;", [channel])
						.catch(err => {throw(err)})
					return("Koltyr alerts will not be displayed");
				case "indar":
					pgClient.query("UPDATE subscriptionConfig SET indar = false WHERE channel = $1;", [channel])
						.catch(err => {throw(err)})
					return("Indar alerts and unlocks will not be displayed");
				case "hossin":
					pgClient.query("UPDATE subscriptionConfig SET hossin = false WHERE channel = $1;", [channel])
						.catch(err => {throw(err)})
					return("Hossin alerts and unlocks will not be displayed");
				case "amerish":
					pgClient.query("UPDATE subscriptionConfig SET amerish = false WHERE channel = $1;", [channel])
						.catch(err => {throw(err)})
					return("Amerish alerts and unlocks will not be displayed");
				case "esamir":
					pgClient.query("UPDATE subscriptionConfig SET esamir = false WHERE channel = $1;", [channel])
						.catch(err => {throw(err)})
					return("Esamir alerts and unlocks will not be displayed");
				case "other":
					pgClient.query("UPDATE subscriptionConfig SET other = false WHERE channel = $1;", [channel])
						.catch(err => {throw(err)})
					return("Other alerts will not be displayed");
			}
		}
		else{
			throw("Setting unrecognized.  Options are enable or disable.")
		}
	},

	setAutoDelete: async function(message, channel, pgClient){
		let res = await pgClient.query("SELECT * FROM subscriptionConfig WHERE channel = $1", [channel])
		if (res.rows.length == 0){
			throw("This channel has no active subscriptions so cannot be configured.  If you believe this is incorrect please run `/config audit`");
		}
		if(message.trim().toLowerCase() == 'enable'){
			pgClient.query("UPDATE subscriptionConfig SET autoDelete = true WHERE channel = $1;", [channel])
				.catch(err => {throw(err)})
			return("Alerts and outfit activity notifications will be automatically deleted");
		}
		else if(message.trim().toLowerCase() == 'disable'){
			pgClient.query("UPDATE subscriptionConfig SET autoDelete = false WHERE channel = $1;", [channel])
				.catch(err => {throw(err)})
			return("Alerts and outfit activity notifications will not be automatically deleted");
		}
		else{
			throw("Setting unrecognized.  Options are enable or disable.");
		}
	},

	audit: async function(channel, pgClient){
		try{
			const alerts = await pgClient.query("SELECT * FROM alerts WHERE channel = $1", [channel]);
			const activity = await pgClient.query("SELECT * FROM outfitActivity WHERE channel = $1", [channel]);
			const captures = await pgClient.query("SELECT * FROM outfitCaptures WHERE channel = $1", [channel]);
			const news = await pgClient.query("SELECT * FROM news WHERE channel = $1", [channel]);
			const unlocks = await pgClient.query("SELECT * FROM unlocks WHERE channel = $1", [channel]);
			const activeSubscriptions = alerts.rows.length + activity.rows.length + captures.rows.length + news.rows.length + unlocks.rows.length;
			const existingConfig = await pgClient.query("SELECT * FROM subscriptionConfig WHERE channel = $1", [channel]);
			const activeConfig = existingConfig.rows.length;
			let status = ""
			if(activeSubscriptions > 0){
				status += "Channel has active subscriptions\n";
			}
			else{
				status += "Channel has no active subscriptions\n";
			}
			if(activeConfig > 0){
				status += "Channel has existing configuration settings\n";
			}
			else{
				status += "Channel has no existing configuration settings\n";
			}
			if(activeConfig > 0 && activeSubscriptions == 0){
				await pgClient.query("DELETE FROM subscriptionConfig WHERE channel = $1", [channel]);
				status += "Configuration settings deleted";
			}
			else if(activeConfig == 0 && activeSubscriptions > 0){
				await this.initializeConfig(channel, pgClient);
				status += "Configuration settings created";
			}
			else{
				status += "No issues found"
			}
			return status;
		}
		catch(err){
			if(typeof(err) === 'string'){
				throw(err)
			}
			else{
				console.log("Subscription config error");
				console.log(err)
				throw("Error when performing subscription configuration audit")
			}
		}
	}
}