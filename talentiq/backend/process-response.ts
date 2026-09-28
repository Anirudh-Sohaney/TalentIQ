import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function askOpenRouter(systemPrompt, userText, apiKey, isJson = false) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      models: [
        "qwen/qwen3.8-27b:free",
        "nvidia/nemotron-3.5-lightning:free",
        "liquid/lfm-2.5-2.6b:free"
      ],
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText }
      ],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter Error: ${await response.text()}`);
  }

  const data = await response.json();
  let text = data.choices[0].message.content.trim();
  
  if (isJson) {
    if (text.startsWith("```json")) text = text.replace(/^```json\n?/, "");
    if (text.endsWith("```")) text = text.replace(/\n?```$/, "");
    return JSON.parse(text);
  }
  return text;
}

serve(async (req) => {
  try {
    const payload = await req.json();
    if (payload.type !== "INSERT" || payload.table !== "responses") return new Response("Ignored", { status: 200 });

    const record = payload.record;
    if (!record || !record.resume_url) return new Response("No resume_url", { status: 200 });

    const OPENROUTER_KEY = Deno.env.get("OPENROUTER_KEY");
    if (!OPENROUTER_KEY) throw new Error("Missing OPENROUTER_KEY");

    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

// PDF Parsing using PDF.co API to prevent memory crashes
    const PDFCO_KEY = "aarushfireblaze@gmail.com_a8ILEF29LfyzSbmounuwSeMmTlvtL6Y5DJrYA3QKYnvT2fWvoHxEvjIGBCQpW9yl";
    if (!PDFCO_KEY) throw new Error("Missing PDFCO_API_KEY");

    let rawText = "";
    
    if (record.resume_url.startsWith("http")) {
      // It's a full public URL, pass it directly to PDF.co
      const pdfResponse = await fetch("https://api.pdf.co/v1/pdf/convert/to/text", {
        method: "POST",
        headers: {
          "x-api-key": PDFCO_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url: record.resume_url, inline: true })
      });
      
      const pdfData = await pdfResponse.json();
      if (pdfData.error) throw new Error(`PDF.co Error: ${pdfData.message}`);
      rawText = pdfData.body;
    } else {
      // It's a relative path. We need to generate a signed URL or public URL for PDF.co
      const { data: publicUrlData } = supabase.storage.from("resumes").getPublicUrl(record.resume_url);
      const publicUrl = publicUrlData.publicUrl;
      
      const pdfResponse = await fetch("https://api.pdf.co/v1/pdf/convert/to/text", {
        method: "POST",
        headers: {
          "x-api-key": PDFCO_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url: publicUrl, inline: true })
      });
      
      const pdfData = await pdfResponse.json();
      if (pdfData.error) throw new Error(`PDF.co Error: ${pdfData.message}`);
      rawText = pdfData.body;
    }

    // Truncate to first 15000 characters to prevent context window overflow or massive processing times
    if (rawText.length > 15000) {
      rawText = rawText.substring(0, 15000) + "\n...[TRUNCATED FOR LENGTH]";
    }

    // 2. Sequential AI Processing to save memory
    const FULL_RESUME_PROMPT = `You are a strict formatting assistant. Convert the provided raw, messy PDF text into a clean, beautifully formatted Markdown resume. Keep ALL original information, just fix the formatting using headers (##), bold text, and bullet points. Return ONLY the markdown.`;
    const SHORT_RESUME_PROMPT = `You are a strict resume formatting assistant. Rewrite the provided raw resume to be extremely concise and punchy. Keep the exact same sections and headers. Rewrite every single bullet point AND paragraph to be as short as possible. Bullet points must be max 6-10 words. Paragraphs condensed to 1-2 short sentences. Strip out the fluff. Return ONLY the markdown.`;
    const JSON_PROMPT = `You are an expert recruiter. Extract from this raw resume: 1) "university" (string), 2) "major" (string), 3) "follow_up_questions" (A Markdown unordered list of 3-4 insightful, highly specific technical interview questions). Format STRICTLY as JSON. Return ONLY the raw JSON object.`;

    const fullMarkdown = await askOpenRouter(FULL_RESUME_PROMPT, rawText, OPENROUTER_KEY, false);
    const shortMarkdown = await askOpenRouter(SHORT_RESUME_PROMPT, rawText, OPENROUTER_KEY, false);
    const jsonMetadata = await askOpenRouter(JSON_PROMPT, rawText, OPENROUTER_KEY, true);

    const firstName = record.first_name || "";
    const lastName = record.last_name || "";
    const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    const fullName = `${firstName} ${lastName}`.trim();
    const checkinTime = new Date(record.created_at || Date.now()).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    // 3. Insert into candidates table
    const { error: insertError } = await supabase.from("candidates").upsert({
      id: record.id,
      name: fullName,
      email: record.email,
      initials: initials,
      checkin_time: checkinTime,
      university: jsonMetadata.university,
      major: jsonMetadata.major,
      resume_content: fullMarkdown,
      short_resume_content: shortMarkdown,
      follow_up_questions: jsonMetadata.follow_up_questions
    });

    if (insertError) throw new Error(`Insert failed: ${insertError.message}`);
    return new Response(JSON.stringify({ success: true, candidate: fullName }), { headers: { "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
});
