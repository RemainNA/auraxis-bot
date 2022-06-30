// @ts-check
/**
 * This file defines commonly used components to cut down on code reuse
 * @ts-check
 * @module utils
 */

const got = require('got');

/**
 * A list of the different servers all lowercase
 */
const servers = [
	"connery",
    "miller",
    "cobalt",
    "emerald",
	"jaeger",
    "soltech",
    "genudine",
    "ceres"
]

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
]

/**
 * `serverID`: `serverName`
 */
const serverNames = {
	1: "Connery",
	10: "Miller",
	13: "Cobalt",
	17: "Emerald",
	19: "Jaeger",
	40: "SolTech",
	1000: "Genudine",
	2000: "Ceres"
}

/**
 * `serverName`: `serverID`
 */
const serverIDs = {
    "connery": 1,
    "miller": 10,
    "cobalt": 13,
    "emerald": 17,
    "jaeger": 19,
    "soltech": 40,
    "genudine": 1000,
    "ceres": 2000
}

/**
 * Checks for disallowed characters in `input`
 * @param {string} input - string to check
 * @returns {boolean} true if input contains a disallowed character
 */
function badQuery(input){
	// This is its own function so a single list of disallowed characters can be maintained
	return input.match(/[<@>!+&?%*#$^()_:/\\,`~[\]{}|+=]/g) !== null;
}

/**
 * Send a request to the PS2 census API
 * @param {string} platform - which environment to request, eg. ps2:v2, ps2ps4us:v2, or ps2ps4eu:v2
 * @param {string} key - what information you want to get from the API
 * @param {string} extension - the URL extension to request
 * @returns results of the request encoded in JSON
 */
async function censusRequest(platform, key, extension){
	// Places boilerplate error checking in one location and standardizes it
	// Allows for easily changing https to http if there is an error
	const uri = `https://census.daybreakgames.com/s:${process.env.serviceID}/get/${platform}/${extension}`;
	try{
		const response = await got(uri).json();
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
		if(typeof(response[key]) === 'undefined'){
			throw "Census API error: undefined response";
		}
		return response[key];
	}
	catch(err){
		if(typeof(err) == 'string'){
			throw err;
		}
		if(err.message.indexOf('404') > -1){
            throw "Census API unreachable: 404";
        }
		if(err.name == 'ParseError'){
			throw "Census API unavailable: Redirect"
		}
		if(err.code == 'ECONNRESET'){
			throw "Census API error: ECONNRESET"
		}
		if(err.code == 'ECONNREFUSED'){
			throw "Census API error: ECONNREFUSED"
		}
		throw err;
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
	 * @property {string} color - faction color
	 * @property {string} decal - faction decal
	 * @property {string} initial - faction initial
	 * @property {string} tracker - faction color emoji	
	 */
	switch (String(factionID)){
		case "1":
			return {color: 'PURPLE', decal: '<:VS:818766983918518272>', initial: 'VS', tracker: '🟣'};
		case "2":
			return {color: 'BLUE', decal: '<:NC:818767043138027580>', initial: 'NC', tracker: '🔵'};
		case "3":
			return {color: 'RED', decal: '<:TR:818988588049629256>', initial: 'TR', tracker: '🔴'};
		default:
			return {color: 'GREY', decal: '<:NS:819511690726866986>', initial: 'NSO', tracker: '⚪'};
	}
}

module.exports = {
	servers: servers,
	continents: continents,
	serverNames: serverNames,
	serverIDs: serverIDs,
	badQuery: badQuery,
	censusRequest: censusRequest,
	localeNumber: localeNumber,
	faction: faction
}