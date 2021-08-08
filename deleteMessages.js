// This file implements methods to list messages marked for deletion, and then delete them

async function retrieveMessages(channelId, pgClient, discordClient){
	const now = new Date();
	try{
		let channel = await discordClient.channels.fetch(channelId);
		let messages = await pgClient.query("SELECT messageId FROM toDelete WHERE timeToDelete < $1 AND channel = $2;", [now, channelId]);
		for (const row of messages.rows){
			deleteMessage(channel, row.messageid, pgClient);
		}
	}
	catch(err){
		console.log(`Error retrieving messages to delete for channel ${channelId}`);
		console.log(err);
		await pgClient.query("DELETE FROM toDelete WHERE channel = $1;", [channelId]);
	}
}

async function deleteMessage(channel, message, pgClient){
	try{
		let msg = await channel.messages.fetch(message);
		await msg.delete();
		await pgClient.query("DELETE FROM toDelete WHERE messageid = $1;", [message]);
	}
	catch(err){
		if(err.code == 10008){
			//Ignore, unknown message/it was probably already deleted
		}
		else{
			console.log(`Error deleting message ${message}`);
			console.log(err);
		}
		await pgClient.query("DELETE FROM toDelete WHERE messageid = $1;", [message]);
	}
}

module.exports = {
	run: async function(pgClient, discordClient){
		const now = new Date();
		try{
			let channels = await pgClient.query("SELECT DISTINCT channel FROM toDelete WHERE timeToDelete < $1;", [now]);
			for (const row of channels.rows){
				retrieveMessages(row.channel, pgClient, discordClient);
			}
		}
		catch(err){
			console.log("Error retrieving channels to delete from");
			console.log(err);
		}
	}
}