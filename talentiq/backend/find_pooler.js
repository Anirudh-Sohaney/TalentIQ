const { Client } = require('pg');

const regions = [
  'us-east-1', 'us-west-1', 'us-west-2',
  'eu-west-1', 'eu-west-2', 'eu-central-1',
  'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2',
  'ap-south-1', 'sa-east-1', 'ca-central-1'
];

async function checkRegion(region) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  const client = new Client({
    connectionString: `postgresql://postgres.mmdfxpdxzqbagusfknuc:YOUR_DB_PASSWORD@${host}:6543/postgres`,
    connectionTimeoutMillis: 3000
  });

  try {
    await client.connect();
    console.log(`Success! Region is ${region}`);
    
    // Create the table
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
    console.log("Table created!");
    
    await client.end();
    return true;
  } catch (err) {
    await client.end().catch(() => {});
    return false;
  }
}

async function run() {
  for (const region of regions) {
    const success = await checkRegion(region);
    if (success) return;
  }
  console.log("Could not find a valid region pooler.");
}

run();
