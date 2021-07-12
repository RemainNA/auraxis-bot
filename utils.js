//This file defines commonly used components to cut down on code reuse

const servers = [
	"connery",
    "miller",
    "cobalt",
    "emerald",
	"jaegar",
    "soltech",
    "genudine",
    "ceres"
]

const serversNoJaegar = [
	"connery",
    "miller",
    "cobalt",
    "emerald",
    "soltech",
    "genudine",
    "ceres"
]

const continents = [
	"Indar",
	"Hossin",
	"Amerish",
	"Esamir"
]

const serverNames = {
	1: "Connery",
	10: "Miller",
	13: "Cobalt",
	17: "Emerald",
	19: "Jaegar",
	40: "SolTech",
	1000: "Genudine",
	2000: "Ceres"
}

const serverIDs = {
    "connery": 1,
    "miller": 10,
    "cobalt": 13,
    "emerald": 17,
    "jaegar": 19,
    "soltech": 40,
    "genudine": 1000,
    "ceres": 2000
}

function badQuery(input){
	// This is its own function so a single list of disallowed characters can be maintained
	return input.match(/[<@>!+&?%*#$^()_:/\\,`~[\]{}|+=]/g);
}

module.exports = {
	servers: servers,
	serversNoJaegar: serversNoJaegar,
	continents: continents,
	serverNames: serverNames,
	serverIDs: serverIDs,
	badQuery: badQuery
}