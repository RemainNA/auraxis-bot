// This file implements functions to look up and report server status

const Discord = require('discord.js');
var got = require('got');

var info = async function(environment, status=false){
	let uri = 'http://census.daybreakgames.com/s:'+process.env.serviceID+'/get/'+environment+'/world?c:limit=10&c:lang=en'
	if(typeof(status) !== 'object'){
		status = {
			'Connery': 'Unknown',
			'Miller': 'Unknown',
			'Cobalt': 'Unknown',
			'Emerald': 'Unknown',
			'SolTech': 'Unknown',
			'Jaeger': 'Unknown',
			'Genudine': 'Unknown',
			'Ceres': 'Unknown'
		}
	}

	try{
		response = await got(uri).json(); 
	}
	catch(err){
		if(err.message.indexOf('404') > -1){
			return new Promise(function(resolve, reject){
				reject("API Unreachable");
			})
		}
	}
	if(typeof(response.error) !== 'undefined'){
        if(response.error == 'service_unavailable'){
            return new Promise(function(resolve, reject){
                reject("Census API currently unavailable");
            })
        }
        return new Promise(function(resolve, reject){
            reject(response.error);
        })
    }
    if(typeof(response.world_list) === 'undefined'){
        return new Promise(function(resolve, reject){
            reject("API Error");
        })
	}
	
	let data = response.world_list;
	for(let world of data){
		if(typeof(status[world.name.en]) === 'undefined'){
			continue;
			// This pretty much just serves to ignore Briggs
		}
		status[world.name.en] = world.state;
	}

	return new Promise(function(resolve, reject){
		resolve(status);
	})
}

module.exports = {
	servers: async function(){
		let status = false
		let errors = 0;
		try{
			status = await info('ps2:v2');
		}
		catch(err){
			errors += 1;
		}
		try{
			status = await info('ps2ps4us:v2',status);}
		catch(err){
			errors += 1;
		}
		try{
			status = await info('ps2ps4eu:v2', status);
		}
		catch(err){
			errors += 1;
		}
		if(errors == 3){
			return new Promise(function(resolve, reject){
				reject("An error occurred while retrieving server status");
			})
		}
		let resEmbed = new Discord.RichEmbed();
		resEmbed.setTitle('Server Status');
		for(i in status){
			resEmbed.addField(i, status[i], true);
		}
		resEmbed.setTimestamp();
		return new Promise(function(resolve, reject){
			resolve(resEmbed);
		})
	}
}