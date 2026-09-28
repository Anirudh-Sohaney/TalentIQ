const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://mmdfxpdxzqbagusfknuc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tZGZ4cGR4enFiYWd1c2ZrbnVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwMDc0NTAsImV4cCI6MjEwNTU4MzQ1MH0.fYL9bXsM4u9ZwfDmyZzck-4xxJ8EWxKlC1FXLAEoVXA';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const checkIns = [
  'ava-patel', 'marcus-lee', 'sofia-ramirez', 'elijah-brooks', 'nora-kim',
  'daniel-wright', 'maya-johnson', 'owen-nguyen', 'isabella-martin', 'theo-adams',
  'priya-shah', 'caleb-turner', 'zoe-wilson', 'noah-garcia', 'olivia-brown'
];

async function updateAll() {
  console.log("Updating resumes in Supabase...");
  let successCount = 0;
  
  // Need to fix the major for ava-patel back to what it was
  await supabase.from('candidates').update({ major: 'Computer Science' }).eq('id', 'ava-patel');

  for (const id of checkIns) {
    const resumePath = path.join(__dirname, 'resumes', `${id}.md`);
    const resumeContent = fs.readFileSync(resumePath, 'utf8');
    
    const { error } = await supabase
      .from('candidates')
      .update({ resume_content: resumeContent })
      .eq('id', id);
      
    if (error) {
      console.error(`Error updating ${id}:`, error.message);
    } else {
      successCount++;
      console.log(`Updated ${id}`);
    }
  }
  console.log(`Complete! ${successCount}/${checkIns.length} updated successfully.`);
}

updateAll();
