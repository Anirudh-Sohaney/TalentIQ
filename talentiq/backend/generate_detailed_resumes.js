const fs = require('fs');
const path = require('path');

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

checkIns.forEach(person => {
  const content = `# ${person.name}

**Email**: ${person.id}@example.com | **Phone**: (555) 123-4567 | **LinkedIn**: linkedin.com/in/${person.id} | **GitHub**: github.com/${person.id}

---

## PROFESSIONAL SUMMARY
Highly motivated and detail-oriented student pursuing a degree in ${person.major} at ${person.university}. Proven ability to work in team-oriented environments, solve complex problems, and deliver results. Seeking opportunities to leverage academic background and hands-on project experience in a dynamic professional setting.

---

## EDUCATION
**${person.university}**
*Bachelor of Science in ${person.major}*
- Expected Graduation: May 2027
- GPA: 3.8/4.0
- **Relevant Coursework**: Data Structures, Project Management, Advanced Analytics, Business Operations, Leadership Communication.

---

## EXPERIENCE
**Campus Teaching Assistant** | ${person.university} | *Aug 2024 - Present*
- Assisted professors in grading assignments, proctoring exams, and leading weekly study sessions for 40+ students.
- Mentored students in understanding core concepts related to ${person.major}.
- Developed supplementary materials that improved average class test scores by 15%.

**Summer Intern** | InnovateTech Solutions | *May 2024 - Aug 2024*
- Collaborated with a cross-functional team of 8 to design and implement new workflows, increasing departmental efficiency by 10%.
- Conducted comprehensive data analysis to identify bottlenecks in current processes and presented actionable solutions to senior management.
- Utilized industry-standard tools and methodologies relevant to ${person.major}.

---

## PROJECTS
**Capstone Project: Process Optimization**
- Led a team of 4 students to model and optimize a hypothetical business workflow.
- Applied theories learned in ${person.major} coursework to reduce simulated operational costs by 20%.
- Presented findings to a panel of faculty and industry professionals, receiving the "Most Innovative Solution" award.

**Data Dashboard Visualization**
- Built an interactive dashboard using modern frontend frameworks and data visualization libraries.
- Integrated multiple APIs to aggregate real-time data, providing users with actionable insights.

---

## SKILLS
- **Technical**: Data Analysis, Process Modeling, Software Development lifecycle, Database Management (SQL/NoSQL).
- **Tools**: MS Office Suite, Google Workspace, Project Management Tools (Jira, Trello, Asana), Various IDEs.
- **Soft Skills**: Public Speaking, Problem Solving, Cross-functional Collaboration, Time Management, Adaptability.
`;
  fs.writeFileSync(`resumes/${person.id}.md`, content);
});
console.log('Detailed resumes generated.');
