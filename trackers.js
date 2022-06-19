//This file implements functions to create and update server tracker channels, showing total population and active continents

const {getPopulation} = require('./population.js');
const {territoryInfo} = require('./territory.js');
const {onlineInfo} = require('./online.js');
const {serverNames, serverIDs, servers, continents, faction} = require('./utils.js');

const populationName = async function(serverID){
	const population = await getPopulation(serverID);
	const total = population.vs + population.nc + population.tr + population.ns;
	return `${serverNames[serverID]}: ${total} online`;
}

const territoryName = async function(serverID){
	const territory = await territoryInfo(serverID);
	let openList = [];
	for (const cont of continents){
		if(territory[cont].locked == -1){
			openList.push(cont);
		}
	}
	return `${serverNames[serverID]}: ${openList}`;
}

const outfitName = async function(outfitID, platform){
	const oInfo = await onlineInfo("", platform, outfitID);
	return {
		faction: `${faction(oInfo.faction).tracker} ${oInfo.alias}: ${oInfo.onlineCount} online`,
		noFaction: `${oInfo.alias}: ${oInfo.onlineCount} online`
	}
}

const updateChannelName = async function(name, channelID, discordClient, pgClient){
	try{
		let channel = await discordClient.channels.fetch(channelID);
		if(name != channel.name){ //Just avoid unneeded edits
			await channel.setName(name, "Scheduled tracker update");
		}
	}
	catch(err){
		if(err.code == 10003){ //Deleted/unknown channel
			console.log(`Removed tracker channel ${channelID}`);
			pgClient.query("DELETE FROM tracker WHERE channel = $1;", [channelID]);
			pgClient.query("DELETE FROM outfittracker WHERE channel = $1;", [channelID]);
		}
		else if(err.code == 50013 || err.code == 50001){ //Missing permissions, missing access
			//Ignore in case permissions are updated
		}
		else{
			console.log("Error in updateChannelName");
			console.log(err);
		}
	}
}

module.exports = {
	create: async function(type, serverName, guild, discordClient, pgClient){
		try{
			let name = "";
			if(type == "population"){
				name = await populationName(serverIDs[serverName]);
			}
			else if(type == "territory"){
				name = await territoryName(serverIDs[serverName]);
			}
			
			let newChannel = await guild.channels.create(name, {type: 'GUILD_VOICE', reason: 'New tracker channel', permissionOverwrites: [
				{
					id: guild.id,
					deny: ['CONNECT'],
					allow: ['VIEW_CHANNEL']
				},
				{
					id: discordClient.user.id,
					allow: ['CONNECT', 'MANAGE_CHANNELS', 'VIEW_CHANNEL']
				}
			]});

			await pgClient.query("INSERT INTO tracker (channel, trackerType, world) VALUES ($1, $2, $3);",
			[newChannel.id, type, serverName]);

			return `Tracker channel created as ${newChannel.toString()}. This channel will automatically update once every 10 minutes. If you move the channel or edit permissions make sure to keep the "Manage Channel" and "Connect" permissions enabled for Auraxis Bot.`;
		}
		catch(err){
			if(err.message == "Missing Permissions"){
				throw "Unable to create channel due to missing permissions. Ensure the bot has both \"Manage Channels\" and \"Connect\" permissions granted.";
			}
			else{
				throw(err);
			}		
		}
	},

	createOutfit: async function(tag, platform, showFaction, guild, discordClient, pgClient){
		try{
			const oInfo = await onlineInfo(tag, platform);
			let name = await outfitName(oInfo.outfitID, platform);
			if(showFaction){
				name = name.faction;
			}
			else{
				name = name.noFaction;
			}
						
			let newChannel = await guild.channels.create(name, {type: 'GUILD_VOICE', reason: 'New tracker channel', permissionOverwrites: [
				{
					id: guild.id,
					deny: ['CONNECT'],
					allow: ['VIEW_CHANNEL']
				},
				{
					id: discordClient.user.id,
					allow: ['CONNECT', 'MANAGE_CHANNELS', 'VIEW_CHANNEL']
				}
			]});

			await pgClient.query("INSERT INTO outfittracker (channel, outfitid, showfaction, platform) VALUES ($1, $2, $3, $4);",
			[newChannel.id, oInfo.outfitID, showFaction, platform]);

			return `Tracker channel created as ${newChannel}. This channel will automatically update once every 10 minutes. If you move the channel or edit permissions make sure to keep the "Manage Channel" and "Connect" permissions enabled for Auraxis Bot.`;
		}
		catch(err){
			if(err.message == "Missing Permissions"){
				throw "Unable to create channel due to missing permissions. Ensure the bot has both \"Manage Channels\" and \"Connect\" permissions granted.";
			}
			else{
				throw(err);
			}		
		}
	},

	update: async function(pgClient, discordClient, continentOnly = false){
		for(const serverName of servers){
			if(!continentOnly){
				try{
					const popName = await populationName(serverIDs[serverName]);
					const channels = await pgClient.query("SELECT channel FROM tracker WHERE trackertype = $1 AND world = $2;", ["population", serverName]);
					for(const row of channels.rows){
						await updateChannelName(popName, row.channel, discordClient, pgClient);
					}
				}
				catch(err){
					console.log(`Error updating ${serverName} population tracker`);
					console.log(err);
				}
			}
			try{
				const terName = await territoryName(serverIDs[serverName]);
				const channels = await pgClient.query("SELECT channel FROM tracker WHERE trackertype = $1 AND world = $2;", ["territory", serverName]);
				for(const row of channels.rows){
					await updateChannelName(terName, row.channel, discordClient, pgClient);
				}
			}
			catch(err){
				console.log(`Error updating ${serverName} territory tracker`);
				console.log(err);
			}
		}
		if(!continentOnly){
			try{
				const outfits = await pgClient.query("SELECT DISTINCT outfitid, platform FROM outfittracker;");
				for(const row of outfits.rows){
					try{
						const oName = await outfitName(row.outfitid, row.platform);
						const channels = await pgClient.query("SELECT channel, showfaction FROM outfittracker WHERE outfitid = $1 AND platform = $2;", [row.outfitid, row.platform]);
						for(channelRow of channels.rows){
							if(channelRow.showfaction){
								await updateChannelName(oName.faction, channelRow.channel, discordClient, pgClient);
							}
							else{
								await updateChannelName(oName.noFaction, channelRow.channel, discordClient, pgClient);
							}
						}
					}
					catch(err){
						console.log(`Error updating outfit tracker ${row.outfitid}`);
						console.log(err);
						if(err == " not found"){
							await pgClient.query("DELETE FROM outfittracker WHERE outfitid = $1;", [row.outfitid]);
							console.log(`Deleted ${row.outfitid} from tracker table`)
						}
					}
					
				}
			}catch(err){
				console.log(`Error pulling outfit trackers`);
				console.log(err);
			}
		}
	}
}