/**
 * This file defines commonly used components to cut down on code reuse
 * @module utils
 */

import { fetch } from 'undici';

/**
 * All PC servers except for Jaeger
 */
export const pcServers = [
	{
		name: "Connery",
		value: "connery"
	},
	{
		name: "Miller",
		value: "miller"
	},
	{
		name: "Cobalt",
		value: "cobalt"
	},
	{
		name: "Emerald",
		value: "emerald"
	},
	{
		name: "SolTech",
		value: "soltech"
	}
];

export const platforms = [
	{
		name: 'PC',
		value: 'ps2:v2'
	},
	{
		name: 'PS4 US',
		value: 'ps2ps4us:v2'
	},
	{
		name: 'PS4 EU',
		value: 'ps2ps4eu:v2'
	}
];

/**
 * A list of the different servers all lowercase
 */
export const servers = [
	"connery",
	"miller",
	"cobalt",
	"emerald",
	"jaeger",
	"soltech",
	"genudine",
	"ceres"
];

/**
 * All servers except for Jaeger
 */
export const serversNoJaeger = [
	{
		name: "Connery",
		value: "connery"
	},
	{
		name: "Miller",
		value: "miller"
	},
	{
		name: "Cobalt",
		value: "cobalt"
	},
	{
		name: "Emerald",
		value: "emerald"
	},
	{
		name: "SolTech",
		value: "soltech"
	},
	{
		name: "Genudine",
		value: "genudine"
	},
	{
		name: "Ceres",
		value: "ceres"
	}
];

export const allServers = serversNoJaeger.concat([{ name: 'Jaeger', value: 'jaeger'}]);

/**
 * A list of the different continents all capitalized
 */
export const continents = [
	"Indar",
	"Hossin",
	"Amerish",
	"Esamir",
	"Oshur",
	"Koltyr"
];

/**
 * `continentID`: `continentName`
 */
export const continentNames = {
	2: "Indar",
	4: "Hossin",
	6: "Amerish",
	8: "Esamir",
	344: "Oshur",
	14: "Koltyr"
};

/**
 * `serverID`: `serverName`
 */
export const serverNames = {
	1: "Connery",
	10: "Miller",
	13: "Cobalt",
	17: "Emerald",
	19: "Jaeger",
	40: "SolTech",
	1000: "Genudine",
	2000: "Ceres"
};

/**
 * `serverName`: `serverID`
 */
export const serverIDs = {
	"connery": 1,
	"miller": 10,
	"cobalt": 13,
	"emerald": 17,
	"jaeger": 19,
	"soltech": 40,
	"genudine": 1000,
	"ceres": 2000
};

/**
 * Checks for disallowed characters in `input`
 * @param {string} input - string to check
 * @returns {boolean} true if input contains a disallowed character
 */
export function badQuery(input){
	// This is its own function so a single list of disallowed characters can be maintained
	return input.match(/[<@>!+&?%*#$^()_:/\\,`~[\]{}|+=]/g) !== null;
}

/**
 * Send a request to the PS2 census API
 * @param {string} platform - which environment to request, eg. ps2:v2, ps2ps4us:v2, or ps2ps4eu:v2
 * @param {string} key - what information you want to get from the API
 * @param {string} extension - the URL extension to request
 * @returns results of the request encoded in JSON
 * @throws if there are Census API errors
 */
export async function censusRequest(platform, key, extension, retry = 2){
	// Places boilerplate error checking in one location and standardizes it
	// Allows for easily changing https to http if there is an error
	const uri = `https://census.daybreakgames.com/s:${process.env.serviceID}/get/${platform}/${extension}`;
	if (retry === 0) {
		return;
	}
	try{
		const request = await fetch(uri);
		if(!request.ok) {
			throw `Census API unreachable: ${request.status}`;
		}
		const response = await request.json();
		if(typeof(response.error) !== 'undefined'){
			if(response.error == 'service_unavailable'){
				throw "Census API currently unavailable";
			}
			if(typeof(response.error) === 'string'){
				throw `Census API error: ${response.error}`;
			}
			throw response.error;
		}
		if(typeof(response.errorCode) !== 'undefined'){
			if(response.errorCode == "SERVER_ERROR" && response.errorMessage){
				throw `Census API server error: ${response.errorMessage}`;
			}
			throw `Census API error: ${response.errorCode}`;
		}
		if(typeof(response[key]) === 'undefined' || !Array.isArray(response[key])){
			throw "Census API error: undefined response";
		}
		return response[key];
	}
	catch(err){
		if(typeof(err) === 'string'){
			throw err;
		}
		if(err instanceof SyntaxError){
			// .json() occurs when census gets redirected to https://www.daybreakgames.com/home
			throw "Census API unavailable: Redirect";
		}
		// fetch() only throws TypeErrors https://developer.mozilla.org/en-US/docs/Web/API/fetch#exceptions
		// Due to how finicky the census and fetch() not retrying on error we use recurion to retry the request
		const request = censusRequest(platform, key, extension, retry - 1);
		if (request !== undefined) {
			return request;
		}
		throw `Census API error: ${err.cause.code}`;
	}
}

/**
 * Translate number to locale
 * @param {number} n - number to convert
 * @param {string} locale - locale to use e.g. en-US
 * @returns {string} locale-formatted number
 */
export function localeNumber(n, locale){
	// Standardize numbers across commands, shorten bulky function call
	if(n >= 1000){
		return n.toLocaleString(locale, {maximumFractionDigits: 0});
	}
	if(n >= 100){
		return n.toLocaleString(locale, {maximumFractionDigits: 1});
	}
	if(n > 1){
		return n.toLocaleString(locale, {maximumFractionDigits: 2});
	}
	return n.toLocaleString(locale, {maximumFractionDigits: 3});
}

/**
 * Get basic information of a faction
 * @param {string} factionID - faction ID to get information of
 * @returns {faction} `faction` object
 */
export function faction(factionID){
	/**
	 * @typedef {Object} faction
	 * @property {import('discord.js').ColorResolvable} color - faction color
	 * @property {string} decal - faction logo emoji
	 * @property {string} initial - faction initial
	 * @property {string} tracker - faction color emoji	
	 */
	switch (String(factionID)){
		case "1":
			return {color: 'Purple', decal: '<:VS:818766983918518272>', initial: 'VS', tracker: '🟣'};
		case "2":
			return {color: 'Blue', decal: '<:NC:818767043138027580>', initial: 'NC', tracker: '🔵'};
		case "3":
			return {color: 'Red', decal: '<:TR:818988588049629256>', initial: 'TR', tracker: '🔴'};
		default:
			return {color: 'Grey', decal: '<:NS:819511690726866986>', initial: 'NSO', tracker: '⚪'};
	}
}