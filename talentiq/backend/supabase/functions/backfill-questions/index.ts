import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const QUESTIONS_PROMPT = `You are an expert technical recruiter preparing for an interview.
Based on the provided candidate resume, generate 3 to 4 insightful, highly specific follow-up questions.
Focus on diving deeper into their most complex projects, technical choices, or quantifiable impacts.
Format your output as a Markdown unordered list (using '- ' for each item).
Return ONLY the questions. Do not include any conversational text.`;

async function generateQuestions(content, apiKey) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-v4.1-flash",
      messages: [
        { role: "system", content: QUESTIONS_PROMPT },
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
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("Missing OPENROUTER_KEY");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch 1 candidate where follow_up_questions is null
    const { data: candidates, error: fetchError } = await supabase
      .from("candidates")
      .select("id, name, resume_content")
      .is("follow_up_questions", null)
      .limit(1);

    if (fetchError) throw fetchError;
    if (!candidates || candidates.length === 0) {
      return new Response(JSON.stringify({ message: "No candidates to backfill", count: 0 }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    const candidate = candidates[0];
    try {
      const questions = await generateQuestions(candidate.resume_content, OPENROUTER_API_KEY);
      
      await supabase
        .from("candidates")
        .update({ follow_up_questions: questions })
        .eq("id", candidate.id);
        
      return new Response(JSON.stringify({ message: "Backfill complete", count: 1, id: candidate.id }), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (err) {
      console.error(`Failed for ${candidate.id}:`, err);
      return new Response(JSON.stringify({ error: err.message }), {
        headers: { "Content-Type": "application/json" },
        status: 500
      });
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400
    });
  }
});
