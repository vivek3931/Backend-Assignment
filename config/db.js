require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

async function connectToDatabase() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL database!');
  } catch (err) {
    console.error('Error connecting to the database:', err.message);
    // You may want to exit the application if the database connection fails
    process.exit(1); 
  }
}

module.exports = {
  client,
  connectToDatabase
};