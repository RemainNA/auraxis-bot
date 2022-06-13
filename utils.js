//This file defines commonly used components to cut down on code reuse
const got = require('got');

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

const continents = [
	"Indar",
	"Hossin",
	"Amerish",
	"Esamir",
	"Oshur",
	"Koltyr"
]

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

function badQuery(input){
	// This is its own function so a single list of disallowed characters can be maintained
	return input.match(/[<@>!+&?%*#$^()_:/\\,`~[\]{}|+=]/g);
}

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

function factionColor(faction){
	switch (faction){
		case "1":
			return 'PURPLE'
		case "2":
			return 'BLUE';
		case "3":
			return 'RED';
		default:
			return 'GREY';
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
	factionColor: factionColor
}