/**
 * This file defines methods for sending messages, and handles errors that occur in that process.
 * @module messageHandler
 */

module.exports = {
    /**
     * Send embed message to a channel
     * @param {discord.Client.Channel} channel - the channel to send the message to
     * @param message - the message to send
     * @param {string} context - the context of the error
     * @param {boolean} embed - whether or not the message is an embed
     * @returns the result of the message send
     */
    send: async function(channel, message, context="default", embed=false){
        let res = -1;
        if(embed && channel.type != 'DM' && !channel.permissionsFor(channel.guild.me).has('EMBED_LINKS')){
            channel.send('Please grant the "Embed Links" permission to use this command').then(function(result){
                //message successfully sent, no action needed.
            }, function(err){
                console.log("Error sending embed permission message in context: "+context);
                if(typeof(err.message) !== 'undefined'){
                    console.log(err.message);
                }
                if(typeof(channel.guild) !== 'undefined'){
                    console.log(channel.guild.name);
                }
            });
        }
        else{
            await channel.send(message).then(function(result){
                res = result.id;
            }, function(err){
                console.log("Error sending message in context: "+context);
                if(typeof(err.message) !== 'undefined'){
                    console.log(err.message);
                }
                if(typeof(channel.guild) !== 'undefined'){
                    console.log(channel.guild.name);
                }
            });
        }

        return res;
    },

    /**
     * Logs errors where which function the error occured in
     * @param {discord.Client.Channel} channel - the channel to send the error message to
     * @param {string} err - the error to send
     * @param {string} context - the context of the error and 
     */
    handleError: function(channel, err, context="default"){
        if(typeof(err) == 'string'){
            this.send(channel, err, context);
        }
        else{
            console.log("Error returned from function in context: "+context);
            console.log(err);
        }
    }
}