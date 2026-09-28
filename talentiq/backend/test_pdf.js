const fs = require('fs');
const pdf = require('pdf-parse');
async function run() {
  const response = await fetch("https://mmdfxpdxzqbagusfknuc.supabase.co/storage/v1/object/public/resumes/b9c69e0d-e9c6-4a49-b239-92a8db073efd/resume.pdf");
  const buffer = Buffer.from(await response.arrayBuffer());
  const parsed = await pdf(buffer);
  console.log("Extracted text length:", parsed.text.length);
  console.log(parsed.text.substring(0, 200));
}
run();
