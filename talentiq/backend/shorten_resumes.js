const { Client } = require('pg');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.error("Please set the OPENROUTER_API_KEY environment variable.");
  console.error("Example: export OPENROUTER_API_KEY='your_key_here' && node shorten_resumes.js");
  process.exit(1);
}

const client = new Client({
  connectionString: 'postgresql://postgres:YOUR_DB_PASSWORD@db.mmdfxpdxzqbagusfknuc.supabase.co:5432/postgres'
});

const SYSTEM_PROMPT = `You are a strict resume formatting assistant. Your task is to rewrite the provided Markdown resume to be extremely concise and punchy.
You MUST keep the exact same sections, layout, and headers.
You MUST rewrite every single bullet point AND every paragraph to be as short as possible.
- Bullet points should be a maximum of 6-10 words.
- Paragraphs (like summaries or descriptions) should be condensed into 1-2 short sentences.
Do not change the underlying meaning, just strip out the fluff to make it faster to read.
Return ONLY the rewritten Markdown. Do not include any conversational text.`;

async function shortenResume(resumeContent) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      models: [
        "qwen/qwen3.8-27b:free",
        "nvidia/nemotron-3.5-lightning:free",
        "liquid/lfm-2.5-2.6b:free"
      ],
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: resumeContent }
      ],
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API Error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function run() {
  try {
    await client.connect();
    console.log("Connected to database.");

    // Fetch all candidates to re-process them with the updated prompt
    const result = await client.query('SELECT id, name, resume_content FROM candidates');
    
    console.log(`Found ${result.rows.length} candidates to process.\n`);

    const batchSize = 5;
    for (let i = 0; i < result.rows.length; i += batchSize) {
      const batch = result.rows.slice(i, i + batchSize);
      console.log(`Processing batch ${i / batchSize + 1} (${batch.length} resumes concurrently)...`);
      
      await Promise.all(batch.map(async (row) => {
        try {
          const shortened = await shortenResume(row.resume_content);
          await client.query(
            'UPDATE candidates SET short_resume_content = $1 WHERE id = $2',
            [shortened, row.id]
          );
          console.log(`✅ Successfully updated ${row.name}`);
        } catch (err) {
          console.error(`❌ Failed to process ${row.name}:`, err.message);
        }
      }));
    }

    console.log("\nFinished processing all resumes!");

  } catch (err) {
    console.error("Database connection error:", err);
  } finally {
    await client.end();
  }
}

run();
