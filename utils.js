/**
 * This file defines commonly used components to cut down on code reuse
 * @module utils
 */

const {existsSync} = require('node:fs');
const {fetch} = require('undici');

/**
 * A list of the different servers all lowercase
 */
const servers = [
	"connery",
    "miller",
	"jaeger",
    "soltech",
    "genudine",
    "ceres"
];

/**
 * A list of the different continents all capitalized
 */
const continents = [
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
 const continentNames = {
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
const serverNames = {
	1: "Connery",
	10: "Miller",
	19: "Jaeger",
	40: "SolTech",
	1000: "Genudine",
	2000: "Ceres"
};

/**
 * `serverName`: `serverID`
 */
const serverIDs = {
    "connery": 1,
    "miller": 10,
    "jaeger": 19,
    "soltech": 40,
    "genudine": 1000,
    "ceres": 2000
};

/**
 * `abbreviation`: `discordEmojiID`
 */
let discordEmojiVals = require('./static/emoji.json');
if (existsSync('./static/emoji.local.json')) {
    discordEmojiVals = require('./static/emoji.local.json');
}
const discordEmoji = discordEmojiVals;

/**
 * Checks for disallowed characters in `input`
 * @param {string} input - string to check
 * @returns {boolean} true if input contains a disallowed character
 */
function badQuery(input){
	// This is its own function so a single list of disallowed characters can be maintained
	return input.match(/[<@>!+&?%*#$^()_:;/\\,`~[\]{}|+=]/g) !== null;
}

/**
 * Send a request to the PS2 census API
 * @param {string} platform - which environment to request, eg. ps2:v2, ps2ps4us:v2, or ps2ps4eu:v2
 * @param {string} key - what information you want to get from the API
 * @param {string} extension - the URL extension to request
 * @returns results of the request encoded in JSON
 * @throws if there are Census API errors
 */
async function censusRequest(platform, key, extension, retry = 2){
	// Places boilerplate error checking in one location and standardizes it
	// Allows for easily changing https to http if there is an error
	const uri = `https://census.daybreakgames.com/s:${process.env.serviceID}/get/${platform}/${extension}`;
	if (retry === 0) {
		return;
	}
	try{
		const request = await fetch(uri, {headers: {"User-Agent": process.env.USER_AGENT}});
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
function localeNumber(n, locale){
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
function faction(factionID){
	/**
	 * @typedef {Object} faction
	 * @property {import('discord.js').ColorResolvable} color - faction color
	 * @property {string} decal - faction logo emoji
	 * @property {string} initial - faction initial
	 * @property {string} tracker - faction color emoji	
	 */
	switch (String(factionID)){
		case "1":
			return {color: 'Purple', decal: discordEmoji['VS'], initial: 'VS', tracker: '🟣'};
		case "2":
			return {color: 'Blue', decal: discordEmoji['NC'], initial: 'NC', tracker: '🔵'};
		case "3":
			return {color: 'Red', decal: discordEmoji['TR'], initial: 'TR', tracker: '🔴'};
		default:
			return {color: 'Grey', decal: discordEmoji['NSO'], initial: 'NSO', tracker: '⚪'};
	}
}

/**
 * Generate a link to a character
 * @param {string} charName - character name
 * @param {string} charID - character ID
 * @param {string} platform - which environment the character is on
 * @param {string} page - optional page to link to
 * @returns {string} link to character
 */
function characterLink(charName, charID, platform, page=""){
	if(page != ""){
		if(platform === "ps2:v2"){
			return `https://wt.honu.pw/c/${charID}/${page}?name=${charName}`;
		}
		else if(platform === "ps2ps4us:v2"){
			return `https://ps4us.ps2.fisu.pw/player/?name=${charName}&show=${page}`;
		}
		else if(platform === "ps2ps4eu:v2"){
			return `https://ps4eu.ps2.fisu.pw/player/?name=${charName}&show=${page}`;
		}
	}
	if(platform === "ps2:v2"){
		return `https://wt.honu.pw/c/${charID}?name=${charName}`;
	}
	else if(platform === "ps2ps4us:v2"){
		return `https://ps4us.ps2.fisu.pw/player/?name=${charName}`;
	}
	else if(platform === "ps2ps4eu:v2"){
		return `https://ps4eu.ps2.fisu.pw/player/?name=${charName}`;
	}
}

/**
 * Generate a link to an outfit
 * @param {string} outfitTag - outfit tag
 * @param {string} outfitID - outfit ID
 * @param {string} platform - which environment the outfit is on
 * @returns {string} link to outfit
 */
function outfitLink(outfitTag, outfitID, platform){
	if(platform === "ps2:v2"){
		return `https://wt.honu.pw/o/${outfitID}`;
	}
	else if(platform === "ps2ps4us:v2" && outfitTag != ""){
		return `https://ps4us.ps2.fisu.pw/outfit/?name=${outfitTag}`;
	}
	else if(platform === "ps2ps4eu:v2" && outfitTag != ""){
		return `https://ps4eu.ps2.fisu.pw/outfit/?name=${outfitTag}`;
	}
}

module.exports = {
	servers: servers,
	continents: continents,
	continentNames: continentNames,
	serverNames: serverNames,
	serverIDs: serverIDs,
	discordEmoji: discordEmoji,
	badQuery: badQuery,
	censusRequest: censusRequest,
	localeNumber: localeNumber,
	faction: faction,
	characterLink: characterLink,
	outfitLink: outfitLink
}