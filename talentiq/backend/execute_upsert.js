const fs = require('fs');
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:YOUR_DB_PASSWORD@db.mmdfxpdxzqbagusfknuc.supabase.co:5432/postgres'
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to Supabase Postgres.");
    
    const query = fs.readFileSync('upsert.sql', 'utf8');
    await client.query(query);
    console.log("Executed upsert.sql successfully.");
  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await client.end();
  }
}

run();
