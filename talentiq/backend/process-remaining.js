const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const pdf = require("pdf-parse");

const SUPABASE_URL = 'https://mmdfxpdxzqbagusfknuc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tZGZ4cGR4enFiYWd1c2ZrbnVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwMDc0NTAsImV4cCI6MjEwNTU4MzQ1MH0.fYL9bXsM4u9ZwfDmyZzck-4xxJ8EWxKlC1FXLAEoVXA'; 

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  console.log("Downloading PDF...");
  const { data: fileData, error: downloadError } = await supabase.storage.from("resumes").download('1790179553980-ctjqn3l70pi.pdf');
  if (downloadError) return console.error(downloadError);
  
  console.log("Parsing PDF...");
  const buffer = Buffer.from(await fileData.arrayBuffer());
  const parsed = await pdf(buffer);
  let rawText = parsed.text;
  
  if (rawText.length > 3000) rawText = rawText.substring(0, 3000) + "\n...[TRUNCATED]";

  console.log("Extracting Metadata (JSON)...");
  const jsonMetadata = await askProxy(`You are an expert recruiter. Extract from this raw resume: 1) "university" (string), 2) "major" (string), 3) "follow_up_questions" (A Markdown unordered list of 3-4 insightful, highly specific technical interview questions). Format STRICTLY as JSON. Return ONLY the raw JSON object.`, rawText, true);

  console.log("Formatting Short Resume...");
  const shortMarkdown = await askProxy(`You are a strict resume formatting assistant. Rewrite the provided raw resume to be extremely concise and punchy. Keep the exact same sections and headers. Rewrite every single bullet point AND paragraph to be as short as possible. Bullet points must be max 6-10 words. Paragraphs condensed to 1-2 short sentences. Strip out the fluff. Return ONLY the markdown.`, rawText, false);

  console.log("Formatting Full Resume...");
  const fullMarkdown = await askProxy(`You are a strict formatting assistant. Convert the provided raw, messy PDF text into a clean, beautifully formatted Markdown resume. Keep ALL original information, just fix the formatting using headers (##), bold text, and bullet points. Return ONLY the markdown.`, rawText, false);

  console.log("Inserting Candidate...");
  const { error } = await supabase.from('candidates').insert({
    id: "33333333-3333-3333-3333-333333333333",
    name: "Alex Johnson",
    initials: "AJ",
    checkin_time: "5:00 PM",
    university: jsonMetadata.university,
    major: jsonMetadata.major,
    resume_content: fullMarkdown,
    short_resume_content: shortMarkdown,
    follow_up_questions: jsonMetadata.follow_up_questions
  });

  if (error) console.error(error);
  else console.log("Success! Added Alex Johnson to dashboard.");
}
run();
