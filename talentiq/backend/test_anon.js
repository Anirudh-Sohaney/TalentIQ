const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mmdfxpdxzqbagusfknuc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tZGZ4cGR4enFiYWd1c2ZrbnVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwMDc0NTAsImV4cCI6MjEwNTU4MzQ1MH0.fYL9bXsM4u9ZwfDmyZzck-4xxJ8EWxKlC1FXLAEoVXA';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.from('candidates').select('*').limit(1);
  console.log('Anon select error:', error);
  
  const { error: insertError } = await supabase.from('candidates').insert({ id: 'test' });
  console.log('Anon insert error:', insertError);
}
test();
