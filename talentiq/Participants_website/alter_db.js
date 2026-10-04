const { Client } = require('pg');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL must be set before running this script.');
}

const client = new Client({ connectionString });

async function run() {
  try {
    await client.connect();
    console.log("Connected to database!");

    const migrations = [
      '20260927_responses_education.sql',
      '20260929_responses_checkin_time.sql',
      '20260930_responses_checkin_time_central.sql',
      '20260930_responses_checkin_time_display.sql',
      '20260930_validate_candidate_checkin_time.sql',
    ];

    await client.query('BEGIN');
    for (const migration of migrations) {
      const sql = readFileSync(join(__dirname, 'supabase', 'migrations', migration), 'utf8');
      await client.query(sql);
      console.log(`Applied ${migration}`);
    }
    await client.query('COMMIT');
    console.log('Responses columns are ready.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error("Error executing query:", err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();
