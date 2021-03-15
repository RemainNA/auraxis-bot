// This file implements a function which initializes all tables used for subscription handling

//PostgreSQL connection
const { Client } = require('pg');

module.exports = {
	start: function(SQLclient){
		// Alert tables
		SQLclient.query("SELECT * FROM connery;", (err, res) => {
		    if (err){
				//create table if one not found
				console.log(err);
				console.log("Creating connery table");
				SQLclient.query("CREATE TABLE connery (channel TEXT);", (err, res) => {
					if (err){
						console.log(err);
					}
					else{
						console.log(res);
					}
				});
			}
		    
		});
		SQLclient.query("SELECT * FROM cobalt;", (err, res) => {
		    if (err){
				console.log(err);
				console.log("Creating cobalt table");
				SQLclient.query("CREATE TABLE cobalt (channel TEXT);", (err, res) => {
					if (err){
						console.log(err);
					}
					else{
						console.log(res);
					}
				});
			}
		    
		});
		SQLclient.query("SELECT * FROM miller;", (err, res) => {
		    if (err){
				console.log(err);
				console.log("Creating miller table");
				SQLclient.query("CREATE TABLE miller (channel TEXT);", (err, res) => {
					if (err){
						console.log(err);
					}
					else{
						console.log(res);
					}
				});
			}
		    
		});
		SQLclient.query("SELECT * FROM emerald;", (err, res) => {
		    if (err){
				console.log(err);
				console.log("Creating emerald table");
				SQLclient.query("CREATE TABLE emerald (channel TEXT);", (err, res) => {
					if (err){
						console.log(err);
					}
					else{
						console.log(res);
					}
				});
			}
		    
		});
		SQLclient.query("SELECT * FROM jaegar;", (err, res) => {
		    if (err){
				console.log(err);
				console.log("Creating jaegar table");
				SQLclient.query("CREATE TABLE jaegar (channel TEXT);", (err, res) => {
					if (err){
						console.log(err);
					}
					else{
						console.log(res);
					}
				});
			}
		    
		});
		SQLclient.query("SELECT * FROM soltech;", (err, res) => {
		    if (err){
				console.log(err);
				console.log("Creating soltech table");
				SQLclient.query("CREATE TABLE soltech (channel TEXT);", (err, res) => {
					if (err){
						console.log(err);
					}
					else{
						console.log(res);
					}
				});
			}
		    
		});
		SQLclient.query("SELECT * FROM genudine;", (err, res) => {
		    if (err){
				console.log(err);
				console.log("Creating genudine table");
				SQLclient.query("CREATE TABLE genudine (channel TEXT);", (err, res) => {
					if (err){
						console.log(err);
					}
					else{
						console.log(res);
					}
				});
			}
		    
		});
		SQLclient.query("SELECT * FROM ceres;", (err, res) => {
		    if (err){
				console.log(err);
				console.log("Creating ceres table");
				SQLclient.query("CREATE TABLE ceres (channel TEXT);", (err, res) => {
					if (err){
						console.log(err);
					}
					else{
						console.log(res);
					}
				});
			}
		    
		});

		// Outfit activity tables
		SQLclient.query("SELECT * FROM outfit;", (err, res) => {
		    if (err){
				console.log(err);
				console.log("Creating outfit table");
				SQLclient.query("CREATE TABLE outfit (id bigint, color TEXT, alias TEXT, channel TEXT);", (err, res) => {
					if (err){
						console.log(err);
					}
					else{
						console.log(res);
					}
				});
			}
		    
		});
		SQLclient.query("SELECT * FROM ps4usoutfit;", (err, res) => {
		    if (err){
				console.log(err);
				console.log("Creating outfit table");
				SQLclient.query("CREATE TABLE ps4usoutfit (id bigint, color TEXT, alias TEXT, channel TEXT);", (err, res) => {
					if (err){
						console.log(err);
					}
					else{
						console.log(res);
					}
				});
			}
		    
		});
		SQLclient.query("SELECT * FROM ps4euoutfit;", (err, res) => {
		    if (err){
				console.log(err);
				console.log("Creating outfit table");
				SQLclient.query("CREATE TABLE ps4euoutfit (id bigint, color TEXT, alias TEXT, channel TEXT);", (err, res) => {
					if (err){
						console.log(err);
					}
					else{
						console.log(res);
					}
				});
			}
		    
		});

		// Outfit Captures tables
		SQLclient.query("SELECT * FROM outfitcaptures;", (err, res) => {
		    if (err){
				console.log(err);
				console.log("Creating outfit captures table");
				SQLclient.query("CREATE TABLE outfitcaptures (id bigint, alias TEXT, channel TEXT, name TEXT);", (err, res) => {
					if (err){
						console.log(err);
					}
					else{
						console.log(res);
					}
				});
			}
		    
		});

		SQLclient.query("SELECT * FROM ps4usoutfitcaptures;", (err, res) => {
		    if (err){
				console.log(err);
				console.log("Creating outfit captures table");
				SQLclient.query("CREATE TABLE ps4usoutfitcaptures (id bigint, alias TEXT, channel TEXT, name TEXT);", (err, res) => {
					if (err){
						console.log(err);
					}
					else{
						console.log(res);
					}
				});
			}
		    
		});

		SQLclient.query("SELECT * FROM ps4euoutfitcaptures;", (err, res) => {
		    if (err){
				console.log(err);
				console.log("Creating outfit captures table");
				SQLclient.query("CREATE TABLE ps4euoutfitcaptures (id bigint, alias TEXT, channel TEXT, name TEXT);", (err, res) => {
					if (err){
						console.log(err);
					}
					else{
						console.log(res);
					}
				});
			}
		    
		});

		// News subscriptions
		SQLclient.query("SELECT * FROM news;", (err, res) => {
		    if (err){
				console.log(err);
				console.log("Creating news table");
				SQLclient.query("CREATE TABLE news (\
					id SERIAL PRIMARY KEY, \
					channel TEXT, \
					source TEXT\
					);", (err, res) => {
					if (err){
						console.log(err);
					}
					else{
						console.log(res);
					}
				});
			}
		});

		// Alert maintenance
		SQLclient.query("SELECT * FROM alertmaintenance;", (err, res) => {
		    if (err){
				console.log(err);
				console.log("Creating news table");
				SQLclient.query("CREATE TABLE alertMaintenance (\
					alertid text NOT NULL, \
					messageID text PRIMARY KEY NOT NULL, \
					channelid text NOT NULL,\
					goneprime boolean DEFAULT FALSE\
					);", (err, res) => {
					if (err){
						console.log(err);
					}
					else{
						console.log(res);
					}
				});
			}
		});
	}
}