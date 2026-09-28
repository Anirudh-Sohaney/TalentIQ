const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const regions = [
  'us-east-1', 'us-west-1', 'us-west-2', 'us-east-2',
  'eu-west-1', 'eu-west-2', 'eu-central-1',
  'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2',
  'ap-south-1', 'sa-east-1', 'ca-central-1'
];
const ports = [5432, 6543];
const passwords = ['YOUR_PASSWORD'];

let successClient = null;

const checkCombo = async (region, port, password) => {
  const host = `aws-0-${region}.pooler.supabase.com`;
  const client = new Client({
    connectionString: `postgresql://postgres.mmdfxpdxzqbagusfknuc:${password}@${host}:${port}/postgres`,
    connectionTimeoutMillis: 5000
  });

  try {
    await client.connect();
    console.log(`Success! region: ${region}, port: ${port}, pass: ${password.substring(0, 5)}...`);
    successClient = client;
    return client;
  } catch (err) {
    return null;
  }
};

async function run() {
  console.log("Scanning combinations...");
  const tasks = [];
  for (const region of regions) {
    for (const port of ports) {
      for (const pass of passwords) {
        tasks.push(checkCombo(region, port, pass));
      }
    }
  }
  
  await Promise.all(tasks);
  
  if (!successClient) {
    console.log("Could not find the correct region/port/pass.");
    process.exit(1);
  }
  
  try {
    const checkIns = [
      'ava-patel', 'marcus-lee', 'sofia-ramirez', 'elijah-brooks', 'nora-kim',
      'daniel-wright', 'maya-johnson', 'owen-nguyen', 'isabella-martin', 'theo-adams',
      'priya-shah', 'caleb-turner', 'zoe-wilson', 'noah-garcia', 'olivia-brown'
    ];
    
    for (const id of checkIns) {
      const resumePath = path.join(__dirname, 'resumes', `${id}.md`);
      const resumeContent = fs.readFileSync(resumePath, 'utf8');
      
      const query = `
        UPDATE candidates
        SET resume_content = $1
        WHERE id = $2;
      `;
      await successClient.query(query, [resumeContent, id]);
      console.log(`Updated ${id}`);
    }
    
    console.log("All resumes updated in Supabase successfully!");
  } catch (err) {
    console.error("Error updating data:", err.message);
  } finally {
    await successClient.end();
  }
}

run();
