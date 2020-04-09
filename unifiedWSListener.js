// This file implements a function with three event listeners, one for each platform.  The event listeners pass all messages with payloads on to the handler function.

var WebSocket = require('ws');
const Discord = require('discord.js');

const { Client } = require('pg');

var handler = require('./unifiedWSHandler');

var running = false;

module.exports = {
    start: function(pgClient, discordClient){
        if(running){
            console.log('Listener already running');
            return;
        }
        running = true;
        lastMessage = "";
        pcLogin = '{"service":"event","action":"subscribe","worlds":["1","10","13","17","19","40"],"eventNames":["PlayerLogin","PlayerLogout"]}';
        pcAlerts = '{"service":"event","action":"subscribe","worlds":["1","10","13","17","19","40"],"eventNames":["MetagameEvent"]}';
        usLogin = '{"service":"event","action":"subscribe","worlds":["1000"],"eventNames":["PlayerLogin","PlayerLogout"]}';
        usAlerts = '{"service":"event","action":"subscribe","worlds":["1000"],"eventNames":["MetagameEvent"]}';
        euLogin = '{"service":"event","action":"subscribe","worlds":["2000"],"eventNames":["PlayerLogin","PlayerLogout"]}';
        euAlerts = '{"service":"event","action":"subscribe","worlds":["2000"],"eventNames":["MetagameEvent"]}';
        pcURI = 'wss://push.planetside2.com/streaming?environment=ps2&service-id=s:'+process.env.serviceID;
        usURI = 'wss://push.planetside2.com/streaming?environment=ps2ps4us&service-id=s:'+process.env.serviceID;
        euURI = 'wss://push.planetside2.com/streaming?environment=ps2ps4eu&service-id=s:'+process.env.serviceID;

        pcClient = new WebSocket(pcURI);
        usClient = new WebSocket(usURI);
        euClient = new WebSocket(euURI);

        // PC Client
        pcClient.on('open', function open(){
            console.log('Connected to PC Stream API')
			pcClient.send(pcLogin);
			pcClient.send(pcAlerts);
        })

        pcClient.on('message', function incoming(data){
            let parsed = JSON.parse(data);
			if(parsed.payload != null && parsed.payload != lastMessage){
                handler.router(parsed.payload, "ps2:v2", pgClient, discordClient);
                lastMessage = parsed.payload;
			}
        })

        pcClient.on('error', function err(error){
            console.log(error);
        })

        // US Client
        usClient.on('open', function open(){
            console.log('Connected to PS4 US Stream API')
			usClient.send(usLogin);
			usClient.send(usAlerts);
        })

        usClient.on('message', function incoming(data){
            let parsed = JSON.parse(data);
			if(parsed.payload != null && parsed.payload != lastMessage){
                handler.router(parsed.payload, "ps2ps4us:v2", pgClient, discordClient);
                lastMessage = parsed.payload;
			}
        })

        usClient.on('error', function err(error){
            console.log(error);
        })

        // EU Client
        euClient.on('open', function open(){
            console.log('Connected to PS4 EU Stream API')
			euClient.send(euLogin);
			euClient.send(euAlerts);
        })

        euClient.on('message', function incoming(data){
            let parsed = JSON.parse(data);
			if(parsed.payload != null && parsed.payload != lastMessage){
                handler.router(parsed.payload, "ps2ps4eu:v2", pgClient, discordClient);
                lastMessage = parsed.payload;
			}
        })

        euClient.on('error', function err(error){
            console.log(error);
        })
    }
}