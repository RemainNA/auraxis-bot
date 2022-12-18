/**
 * main entry point to interact with the database
 * @module index
 */
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

pool.on('error', (err, client) => {
    console.error(`Unexpected error on idle client ${err}`);
});

/**
 * Query the database
 * @param { string } text - The query to run 
 * @param { any[] } values - The parameters to pass to the query
 * @returns the results of the query
 */
async function query(text, values=undefined) {
    return await pool.query(text, values);
}

module.exports = {
    query
};