const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://mmdfxpdxzqbagusfknuc.supabase.co';
const SUPABASE_SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tZGZ4cGR4enFiYWd1c2ZrbnVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDAwNzQ1MCwiZXhwIjoyMTA1NTgzNDUwfQ.64r8c8P8F7quUAHrtmgrvOaawUuZncOZR_w-gfQm1lE';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

async function run() {
  const idsToKeep = ['ava-patel', 'marcus-lee', 'sofia-ramirez', 'elijah-brooks', 'nora-kim'];
  const { data: cands } = await supabase.from('candidates').select('id');
  const idsToDelete = cands.map(c => c.id).filter(id => !idsToKeep.includes(id));
  console.log("Deleting:", idsToDelete);
  
  if (idsToDelete.length > 0) {
    const { data, error } = await supabase.from('candidates').delete().in('id', idsToDelete);
    console.log("Delete error candidates:", error);
  }

  const { data: resp } = await supabase.from('responses').select('record_id');
  if (resp) {
      const respToDelete = resp.map(r => r.record_id).filter(id => !idsToKeep.includes(id));
      if (respToDelete.length > 0) {
        const { error: err2 } = await supabase.from('responses').delete().in('record_id', respToDelete);
        console.log("Delete error responses:", err2);
      }
  }
}
run();
