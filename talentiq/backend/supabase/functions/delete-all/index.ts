import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const idsToKeep = ['ava-patel', 'marcus-lee', 'sofia-ramirez', 'elijah-brooks', 'nora-kim'];
    
    // First fetch all candidates to find which ones to delete
    const { data: cands } = await supabase.from('candidates').select('id');
    if (!cands) return new Response("No candidates found");
    
    const idsToDelete = cands.map(c => c.id).filter(id => !idsToKeep.includes(id));
    
    if (idsToDelete.length > 0) {
      await supabase.from('candidates').delete().in('id', idsToDelete);
    }
    
    return new Response(JSON.stringify({ deleted: idsToDelete }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
});
