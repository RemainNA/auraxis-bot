const { Client } = require('pg');

module.exports = {
    alertSubscribe: async function(server, channel, client){
        if(['connery', 'miller', 'cobalt', 'emerald', 'jaegar', 'soltech', 'genudine','ceres'].indexOf(server.toLowerCase()) == -1){
            // Input validation
            return new Promise(function(resolve, reject){
                reject("Server not found");
            })
        }
        let countQuery = "SELECT count(*) FROM "+server+" WHERE channel="+channel;
        let rows = await client.query(countQuery);
        if(rows[0].count > 0){
            return new Promise(function(resolve, reject){
                resolve("Already subscribed to "+server+" alerts");
            })
        }
        else{
            let insertQuery = "INSERT INTO "+server+" VALUES ("+channel+")";
            try{
                client.query(insertQuery);
            }
            catch(error){
                return new Promise(function(resolve, reject){
                    reject(error);
                })
            }
            return new Promise(function(resolve, reject){
                resolve("Successfully subscribed to "+server+" alerts");
            })
        }
    }
}