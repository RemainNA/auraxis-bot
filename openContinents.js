//This file implements functions to check which continents are open and update base ownership

const {territoryInfo} = require('./territory.js');
const {serverIDs, servers, continents} = require('./utils.js');

const contIDs = {
	"Indar": "2",
	"Hossin": "4",
	"Amerish": "6",
	"Esamir": "8"
}

module.exports = {
	check: async function(pgClient){
		for(const server of servers){
			try{
				const territory = await territoryInfo(serverIDs[server]);
				for(const cont of continents){
					const total = territory[cont].vs + territory[cont].tr + territory[cont].nc;
					if(territory[cont].vs == total || territory[cont].tr == total || territory[cont].nc == total){
						pgClient.query("DELETE FROM bases WHERE continent = $1 AND world = $2;",
						[contIDs[cont], serverIDs[server]]);
					}
				}
			}
			catch(err){
				continue;  //Will retry in a minute, don't need to fill log
			}
		}
	}
}