import { readFile } from 'node:fs/promises';

// The same 15 demo check-ins used to seed the candidate table.
const demoCheckIns = [
  ['ava-patel', 'Ava Patel', '9:03 AM', 'University of Arkansas', 'Computer Science'],
  ['marcus-lee', 'Marcus Lee', '9:11 AM', 'Oklahoma State University', 'Supply Chain Management'],
  ['sofia-ramirez', 'Sofia Ramirez', '9:18 AM', 'University of Texas at Dallas', 'Business Analytics'],
  ['elijah-brooks', 'Elijah Brooks', '9:26 AM', 'University of Missouri', 'Industrial Engineering'],
  ['nora-kim', 'Nora Kim', '9:34 AM', 'Kansas State University', 'Information Systems'],
];

export async function loadFallbackCandidates() {
  return Promise.all(demoCheckIns.map(async ([id, name, checkin_time, university, major]) => {
    const resumePath = new URL(`../backend/resumes/${id}.md`, import.meta.url);
    const resume_content = await readFile(resumePath, 'utf8').catch(() =>
      `# ${name}\n\n## EDUCATION\n${university} · ${major}`);

    return {
      id,
      name,
      initials: name.split(' ').map((part) => part[0]).join(''),
      checkin_time,
      university,
      major,
      resume_content,
      short_resume_content: null,
      follow_up_questions: null,
    };
  }));
}
