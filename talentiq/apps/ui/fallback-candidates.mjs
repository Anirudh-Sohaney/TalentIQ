import { readFile } from 'node:fs/promises';

// The same 15 demo check-ins used to seed the candidate table.
const demoCheckIns = [
  ['ava-patel', 'Ava Patel', '9:03 AM', 'University of Arkansas', 'Computer Science'],
  ['marcus-lee', 'Marcus Lee', '9:11 AM', 'Oklahoma State University', 'Supply Chain Management'],
  ['sofia-ramirez', 'Sofia Ramirez', '9:18 AM', 'University of Texas at Dallas', 'Business Analytics'],
  ['elijah-brooks', 'Elijah Brooks', '9:26 AM', 'University of Missouri', 'Industrial Engineering'],
  ['nora-kim', 'Nora Kim', '9:34 AM', 'Kansas State University', 'Information Systems'],
  ['daniel-wright', 'Daniel Wright', '9:42 AM', 'University of Arkansas', 'Finance'],
  ['maya-johnson', 'Maya Johnson', '9:55 AM', 'Texas Christian University', 'Marketing'],
  ['owen-nguyen', 'Owen Nguyen', '10:07 AM', 'University of Oklahoma', 'Computer Engineering'],
  ['isabella-martin', 'Isabella Martin', '10:16 AM', 'University of Kansas', 'Human Resources'],
  ['theo-adams', 'Theo Adams', '10:23 AM', 'Arkansas State University', 'Logistics'],
  ['priya-shah', 'Priya Shah', '10:35 AM', 'University of North Texas', 'Data Science'],
  ['caleb-turner', 'Caleb Turner', '10:47 AM', 'University of Tulsa', 'Mechanical Engineering'],
  ['zoe-wilson', 'Zoe Wilson', '11:02 AM', 'Missouri State University', 'Communications'],
  ['noah-garcia', 'Noah Garcia', '11:14 AM', 'University of Central Arkansas', 'Accounting'],
  ['olivia-brown', 'Olivia Brown', '11:28 AM', 'University of Arkansas at Little Rock', 'Management'],
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
