// This file defines methods for sending messages, and handles errors that occur in that process.

const Discord = require('discord.js');

module.exports = {
    send: function(channel, message, context="default"){
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
    },

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