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
  ['olivia-brown', 'Olivia Brown', '11:28 AM', 'University of Arkansas at Little Rock', 'Management']
];

export async function loadFallbackCandidates() {
  return Promise.all(demoCheckIns.map(async ([id, name, checkin_time, university, major]) => {
    const resumePath = new URL(`../../backend/resumes/${id}.md`, import.meta.url);
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
      follow_up_questions: getQuestions(id),
    };
  }));
}


const questionsMap = {"sofia-ramirez":"- What specific process modeling methodologies (e.g., Lean, Six Sigma, BPMN) and tools did you apply in your Capstone Project to achieve the 20% simulated cost reduction, and how did you quantify and validate those savings against baseline metrics?  \n- For the Data Dashboard project, which frontend framework and data visualization libraries did you select, and what were the primary technical challenges you encountered while integrating multiple real-time APIs? How did you address data consistency and performance optimization?  \n- During your Summer Internship at InnovateTech, you reported a 10% increase in departmental efficiency. Can you describe the specific workflows you redesigned, the key bottlenecks identified through data analysis, and the exact metrics or comparative analysis used to measure the 10% gain?  \n- As a Campus Teaching Assistant, you developed supplementary materials that improved average test scores by 15%. What analytics or feedback mechanisms did you use to identify student knowledge gaps, and how did you iteratively refine those materials to achieve that result?","marcus-lee":"- Could you elaborate on the specific modeling approach and supply chain theory applied in your Capstone Project's process optimization? How exactly did the simulation yield a 20% reduction in operational costs, and what metrics were used to validate this improvement?\n\n- In your InnovateTech Solutions internship, what specific analytical methods and tools were employed to identify process bottlenecks within the cross-functional team? How was the data interpreted to drive actionable recommendations for senior management, and what measurable outcomes resulted from those changes?\n\n- For the Data Dashboard Visualization project, which technologies and frameworks were selected for building the interactive dashboard, and what architectural decisions were made to ensure real-time API integration and scalable data handling? Were there any performance challenges encountered during development that required optimization strategies?","nora-kim":"- Can you elaborate on the specific methodologies and techniques you applied in your Capstone Project to achieve a 20% reduction in simulated operational costs? Were there particular data modeling approaches or process mapping tools you used that stood out from standard practices?\n\n- In your Summer Internship at InnovateTech Solutions, what specific challenges did your cross-functional team face when designing the new workflows, and how did you quantify the 10% efficiency improvement? Did you employ any agile methodologies or change management frameworks during implementation?\n\n- For your Data Dashboard Visualization project, which specific APIs and data sources did you integrate, and how did you ensure real-time data accuracy and performance? What visualization libraries or frameworks were you proficient in that enabled this interactive dashboard?\n\n- Given your strong foundation in advanced analytics and database management, could you share more about your technical approach to handling large-scale datasets in either the capstone or dashboard project? Were there any particular SQL queries, NoSQL considerations, or data warehousing strategies you employed?","ava-patel":"- Can you walk me through the specific process modeling framework or notation you used in the Capstone Project to achieve the 20% simulated operational cost reduction, and what was the most complex assumption you had to validate or refute during the optimization?\n- Which frontend framework and data visualization library did you select for the Data Dashboard project, and how did you architect the API integration to handle real-time data synchronization, rate limiting, and consistency across multiple disparate sources?\n- For the InnovateTech Solutions internship, what baseline KPIs or metrics did you use to measure the 10% departmental efficiency gain, and can you describe a specific workflow bottleneck you identified and the concrete solution you implemented to address it?\n- You reported a 15% improvement in average class test scores as a Teaching Assistant; what data or feedback mechanisms did you use to diagnose student pain points, and what specific format or pedagogical approach did your supplementary materials employ to drive that result?","elijah-brooks":"- In your Capstone Project, you achieved a 20% reduction in simulated operational costs. Can you detail the specific process modeling techniques and software tools you employed, and what was the most complex trade-off you had to balance during optimization?\n- Your internship experience mentions identifying bottlenecks and increasing departmental efficiency by 10%. Which quantitative analysis methods or frameworks did you use to pinpoint the root causes, and how did you validate the effectiveness of your recommended workflow changes with senior management?\n- For the Data Dashboard project, you integrated multiple APIs to aggregate real-time data. Which frontend framework and visualization library did you select, and what were the primary data synchronization or performance optimization challenges you encountered during development?\n- You developed supplementary materials that improved average test scores by 15%. What diagnostic approach did you use to identify the specific learning gaps, and how did you measure the direct impact of those materials versus other variables in the course?"};
function getQuestions(id) {
  return questionsMap[id] || null;
}
