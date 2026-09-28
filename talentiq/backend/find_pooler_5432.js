const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const regions = [
  'us-east-1', 'us-west-1', 'us-west-2', 'us-east-2',
  'eu-west-1', 'eu-west-2', 'eu-central-1',
  'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2',
  'ap-south-1', 'sa-east-1', 'ca-central-1'
];

const checkRegion = (region) => {
  return new Promise((resolve) => {
    const host = `aws-0-${region}.pooler.supabase.com`;
    const client = new Client({
      connectionString: `postgresql://postgres.mmdfxpdxzqbagusfknuc:YOUR_DB_PASSWORD@${host}:5432/postgres`,
      connectionTimeoutMillis: 5000
    });

    client.connect()
      .then(async () => {
        console.log(`Success! Connected to region: ${region} on port 5432`);
        resolve(client);
      })
      .catch((err) => {
        resolve(null);
      });
  });
};

async function run() {
  console.log("Scanning regions concurrently on port 5432...");
  const results = await Promise.all(regions.map(checkRegion));
  const client = results.find(r => r !== null);
  
  if (!client) {
    console.log("Could not find the correct region or could not connect on port 5432.");
    process.exit(1);
  }
  
  try {
    // Generate the SQL to update the resumes
    const checkIns = [
      'ava-patel', 'marcus-lee', 'sofia-ramirez', 'elijah-brooks', 'nora-kim',
      'daniel-wright', 'maya-johnson', 'owen-nguyen', 'isabella-martin', 'theo-adams',
      'priya-shah', 'caleb-turner', 'zoe-wilson', 'noah-garcia', 'olivia-brown'
    ];
    
    // We update each row with the new resume content
    for (const id of checkIns) {
      const resumePath = path.join(__dirname, 'resumes', `${id}.md`);
      const resumeContent = fs.readFileSync(resumePath, 'utf8');
      
      const query = `
        UPDATE candidates
        SET resume_content = $1
        WHERE id = $2;
      `;
      await client.query(query, [resumeContent, id]);
      console.log(`Updated ${id}`);
    }
    
    console.log("All resumes updated in Supabase successfully via pooler!");
  } catch (err) {
    console.error("Error updating data:", err.message);
  } finally {
    await client.end();
  }
}

run();
