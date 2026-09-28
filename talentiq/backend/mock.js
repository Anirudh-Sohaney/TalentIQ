const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://mmdfxpdxzqbagusfknuc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tZGZ4cGR4enFiYWd1c2ZrbnVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwMDc0NTAsImV4cCI6MjEwNTU4MzQ1MH0.fYL9bXsM4u9ZwfDmyZzck-4xxJ8EWxKlC1FXLAEoVXA'; 
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
async function run() {
  const fullMarkdown = `# International Rules (Mock)

## Guidelines for Science and Engineering Fairs
- **Year**: 2025-2026
- **Organization**: societyforscience.org/ISEF

### Approval Form (1B)
A completed form is required for each student, including all team members.

- Required for projects that need prior SRC/IRB approval.
- BEFORE experimentation (humans, vertebrates or potentially hazardous biological agents).
- The SRC/IRB has carefully studied this project’s Research Plan/Project Summary.`;

  const shortMarkdown = `## Science Fair Rules
- Strict guidelines for 2025.
- Requires Approval Form 1B.
- Focuses on ethics and safety.`;

  const { error } = await supabase.from('candidates').insert({
    id: "44444444-4444-4444-4444-444444444444",
    name: "Science Fair Document",
    initials: "SF",
    checkin_time: "5:00 PM",
    university: "Unknown",
    major: "Science",
    resume_content: fullMarkdown,
    short_resume_content: shortMarkdown,
    follow_up_questions: "- What is Form 1B used for?\n- Why is prior SRC approval needed?"
  });
  if (error) console.error(error);
  else console.log("Added mock candidate!");
}
run();
