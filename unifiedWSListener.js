// This file implements a function with three event listeners, one for each platform.  The event listeners pass all messages with payloads on to the handler function.

var WebSocket = require('ws');
const Discord = require('discord.js');
const population = require('./validatePopulation.js');

const { Client } = require('pg');

var handler = require('./unifiedWSHandler');

var pcRunning = false;
var usRunning = false;
var euRunning = false;

var backoff = 1000;

function listen(pgClient, discordClient){
    population.validate(pgClient); //Account for any logout events missed while the listener was offline
    pcLogin = '{"service":"event","action":"subscribe","worlds":["1","10","13","17","19","40"],"eventNames":["PlayerLogin","PlayerLogout"]}';
    pcAlerts = '{"service":"event","action":"subscribe","worlds":["1","10","13","17","19","40"],"eventNames":["MetagameEvent","FacilityControl"]}';
    usLogin = '{"service":"event","action":"subscribe","worlds":["1000"],"eventNames":["PlayerLogin","PlayerLogout"]}';
    usAlerts = '{"service":"event","action":"subscribe","worlds":["1000"],"eventNames":["MetagameEvent","FacilityControl"]}';
    euLogin = '{"service":"event","action":"subscribe","worlds":["2000"],"eventNames":["PlayerLogin","PlayerLogout"]}';
    euAlerts = '{"service":"event","action":"subscribe","worlds":["2000"],"eventNames":["MetagameEvent","FacilityControl"]}';
    pcURI = 'wss://push.planetside2.com/streaming?environment=ps2&service-id=s:'+process.env.serviceID;
    usURI = 'wss://push.planetside2.com/streaming?environment=ps2ps4us&service-id=s:'+process.env.serviceID;
    euURI = 'wss://push.planetside2.com/streaming?environment=ps2ps4eu&service-id=s:'+process.env.serviceID;

    // PC Client
    if(!pcRunning){
        pcClient = new WebSocket(pcURI);

        pcClient.on('open', function open(){
            console.log('Connected to PC Stream API')
            pcClient.send(pcLogin);
            pcClient.send(pcAlerts);
            pcRunning = true;
        })

        pcClient.on('message', function incoming(data){
            let parsed = JSON.parse(data);
            if(parsed.payload != null){
                handler.router(parsed.payload, "ps2:v2", pgClient, discordClient);
            }
        })

        pcClient.on('error', function err(error){
            console.log("PC error: "+ error);
            console.log("Closing socket");
            pcClient.close();
        })

        pcClient.on('close', function close(){
            pcRunning = false;
            setTimeout(function() {
                listen(pgClient, discordClient);
            }, backoff);
            backoff = backoff * 2;
        })
    
    }
    
    // US Client
    if(!usRunning){
        usClient = new WebSocket(usURI);

        usClient.on('open', function open(){
            console.log('Connected to PS4 US Stream API')
            usClient.send(usLogin);
            usClient.send(usAlerts);
            usRunning = true;
        })

        usClient.on('message', function incoming(data){
            let parsed = JSON.parse(data);
            if(parsed.payload != null){
                handler.router(parsed.payload, "ps2ps4us:v2", pgClient, discordClient);
            }
        })

        usClient.on('error', function err(error){
            console.log("US error: "+ error);
            console.log("Closing socket");
            usClient.close();
        })

        usClient.on('close', function close(){
            usRunning = false;
            setTimeout(function() {
                listen(pgClient, discordClient);
            }, backoff);
            backoff = backoff * 2;
        })

    }
    
    // EU Client
    if(!euRunning){
        euClient = new WebSocket(euURI);

        euClient.on('open', function open(){
            console.log('Connected to PS4 EU Stream API')
            euClient.send(euLogin);
            euClient.send(euAlerts);
            euRunning = true;
        })

        euClient.on('message', function incoming(data){
            let parsed = JSON.parse(data);
            if(parsed.payload != null){
                handler.router(parsed.payload, "ps2ps4eu:v2", pgClient, discordClient);
            }
        })

        euClient.on('error', function err(error){
            console.log("EU error: "+ error);
            console.log("Closing socket");
            euClient.close();
        })

        euClient.on('close', function close(){
            euRunning = false;
            setTimeout(function() {
                listen(pgClient, discordClient);
            }, backoff);
            backoff = backoff * 2;
        })
    }
}

module.exports = {
    start: function(pgClient, discordClient){
        listen(pgClient, discordClient);   
    }
}