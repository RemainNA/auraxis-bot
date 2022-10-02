/**
 * This file implements listening in on the census stream and routing the data to the appropriate handler
 * @module unifiedWSListener
 * @typedef {import('pg').Client} pg.Client
 * @typedef {import('discord.js').Client} discord.Client
 */

import WebSocket from 'ws';
import { router } from './unifiedWSHandler.js';

const PC_SUBSCRIPTION = '{"service":"event","action":"subscribe","worlds":["1","10","13","17","19","40"],"eventNames":["PlayerLogin","PlayerLogout","MetagameEvent","FacilityControl"]}';
const US_SUBSCRIPTION = '{"service":"event","action":"subscribe","worlds":["1000"],"eventNames":["PlayerLogin","PlayerLogout","MetagameEvent","FacilityControl"]}';
const EU_SUBSCRIPTION = '{"service":"event","action":"subscribe","worlds":["2000"],"eventNames":["PlayerLogin","PlayerLogout","MetagameEvent","FacilityControl"]}';
const PC_URI = `wss://push.nanite-systems.net/streaming?environment=ps2&service-id=s:${process.env.serviceID}`;
const US_URI = `wss://push.nanite-systems.net/streaming?environment=ps2ps4us&service-id=s:${process.env.serviceID}`;
const EU_URI = `wss://push.nanite-systems.net/streaming?environment=ps2ps4eu&service-id=s:${process.env.serviceID}`;

/**
 * Create and listen on PC census stream, will automatically restart the listener on an error
 * @param {pg.Client} pgClient - postgres client to query the database
 * @param {discord.Client} discordClient - discord client to use
 * @param {number} pcTimeout - growth factor of reconnection logic for PC stream listener
 */
function PCStream(pgClient, discordClient, pcTimeout = 0) {
    const pcClient = new WebSocket(PC_URI);

    pcClient.on('open', () => {
        console.log('Connected to PC Stream API');
        pcClient.send(PC_SUBSCRIPTION);
    });

    pcClient.on('message', (data) => {
        const parsed = JSON.parse(data.toString());
        if (parsed.payload !== undefined) {
            router(parsed.payload, "ps2:v2", pgClient, discordClient);
        }
    });

    pcClient.on('error', (error) => {
        console.log(`PC Stream ${error}`);
    });

    pcClient.on('close', () => {
        console.log("Restarting socket");
        setTimeout(() => {
            PCStream(pgClient, discordClient, ++pcTimeout);
        }, Math.min(1000 * (2 ** pcTimeout), 300000));
    });
}
/**
 * Create and listen on PS4 US census stream, will automatically restart the listener on an error
 * @param {pg.Client} pgClient - postgres client to query the database
 * @param {discord.Client} discordClient - discord client to use
 * @param {number} usTimeout - growth factor of reconnection logic for PS4 US stream listener
 */
function PS4USStream(pgClient, discordClient, usTimeout = 0) {
    const usClient = new WebSocket(US_URI);

    usClient.on('open', () => {
        console.log('Connected to PS4 US Stream API');
        usClient.send(US_SUBSCRIPTION);
    });

    usClient.on('message', (data) => {
        const parsed = JSON.parse(data.toString());
        if (parsed.payload !== undefined) {
            router(parsed.payload, "ps2ps4us:v2", pgClient, discordClient);
        }
    });

    usClient.on('error', (error) => {
        console.log(`PS4 US Stream ${error}`);
    });

    usClient.on('close', () => {
        console.log("Restarting socket");
        setTimeout(() => {
            PS4USStream(pgClient, discordClient, ++usTimeout);
        }, Math.min(1000 * (2 ** usTimeout), 300000));
    });
}
/**
 * Create and listen on PS4 EU census stream, will automatically restart the listener on an error
 * @param {pg.Client} pgClient - postgres client to query the database
 * @param {discord.Client} discordClient - discord client to use
 * @param {number} euTimeout - growth factor of reconnection logic for PS4 EU stream listener
 */
function PS4EUStream(pgClient, discordClient, euTimeout = 0) {
    const euClient = new WebSocket(EU_URI);

    euClient.on('open', () => {
        console.log('Connected to PS4 EU Stream API');
        euClient.send(EU_SUBSCRIPTION);
    });

    euClient.on('message', (data) => {
        const parsed = JSON.parse(data.toString());
        if (parsed.payload !== undefined) {
            router(parsed.payload, "ps2ps4eu:v2", pgClient, discordClient);
        }
    });

    euClient.on('error', (error) => {
        console.log(`PS4 EU Stream ${error}`);
    });

    euClient.on('close', () => {
        console.log("Restarting socket");
        setTimeout(() => {
            PS4EUStream(pgClient, discordClient, ++euTimeout);
        }, Math.min(1000 * (2 ** euTimeout), 300000));
    });
}

/**
 * Create and start census Stream listeners for the three platforms
 * @param {pg.Client} pgClient - postgres client to query the database
 * @param {discord.Client} discordClient - discord client to use
 */
export function start(pgClient, discordClient) {
    PCStream(pgClient, discordClient);
    PS4USStream(pgClient, discordClient);
    PS4EUStream(pgClient, discordClient);
}