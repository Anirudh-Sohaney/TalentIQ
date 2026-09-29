const ids = [
  {"id":"f1f8a958-1f8b-420d-9fd4-37287220f294","first_name":"Vaman","last_name":"Agarwal","university":"Massachusetts Institute of Technology","major":"Computer Science","resume_url":"https://mmdfxpdxzqbagusfknuc.supabase.co/storage/v1/object/public/resumes/f1f8a958-1f8b-420d-9fd4-37287220f294/resume.pdf", "email": "vaman@mit.edu"},
  {"id":"dc40174b-b02d-40d6-bb87-d523562b62c4","first_name":"Vaman","last_name":"Agarwal","university":"Massachusetts Institute of Technology","major":"Computer Engineering","resume_url":"https://mmdfxpdxzqbagusfknuc.supabase.co/storage/v1/object/public/resumes/dc40174b-b02d-40d6-bb87-d523562b62c4/resume.pdf", "email": "vaman@mit.edu"},
  {"id":"387a9425-07c9-464d-a9db-ff3ea9a89c71","first_name":"Vaman","last_name":"Agarwal","university":"Massachusetts Institute of Technology","major":"Computer Science","resume_url":"https://mmdfxpdxzqbagusfknuc.supabase.co/storage/v1/object/public/resumes/387a9425-07c9-464d-a9db-ff3ea9a89c71/resume.pdf", "email": "vaman@mit.edu"},
  {"id":"6e49915c-0e3d-4b1e-a5c6-96bbe171da1e","first_name":"Vaman","last_name":"Agarwal","university":"Massachusetts Institute of Technology","major":"Computer Science","resume_url":"https://mmdfxpdxzqbagusfknuc.supabase.co/storage/v1/object/public/resumes/6e49915c-0e3d-4b1e-a5c6-96bbe171da1e/resume.pdf", "email": "vaman@mit.edu"}
];

const PDFCO_KEY = process.env.PDFCO_KEY;
const OPENROUTER_KEY = process.env.OPENROUTER_KEY;

if (!PDFCO_KEY || !OPENROUTER_KEY) {
  throw new Error("Set PDFCO_KEY and OPENROUTER_KEY environment variables before running this script.");
}

async function askOpenRouter(systemPrompt, userText, isJson = false) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      models: ["qwen/qwen3.8-27b:free", "nvidia/nemotron-3.5-lightning:free", "liquid/lfm-2.5-2.6b:free"],
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userText }],
      temperature: 0.2
    })
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  let text = data.choices[0].message.content.trim();
  if (isJson) {
    if (text.startsWith("```json")) text = text.replace(/^```json\n?/, "");
    if (text.endsWith("```")) text = text.replace(/\n?```$/, "");
    return JSON.parse(text);
  }
  return text;
}

const fs = require('fs');

async function run() {
  let sql = "";
  for (const record of ids) {
    console.log("Processing", record.id);
    const pdfResponse = await fetch("https://api.pdf.co/v1/pdf/convert/to/text", {
      method: "POST",
      headers: { "x-api-key": PDFCO_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ url: record.resume_url, inline: true })
    });
    const pdfData = await pdfResponse.json();
    let rawText = pdfData.body;
    if (rawText.length > 15000) rawText = rawText.substring(0, 15000) + "\n...[TRUNCATED]";

    const FULL_RESUME_PROMPT = `You are a strict formatting assistant. Convert the provided raw, messy PDF text into a clean, beautifully formatted Markdown resume. Keep ALL original information, just fix the formatting using headers (##), bold text, and bullet points. Return ONLY the markdown.`;
    const SHORT_RESUME_PROMPT = `You are a strict resume formatting assistant. Rewrite the provided raw resume to be extremely concise and punchy. Keep the exact same sections and headers. Rewrite every single bullet point AND paragraph to be as short as possible. Bullet points must be max 6-10 words. Paragraphs condensed to 1-2 short sentences. Strip out the fluff. Return ONLY the markdown.`;
    const JSON_PROMPT = `You are an expert recruiter. Extract from this raw resume: 1) "university" (string), 2) "major" (string), 3) "follow_up_questions" (A Markdown unordered list of 3-4 insightful, highly specific technical interview questions). Format STRICTLY as JSON. Return ONLY the raw JSON object.`;

    const fullMarkdown = await askOpenRouter(FULL_RESUME_PROMPT, rawText, false);
    const shortMarkdown = await askOpenRouter(SHORT_RESUME_PROMPT, rawText, false);
    const jsonMetadata = await askOpenRouter(JSON_PROMPT, rawText, true);

    const initials = (record.first_name.charAt(0) + record.last_name.charAt(0)).toUpperCase();
    const fullName = `${record.first_name} ${record.last_name}`.trim();
    const checkinTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    sql += `
INSERT INTO candidates (id, name, email, initials, checkin_time, university, major, resume_content, short_resume_content, follow_up_questions)
VALUES (
  '${record.id}',
  '${fullName.replace(/'/g, "''")}',
  '${record.email.replace(/'/g, "''")}',
  '${initials.replace(/'/g, "''")}',
  '${checkinTime.replace(/'/g, "''")}',
  '${(record.university || jsonMetadata.university || '').replace(/'/g, "''")}',
  '${(record.major || jsonMetadata.major || '').replace(/'/g, "''")}',
  '${fullMarkdown.replace(/'/g, "''")}',
  '${shortMarkdown.replace(/'/g, "''")}',
  '${(jsonMetadata.follow_up_questions || '').replace(/'/g, "''")}'
) ON CONFLICT (id) DO UPDATE SET
  university = EXCLUDED.university,
  major = EXCLUDED.major;
`;
  }
  fs.writeFileSync("backend/insert_missing.sql", sql);
  console.log("Done! Wrote to backend/insert_missing.sql");
}
run();
