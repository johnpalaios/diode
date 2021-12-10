const mysql = require('mysql');
require('dotenv').config();

// Export MySQL connection pool with 10
// concurrently available connections
module.exports = mysql.createPool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionLimit: 10,
    host: process.env.HOST,
    database: process.env.DB_NAME
});
