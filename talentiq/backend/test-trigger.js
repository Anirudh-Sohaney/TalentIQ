const ids = [
  {"id":"f1f8a958-1f8b-420d-9fd4-37287220f294","first_name":"Vaman","last_name":"Agarwal","university":"Massachusetts Institute of Technology","major":"Computer Science","resume_url":"https://mmdfxpdxzqbagusfknuc.supabase.co/storage/v1/object/public/resumes/f1f8a958-1f8b-420d-9fd4-37287220f294/resume.pdf"},
  {"id":"dc40174b-b02d-40d6-bb87-d523562b62c4","first_name":"Vaman","last_name":"Agarwal","university":"Massachusetts Institute of Technology","major":"Computer Engineering","resume_url":"https://mmdfxpdxzqbagusfknuc.supabase.co/storage/v1/object/public/resumes/dc40174b-b02d-40d6-bb87-d523562b62c4/resume.pdf"},
  {"id":"387a9425-07c9-464d-a9db-ff3ea9a89c71","first_name":"Vaman","last_name":"Agarwal","university":"Massachusetts Institute of Technology","major":"Computer Science","resume_url":"https://mmdfxpdxzqbagusfknuc.supabase.co/storage/v1/object/public/resumes/387a9425-07c9-464d-a9db-ff3ea9a89c71/resume.pdf"},
  {"id":"6e49915c-0e3d-4b1e-a5c6-96bbe171da1e","first_name":"Vaman","last_name":"Agarwal","university":"Massachusetts Institute of Technology","major":"Computer Science","resume_url":"https://mmdfxpdxzqbagusfknuc.supabase.co/storage/v1/object/public/resumes/6e49915c-0e3d-4b1e-a5c6-96bbe171da1e/resume.pdf"}
];

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tZGZ4cGR4enFiYWd1c2ZrbnVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwMDc0NTAsImV4cCI6MjEwNTU4MzQ1MH0.fYL9bXsM4u9ZwfDmyZzck-4xxJ8EWxKlC1FXLAEoVXA'; 

async function run() {
  for (const record of ids) {
    console.log("Triggering for", record.id);
    const payload = {
      type: "INSERT",
      table: "responses",
      record: record
    };
    try {
      const response = await fetch("https://mmdfxpdxzqbagusfknuc.supabase.co/functions/v1/process-response", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = await response.text();
      console.log(data);
    } catch(e) { console.error(e); }
  }
}
run();
