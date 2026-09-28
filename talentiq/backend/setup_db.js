const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:YOUR_DB_PASSWORD@db.mmdfxpdxzqbagusfknuc.supabase.co:5432/postgres'
});

async function setup() {
  try {
    await client.connect();
    console.log("Connected to Supabase Postgres.");
    
    const query = `
      CREATE TABLE IF NOT EXISTS candidates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        initials TEXT NOT NULL,
        checkin_time TEXT NOT NULL,
        university TEXT NOT NULL,
        major TEXT NOT NULL,
        resume_content TEXT
      );
    `;
    
    await client.query(query);
    console.log("Table 'candidates' created or verified successfully.");
    
  } catch (err) {
    console.error("Error setting up DB:", err);
  } finally {
    await client.end();
  }
}

setup();
