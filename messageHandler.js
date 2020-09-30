// This file defines methods for sending messages, and handles errors that occur in that process.

module.exports = {
    send: function(channel, message, context="default", embed=false){
        if(embed && channel.type != 'dm' && !channel.permissionsFor(channel.guild.me).has('EMBED_LINKS')){
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
            channel.send(message).then(function(result){
                //message successfully sent, no action needed.
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
    },

    handleError: function(channel, err, context="default"){
        if(typeof(err) == 'string'){
            this.send(channel, err, context);
        }
        else{
            console.log("Error returned from function in context: "+context);
            console.log(err);
        }
    },

    badQuery: function(input){
        // This is it's own function so a single list of disallowed characters can be maintained
        return input.match(/[<@>!+&?%*#$^()_:/\\.,`~[\]{}|+=]/g);
    }
}