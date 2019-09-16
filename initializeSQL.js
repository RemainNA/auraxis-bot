//PostgreSQL connection
const { Client } = require('pg');

module.exports = {
	start: function(SQLclient){
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
				//create table if one not found
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
				//create table if one not found
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
				//create table if one not found
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
				//create table if one not found
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
				//create table if one not found
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
		SQLclient.query("SELECT * FROM outfit;", (err, res) => {
		    if (err){
				//create table if one not found
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
				//create table if one not found
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
				//create table if one not found
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
	}
}