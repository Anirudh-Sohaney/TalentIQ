const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://mmdfxpdxzqbagusfknuc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tZGZ4cGR4enFiYWd1c2ZrbnVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwMDc0NTAsImV4cCI6MjEwNTU4MzQ1MH0.fYL9bXsM4u9ZwfDmyZzck-4xxJ8EWxKlC1FXLAEoVXA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const checkIns = [
  { id: 'ava-patel', name: 'Ava Patel', initials: 'AP', time: '9:03 AM', university: 'University of Arkansas', major: 'Computer Science' },
  { id: 'marcus-lee', name: 'Marcus Lee', initials: 'ML', time: '9:11 AM', university: 'Oklahoma State University', major: 'Supply Chain Management' },
  { id: 'sofia-ramirez', name: 'Sofia Ramirez', initials: 'SR', time: '9:18 AM', university: 'University of Texas at Dallas', major: 'Business Analytics' },
  { id: 'elijah-brooks', name: 'Elijah Brooks', initials: 'EB', time: '9:26 AM', university: 'University of Missouri', major: 'Industrial Engineering' },
  { id: 'nora-kim', name: 'Nora Kim', initials: 'NK', time: '9:34 AM', university: 'Kansas State University', major: 'Information Systems' },
  { id: 'daniel-wright', name: 'Daniel Wright', initials: 'DW', time: '9:42 AM', university: 'University of Arkansas', major: 'Finance' },
  { id: 'maya-johnson', name: 'Maya Johnson', initials: 'MJ', time: '9:55 AM', university: 'Texas Christian University', major: 'Marketing' },
  { id: 'owen-nguyen', name: 'Owen Nguyen', initials: 'ON', time: '10:07 AM', university: 'University of Oklahoma', major: 'Computer Engineering' },
  { id: 'isabella-martin', name: 'Isabella Martin', initials: 'IM', time: '10:16 AM', university: 'University of Kansas', major: 'Human Resources' },
  { id: 'theo-adams', name: 'Theo Adams', initials: 'TA', time: '10:23 AM', university: 'Arkansas State University', major: 'Logistics' },
  { id: 'priya-shah', name: 'Priya Shah', initials: 'PS', time: '10:35 AM', university: 'University of North Texas', major: 'Data Science' },
  { id: 'caleb-turner', name: 'Caleb Turner', initials: 'CT', time: '10:47 AM', university: 'University of Tulsa', major: 'Mechanical Engineering' },
  { id: 'zoe-wilson', name: 'Zoe Wilson', initials: 'ZW', time: '11:02 AM', university: 'Missouri State University', major: 'Communications' },
  { id: 'noah-garcia', name: 'Noah Garcia', initials: 'NG', time: '11:14 AM', university: 'University of Central Arkansas', major: 'Accounting' },
  { id: 'olivia-brown', name: 'Olivia Brown', initials: 'OB', time: '11:28 AM', university: 'University of Arkansas at Little Rock', major: 'Management' }
];

async function seed() {
  let successCount = 0;
  for (const person of checkIns) {
    const resumePath = path.join(__dirname, 'resumes', `${person.id}.md`);
    const resumeContent = fs.existsSync(resumePath) ? fs.readFileSync(resumePath, 'utf8') : '';
    
    const { data, error } = await supabase
      .from('candidates')
      .upsert({
        id: person.id,
        name: person.name,
        initials: person.initials,
        checkin_time: person.time,
        university: person.university,
        major: person.major,
        resume_content: resumeContent
      });
      
    if (error) {
      console.error(`Error inserting ${person.id}:`, error.message);
    } else {
      successCount++;
    }
  }
  if (successCount === checkIns.length) {
    console.log('Seeding complete. All rows inserted successfully.');
  } else {
    console.log(`Seeding finished with some errors. Inserted ${successCount}/${checkIns.length}`);
  }
}

seed();
