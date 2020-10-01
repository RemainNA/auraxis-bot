// This file defines functions used to compare the stored list of online players against the census API online status
// Any characters that are reported as offline are removed from the online list

const got = require('got');

async function checkChar(uri){
	let response = "";
	try{
		response = await got(uri).json(); 
	}
	catch(err){
		return new Promise(function(resolve, reject){
			reject(err);
		})
	}
	if(response.character_list[0].online_status == "service_unavailable"){
		return new Promise(function(resolve, reject){
			reject("service unavailable");
		})
	}
	if(response.character_list[0].online_status == "0"){
		return new Promise(function(resolve, reject){
			resolve("offline");
		})
	}
	return new Promise(function(resolve, reject){
		resolve("online");
	})
}

running = false;

module.exports = {
	validate: async function(pgClient){
		if(running){
			return;
		}
		running = true;
		console.log("start", new Date().toLocaleString());
		let res = await pgClient.query("SELECT * FROM population;");
		for(let row of res.rows){
			let platform = "ps2:v2";
			if(row.world == "1000"){
				platform = "ps2ps4us:v2";
			}
			if(row.world == "2000"){
				platform = "ps2ps4eu:v2";
			}
			let uri = 'https://census.daybreakgames.com/s:'+process.env.serviceID+'/get/'+platform+'/character/'+row.id+'?c:resolve=online_status';
			let status = "";
			try{
				status = await checkChar(uri)
			}
			catch{err =>{
				console.log(err);
				if(err == "service unavailable"){
					running = false;
					console.log("finish, unavailable", new Date().toLocaleString());
					return;
				}
			}}
			if(status == "offline"){
				pgClient.query("DELETE FROM population WHERE id=$1",[row.id])
					.catch(err =>{
						console.log(err);
						if(typeof(err) == 'string'){
							console.log(err);
						}
					})
			}
		}
		console.log("finish", new Date().toLocaleString());
		running = false;
	}
}