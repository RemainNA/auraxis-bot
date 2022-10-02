/**
 * This file defines methods for sending messages to subscribed channels, and handles errors that occur in that process.
 * @module messageHandler
 * @typedef {import('discord.js').TextBasedChannel} Channel
 * @typedef {import('discord.js').MessagePayload} Message
 * @typedef {import('discord.js').MessageCreateOptions} MessageOptions
 */

import { ChannelType, PermissionsBitField } from 'discord.js';

/**
 * Send embed message to a channel
 * @param {Channel} channel - the channel to send the message to
 * @param {Message | string | MessageOptions} message - the message to send
 * @param {string} context - the context of the error
 * @param {boolean} embed - whether or not the message is an embed
 * @returns the ID of the message sent. If the bot does not have permission will return -1
 */
export async function send(channel, message, context="default", embed=false){
    if(embed && channel.type !== ChannelType.DM && !channel.permissionsFor(channel.guild.members.me).has(PermissionsBitField.Flags.EmbedLinks)){
        try {
            await channel.send('Please grant the "Embed Links" permission to use this command');
        }
        catch (err) {
            console.log(`Error sending embed permission message in context: ${context}`);
            if(err.message !== undefined){
                console.log(err.message);
            }
            console.log(channel.guild.name);
        }
    }
    else{
        try {
            const result = await channel.send(message);
            return result.id
        }
        catch (err) {
            console.log(`Error sending message in context: ${context}`);
            if(err.message !== undefined){
                console.log(err.message);
            }
            if(channel.type !== ChannelType.DM){
                console.log(channel.guild.name);
            }
        }
    }
    return -1;
}

/**
 * Logs errors where which function the error occured in
 * @param {Channel} channel - the channel to send the error message to
 * @param {string} err - the error to send
 * @param {string} context - the context of the error 
 */
export function handleError(channel, err, context="default"){
    if(typeof(err) == 'string'){
        send(channel, err, context);
    }
    else{
        console.log(`Error returned from function in context: ${context}`);
        console.log(err);
    }
}