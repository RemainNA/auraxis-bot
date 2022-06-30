// @ts-check
/**
 * This file implements a function with three event listeners, one for each platform.  The event listeners pass all messages with payloads on to the handler function.
 * @ts-check
 * @module unifiedWSListener
 */

const WebSocket = require('ws');
const handler = require('./unifiedWSHandler');

let pcRunning = false;
let usRunning = false;
let euRunning = false;

let pcTimeout = 0;
let usTimeout = 0;
let euTimeout = 0;

/**
 * Create and start the event listeners for the three platforms
 * Will automatically restart the listeners on an error
 * @param {pg.Client} pgClient - postgresql client used to connect to the database
 * @param {discord.Client} discordClient - discord client to use
 */
function listen(pgClient, discordClient){
    const pcLogin = '{"service":"event","action":"subscribe","worlds":["1","10","13","17","19","40"],"eventNames":["PlayerLogin","PlayerLogout"]}';
    const pcAlerts = '{"service":"event","action":"subscribe","worlds":["1","10","13","17","19","40"],"eventNames":["MetagameEvent","FacilityControl"]}';
    const usLogin = '{"service":"event","action":"subscribe","worlds":["1000"],"eventNames":["PlayerLogin","PlayerLogout"]}';
    const usAlerts = '{"service":"event","action":"subscribe","worlds":["1000"],"eventNames":["MetagameEvent","FacilityControl"]}';
    const euLogin = '{"service":"event","action":"subscribe","worlds":["2000"],"eventNames":["PlayerLogin","PlayerLogout"]}';
    const euAlerts = '{"service":"event","action":"subscribe","worlds":["2000"],"eventNames":["MetagameEvent","FacilityControl"]}';
    const pcURI = 'wss://push.planetside2.com/streaming?environment=ps2&service-id=s:'+process.env.serviceID;
    const usURI = 'wss://push.planetside2.com/streaming?environment=ps2ps4us&service-id=s:'+process.env.serviceID;
    const euURI = 'wss://push.planetside2.com/streaming?environment=ps2ps4eu&service-id=s:'+process.env.serviceID;

    // PC Client
    if(!pcRunning){
        const pcClient = new WebSocket(pcURI);

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
                pcTimeout++;
                listen(pgClient, discordClient);
            }, Math.min(1000 * (2 ** pcTimeout), 300000));
        })
    
    }
    
    // US Client
    if(!usRunning){
        const usClient = new WebSocket(usURI);

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
                usTimeout++;
                listen(pgClient, discordClient);
            }, Math.min(1000 * (2 ** usTimeout), 300000));
        })

    }
    
    // EU Client
    if(!euRunning){
        const euClient = new WebSocket(euURI);

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
                euTimeout++;
                listen(pgClient, discordClient);
            }, Math.min(1000 * (2 ** euTimeout), 300000));
        })
    }
}

module.exports = {
    /**
     * Create and start the event listeners for the three platforms
     * @param {pg.Client} pgClient - postgresql client used to connect to the database
     * @param {discord.Client} discordClient - discord client to use
     */
    start: function(pgClient, discordClient){
        listen(pgClient, discordClient);   
    }
}