import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SHORTEN_PROMPT = `You are a strict resume formatting assistant. Your task is to rewrite the provided Markdown resume to be extremely concise and punchy.
You MUST keep the exact same sections, layout, and headers.
You MUST rewrite every single bullet point AND every paragraph to be as short as possible.
- Bullet points should be a maximum of 6-10 words.
- Paragraphs (like summaries or descriptions) should be condensed into 1-2 short sentences.
Do not change the underlying meaning, just strip out the fluff to make it faster to read.
Return ONLY the rewritten Markdown. Do not include any conversational text.`;

const QUESTIONS_PROMPT = `You are an expert technical recruiter preparing for an interview.
Based on the provided candidate resume, generate 3 to 4 insightful, highly specific follow-up questions.
Focus on diving deeper into their most complex projects, technical choices, or quantifiable impacts.
Format your output as a Markdown unordered list (using '- ' for each item).
Return ONLY the questions. Do not include any conversational text.`;

async function callOpenRouter(prompt, content, apiKey) {
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
        { role: "system", content: prompt },
        { role: "user", content: content }
      ],
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter Error: ${errText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

serve(async (req) => {
  try {
    const payload = await req.json();
    
    // We only care about INSERTs
    if (payload.type !== 'INSERT' || !payload.record) {
      return new Response("Not an insert", { status: 200 });
    }

    const { id, resume_content } = payload.record;

    if (!resume_content) {
      return new Response("No resume content", { status: 200 });
    }

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("Missing OPENROUTER_API_KEY");
    }

    // Run both AI tasks concurrently for speed
    const [shortened, questions] = await Promise.all([
      callOpenRouter(SHORTEN_PROMPT, resume_content, OPENROUTER_API_KEY),
      callOpenRouter(QUESTIONS_PROMPT, resume_content, OPENROUTER_API_KEY)
    ]);

    // Initialize Supabase client with Service Role Key to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { error } = await supabase
      .from("candidates")
      .update({ 
        short_resume_content: shortened,
        follow_up_questions: questions
      })
      .eq("id", id);

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ success: true, id }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400
    });
  }
});
