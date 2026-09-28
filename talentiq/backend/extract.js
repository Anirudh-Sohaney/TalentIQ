const { createClient } = require('@supabase/supabase-js');
const pdf = require('pdf-parse');
const SUPABASE_URL = 'https://mmdfxpdxzqbagusfknuc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tZGZ4cGR4enFiYWd1c2ZrbnVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwMDc0NTAsImV4cCI6MjEwNTU4MzQ1MH0.fYL9bXsM4u9ZwfDmyZzck-4xxJ8EWxKlC1FXLAEoVXA'; 
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
async function run() {
  const { data: fileData } = await supabase.storage.from("resumes").download('1790179553980-ctjqn3l70pi.pdf');
  const buffer = Buffer.from(await fileData.arrayBuffer());
  const parsed = await pdf(buffer);
  console.log(parsed.text.substring(0, 500));
}
run();
