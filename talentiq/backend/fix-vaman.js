const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''; // Let's pass it via env
const SUPABASE_URL = 'https://mmdfxpdxzqbagusfknuc.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; 

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function askOpenRouter(systemPrompt, userText, apiKey, isJson = false) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      models: ["qwen/qwen3.8-27b:free", "nvidia/nemotron-3.5-lightning:free"],
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText }
      ],
      temperature: 0.2
    })
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  let text = data.choices[0].message.content.trim();
  if (isJson) {
    if (text.startsWith("\`\`\`json")) text = text.replace(/^\`\`\`json\n?/, "");
    if (text.endsWith("\`\`\`")) text = text.replace(/\n?\`\`\`$/, "");
    return JSON.parse(text);
  }
  return text;
}

async function run() {
  const { data: vamanRows } = await supabase.from('candidates').select('*').ilike('name', '%Vaman%');
  const vaman = vamanRows[0];
  if (!vaman) return console.log('Vaman not found');

  let rawText = vaman.resume_content;
  if (rawText.length > 15000) rawText = rawText.substring(0, 15000) + "\n...[TRUNCATED FOR LENGTH]";

  console.log("Formatting full resume...");
  const fullMarkdown = await askOpenRouter(`You are a strict formatting assistant. Convert the provided raw, messy PDF text into a clean, beautifully formatted Markdown resume. Keep ALL original information, just fix the formatting using headers (##), bold text, and bullet points. Return ONLY the markdown.`, rawText, OPENROUTER_API_KEY, false);
  
  console.log("Formatting short resume...");
  const shortMarkdown = await askOpenRouter(`You are a strict resume formatting assistant. Rewrite the provided raw resume to be extremely concise and punchy. Keep the exact same sections and headers. Rewrite every single bullet point AND paragraph to be as short as possible. Bullet points must be max 6-10 words. Paragraphs condensed to 1-2 short sentences. Strip out the fluff. Return ONLY the markdown.`, rawText, OPENROUTER_API_KEY, false);

  console.log("Updating Vaman...");
  await supabase.from('candidates').update({
    resume_content: fullMarkdown,
    short_resume_content: shortMarkdown
  }).eq('id', vaman.id);
  
  console.log("Done!");
}
run();
