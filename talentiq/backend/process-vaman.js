const { createClient } = require('@supabase/supabase-js');
const pdf = require('pdf-parse');

const SUPABASE_URL = 'https://mmdfxpdxzqbagusfknuc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tZGZ4cGR4enFiYWd1c2ZrbnVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwMDc0NTAsImV4cCI6MjEwNTU4MzQ1MH0.fYL9bXsM4u9ZwfDmyZzck-4xxJ8EWxKlC1FXLAEoVXA'; 

async function askProxy(systemPrompt, userText, isJson = false) {
  const response = await fetch("https://mmdfxpdxzqbagusfknuc.supabase.co/functions/v1/ai-proxy", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ systemPrompt, userText, isJson })
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

async function run() {
  console.log("Parsing PDF...");
  const response = await fetch("https://mmdfxpdxzqbagusfknuc.supabase.co/storage/v1/object/public/resumes/b9c69e0d-e9c6-4a49-b239-92a8db073efd/resume.pdf");
  const buffer = Buffer.from(await response.arrayBuffer());
  const parsed = await pdf(buffer);
  let rawText = parsed.text;

  console.log("Extracting Metadata (JSON)...");
  const jsonMetadata = await askProxy(`You are an expert recruiter. Extract from this raw resume: 1) "university" (string), 2) "major" (string), 3) "follow_up_questions" (A Markdown unordered list of 3-4 insightful, highly specific technical interview questions). Format STRICTLY as JSON. Return ONLY the raw JSON object.`, rawText, true);

  console.log("Formatting Short Resume...");
  const shortMarkdown = await askProxy(`You are a strict resume formatting assistant. Rewrite the provided raw resume to be extremely concise and punchy. Keep the exact same sections and headers. Rewrite every single bullet point AND paragraph to be as short as possible. Bullet points must be max 6-10 words. Paragraphs condensed to 1-2 short sentences. Strip out the fluff. Return ONLY the markdown.`, rawText, false);

  console.log("Formatting Full Resume...");
  const fullMarkdown = await askProxy(`You are a strict formatting assistant. Convert the provided raw, messy PDF text into a clean, beautifully formatted Markdown resume. Keep ALL original information, just fix the formatting using headers (##), bold text, and bullet points. Return ONLY the markdown.`, rawText, false);

  console.log("Inserting Candidate...");
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  // Can't insert with anon key due to RLS, just print the SQL
  console.log(`
INSERT INTO candidates (id, name, initials, checkin_time, university, major, resume_content, short_resume_content, follow_up_questions, email) 
VALUES (
  'b9c69e0d-e9c6-4a49-b239-92a8db073efd', 
  'Vaman Agarwal', 
  'VA', 
  '2:25 PM', 
  '${jsonMetadata.university}', 
  '${jsonMetadata.major}', 
  $$${fullMarkdown}$$, 
  $$${shortMarkdown}$$, 
  $$${jsonMetadata.follow_up_questions}$$,
  'agarwalvaman88@gmail.com'
);
  `);
}
run().catch(console.error);
