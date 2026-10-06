const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgres://postgres.mmdfxpdxzqbagusfknuc:V97Ju2SbD70rJscQ@aws-0-us-east-1.pooler.supabase.com:6543/postgres'
});

async function run() {
  try {
    await client.connect();
    // Delete all except the first 5 demo checkins
    const idsToKeep = ['ava-patel', 'marcus-lee', 'sofia-ramirez', 'elijah-brooks', 'nora-kim'];
    const placeholders = idsToKeep.map((_, i) => `$${i + 1}`).join(',');
    const res = await client.query(`DELETE FROM candidates WHERE id NOT IN (${placeholders}) RETURNING id`, idsToKeep);
    console.log("Deleted candidates:", res.rowCount);
    
    const res2 = await client.query(`DELETE FROM responses WHERE record_id NOT IN (${placeholders}) RETURNING record_id`, idsToKeep);
    console.log("Deleted responses:", res2.rowCount);
    
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
