/**
 * This file defines functions to keep outfit info up to date in subscriptions
 * @module outfitMaintenance
 * @typedef {import('pg').Client} pg.Client
 */

import { censusRequest } from './utils.js';

/**
 * `platform`: `environment`
 * @example
 * "pc": "ps2:v2"
 * "ps4us": "ps2ps4us:v2"
 * "ps4eu": "ps2ps4eu:v2"
 */
const platformToEnvironment = {
	"pc": "ps2:v2",
	"ps4us": "ps2ps4us:v2",
	"ps4eu": "ps2ps4eu:v2"
}

/**
 * Update current outfit tag/name to new tag/name if it has changed
 * @param {pg.Client} pgClient - Postgres client to use
 */
export async function update(pgClient){
	let outfitIDs = [];
	const activity = await pgClient.query("SELECT DISTINCT id, platform FROM outfitactivity;");
	const captures = await pgClient.query("SELECT DISTINCT id, platform FROM outfitcaptures;");
	for(const outfit of activity.rows){
		outfitIDs.push([outfit.id, outfit.platform]);
	}
	for(const outfit of captures.rows){
		if(!outfitIDs.includes([outfit.id, outfit.platform])){
			outfitIDs.push([outfit.id, outfit.platform]);
		}
	}
	for(const id of outfitIDs){
		try{
			const response = await censusRequest(platformToEnvironment[id[1]], 'outfit_list', `/outfit/${id[0]}`);
			if(response.length == 0){
				continue;
			}
			await pgClient.query("UPDATE outfitactivity SET alias = $1 WHERE id = $2;", [response[0].alias, id[0]]);
			await pgClient.query("UPDATE outfitcaptures SET alias = $1, name = $2 WHERE id = $3;", [response[0].alias, response[0].name, id[0]]);	
		}
		catch(err){
			console.log('Outfit maintenance error');
			console.log(id);
			console.log(err);
		}
	}
}