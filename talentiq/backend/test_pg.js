const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgres://postgres.mmdfxpdxzqbagusfknuc:V97Ju2SbD70rJscQ@aws-0-us-east-1.pooler.supabase.com:5432/postgres'
});
async function run() {
  try {
    await client.connect();
    const res = await client.query('SELECT count(*) FROM candidates');
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
