const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://mmdfxpdxzqbagusfknuc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tZGZ4cGR4enFiYWd1c2ZrbnVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwMDc0NTAsImV4cCI6MjEwNTU4MzQ1MH0.fYL9bXsM4u9ZwfDmyZzck-4xxJ8EWxKlC1FXLAEoVXA';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.from('candidates').select('id').limit(1);
  console.log("SELECT:", error ? error.message : "Success");
  
  const { error: insertError } = await supabase.from('candidates').upsert({
    id: 'test-1',
    name: 'Test',
    initials: 'TT',
    checkin_time: '12:00 PM',
    university: 'Test U',
    major: 'Test Major',
    resume_content: 'Test content'
  });
  console.log("UPSERT:", insertError ? insertError.message : "Success");
  
  // Clean up
  await supabase.from('candidates').delete().eq('id', 'test-1');
}
test();
