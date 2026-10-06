import { getGmailThread, sendGmailMessage } from './gmail.js';

export let checkIns = [];

export function saveCheckIn(state, checkInId) {
  if (state.savedIds.includes(checkInId)) return state;

  return { ...state, savedIds: [...state.savedIds, checkInId] };
}

export function getLogsForView(logs, state, view) {
  const saved = new Set(state.savedIds);

  return logs.filter((log) => (view === 'saved' ? saved.has(log.id) : !saved.has(log.id)));
}

export function filterLogsBySelections(logs, filters) {
  return logs.filter((log) => filters.every((filter) => filter.ids.includes(log.id)));
}

export function getVisibleLogsForView(logs, viewState) {
  const candidates = getLogsForView(logs, viewState, viewState.activeView);
  return viewState.activeView === 'saved' ? candidates : filterLogsBySelections(candidates, [
    ...(viewState.filters ?? []),
    ...(viewState.roleFilter ? [viewState.roleFilter] : []),
  ]);
}

export function countCaption(filters, roleFilter = null) {
  return filters.length || roleFilter ? 'matching filters' : 'checked in';
}

export const jobTitleProfiles = Object.freeze([
  { id: 'software-engineer', label: 'Software Engineer', tags: ['software engineering', 'software development lifecycle', 'programming', 'Python', 'Java', 'JavaScript', 'TypeScript', 'C++', 'data structures and algorithms', 'object-oriented programming', 'web development', 'API development', 'Git and version control', 'software testing', 'debugging', 'code review', 'academic software project', 'personal software project', 'open-source contribution'] },
  { id: 'data-analyst', label: 'Data Analyst', tags: ['data analysis', 'SQL', 'Python', 'pandas', 'databases', 'machine learning'] },
  { id: 'product-manager', label: 'Product Manager', tags: ['product management', 'product ownership', 'product thinking', 'product development', 'product requirements', 'requirements gathering', 'user stories', 'product backlog', 'backlog prioritization', 'roadmap planning', 'stakeholder management', 'customer research', 'user feedback'] },
  { id: 'business-analyst', label: 'Business Analyst', tags: ['business analysis', 'process improvement', 'requirements gathering', 'stakeholder management', 'data analysis', 'SQL', 'user stories'] },
]);

export function getJobTitleFilter(roleId, generatedOptions, tagsByCandidate) {
  const profile = jobTitleProfiles.find(({ id }) => id === roleId);
  if (!profile) return null;
  const available = new Set(generatedOptions.map(({ tag }) => tag));
  const tags = profile.tags.filter((tag) => available.has(tag));
  const matchingTags = new Set(tags);
  const ids = Object.entries(tagsByCandidate)
    .filter(([, candidateTags]) => Array.isArray(candidateTags) && candidateTags.some((tag) => matchingTags.has(tag)))
    .map(([id]) => id);
  return { id: profile.id, label: profile.label, tags, ids };
}

export function addCustomFilterOption(options, query) {
  const label = query.trim();
  return options.some((option) => option.toLocaleLowerCase() === label.toLocaleLowerCase())
    ? options
    : [...options, label];
}

export function getFilterSuggestions(customOptions, generatedOptions) {
  const customLabels = new Set(customOptions.map((label) => label.toLocaleLowerCase()));
  return [
    ...customOptions.map((label) => ({ label, custom: true })),
    ...generatedOptions.filter(({ tag }) => !customLabels.has(tag.toLocaleLowerCase())).slice(0, 12)
      .map(({ tag, count }) => ({ label: tag, count, custom: false })),
  ];
}

const excludedCandidateIds = new Set(['71932106-cc0c-4ec9-ad8f-3bef81ab1844', '44444444-4444-4444-4444-444444444444']);
const excludedCandidateNames = new Set([]);

export function excludeNonCandidateLogs(logs) {
  return logs.filter((log) =>
    !excludedCandidateIds.has(String(log.id)) &&
    !excludedCandidateNames.has(String(log.name ?? '').trim().toLowerCase()),
  );
}

export function toCandidateLog(candidate) {
  return {
    id: candidate.id,
    name: candidate.name,
    initials: candidate.initials,
    time: candidate.checkin_time,
    university: candidate.university,
    major: candidate.major,
    resume: candidate.resume_content,
    shortResume: candidate.short_resume_content,
    followUpQuestions: candidate.follow_up_questions ?? candidate.followUpQuestions,
    email: extractCandidateEmail(candidate.resume_content),
  };
}

export function extractCandidateEmail(resume) {
  return String(resume ?? '').replace(/\\n/g, '\n')
    .match(/(?:^|[\s|])(?:\*\*)?(?:Contact\s+)?Email(?:\*\*)?\s*:\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i)?.[1] ?? '';
}

export function getGmailDraft(candidate, status) {
  const messages = {
    continue: {
      subject: 'Next steps after the career fair',
      body: `Hi ${candidate.name},\n\nIt was great meeting you at the career fair. We’d like to continue the conversation and discuss next steps. Please reply with a few times that work for you.\n\nBest,\nTalent Acquisition`,
    },
    waitlist: {
      subject: 'Update following the career fair',
      body: `Hi ${candidate.name},\n\nThank you for taking the time to speak with us at the career fair. We’re still reviewing candidates and would like to keep you on our waitlist. We’ll reach out if we have an update.\n\nBest,\nTalent Acquisition`,
    },
    decline: {
      subject: 'Thank you for meeting with us',
      body: `Hi ${candidate.name},\n\nThank you for speaking with us at the career fair and for your interest. After careful consideration, we won’t be moving forward at this time. We appreciate your time and wish you the best in your search.\n\nBest,\nTalent Acquisition`,
    },
  };
  const message = messages[status];
  if (!message) return null;
  return { to: candidate.email ?? '', ...message };
}

export function getCandidateResume(logs, candidateId) {
  return logs.find((log) => log.id === candidateId)?.resume ?? '';
}

function minutesAfterMidnight(time) {
  const [clock, period] = String(time).trim().split(/\s+/);
  const [hour, minute] = clock.split(':').map(Number);
  const hourIn24HourTime = (hour % 12) + (period === 'PM' ? 12 : 0);

  return hourIn24HourTime * 60 + minute;
}

export function sortCheckInsByTime(logs) {
  return [...logs].sort((first, second) => minutesAfterMidnight(first.time) - minutesAfterMidnight(second.time));
}

export function toggleRecording(isRecording) {
  return !isRecording;
}

export function getRecordingControls(isRecording, hasRecording, transcriptSaved) {
  return {
    showWaveform: isRecording,
    showTranscriptSave: hasRecording && !isRecording,
  };
}

export function saveTranscript(state, candidateId) {
  const transcriptIds = state.transcriptIds ?? [];

  return {
    ...state,
    transcriptIds: transcriptIds.includes(candidateId) ? transcriptIds : [...transcriptIds, candidateId],
  };
}

export function updateCandidateStatus(state, candidateId, status) {
  const allowedStatuses = new Set(['continue', 'waitlist', 'decline']);
  if (!allowedStatuses.has(status)) return state;

  return {
    ...state,
    candidateStatuses: { ...(state.candidateStatuses ?? {}), [candidateId]: status },
  };
}

export function appendLiveTranscript(currentText, nextText) {
  return [currentText, nextText].filter(Boolean).join(' ').trim();
}

export function transcriptTextForSession(entries, sessionId) {
  return (Array.isArray(entries) ? entries : [])
    .filter((entry) => entry?.session_id === sessionId && entry.kind === 'final' && entry.text?.trim())
    .map((entry) => entry.text.trim())
    .join(' ');
}

export function frameAudioSamples(samples, remainder = new Float32Array(0)) {
  const combined = new Float32Array(remainder.length + samples.length);
  combined.set(remainder);
  combined.set(samples, remainder.length);

  const frameCount = Math.floor(combined.length / 480);
  const frames = Array.from({ length: frameCount }, (_, index) => combined.slice(index * 480, (index + 1) * 480));

  return { frames, remainder: combined.slice(frameCount * 480) };
}

export function getRecordScreenLayout(isResumeOpen, isResumeClosing = false) {
  const isFocusedDocumentMode = isResumeOpen || isResumeClosing;

  return {
    hideSidebar: isFocusedDocumentMode,
    dockMicrophone: isResumeOpen,
    showResumeTab: !isFocusedDocumentMode,
  };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character]);
}

export function renderResumeMarkdown(markdown) {
  const lines = String(markdown ?? '')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n?/g, '\n')
    .split('\n');
  const blocks = [];
  let listItems = [];

  const renderInlineMarkdown = (line) => escapeHtml(line)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');

  const flushList = () => {
    if (!listItems.length) return;
    blocks.push(`<ul>${listItems.map((item) => `<li>${item}</li>`).join('')}</ul>`);
    listItems = [];
  };

  for (const line of lines) {
    const safeLine = renderInlineMarkdown(line.trim());

    if (!safeLine) {
      flushList();
    } else if (safeLine === '---') {
      flushList();
      blocks.push('<hr>');
    } else if (safeLine.startsWith('## ')) {
      flushList();
      blocks.push(`<h2>${safeLine.slice(3)}</h2>`);
    } else if (safeLine.startsWith('# ')) {
      flushList();
      blocks.push(`<h1>${safeLine.slice(2)}</h1>`);
    } else if (safeLine.startsWith('- ')) {
      listItems.push(safeLine.slice(2));
    } else {
      flushList();
      blocks.push(`<p>${safeLine}</p>`);
    }
  }

  flushList();
  return blocks.join('') || '<p>No resume content is available for this candidate.</p>';
}

export function renderFollowUpQuestions(questions) {
  const questionList = Array.isArray(questions)
    ? questions
    : typeof questions === 'string'
      ? questions.split(/\r?\n/).map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, ''))
      : [];

  const items = questionList
    .filter((question) => typeof question === 'string' && question.trim())
    .map((question) => `<li>${escapeHtml(question.trim())}</li>`);

  if (items.length === 0) return '';

  return `<section class="follow-up-questions" aria-label="AI-generated follow-up questions"><h2>AI-generated follow-up questions</h2><ul>${items.join('')}</ul></section>`;
}

function plainResumeText(line) {
  return String(line).replace(/^\s*-\s*/, '').replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '').trim();
}

export function extractComparisonProfile(candidate) {
  const sections = new Map();
  let section = '';
  const resume = String(candidate.resume || candidate.shortResume || '')
    .replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\r\n?/g, '\n');

  for (const line of resume.split('\n')) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      section = heading[1].trim().toUpperCase();
      sections.set(section, []);
    } else if (section && line.trim() && line.trim() !== '---') {
      sections.get(section).push(line.trim());
    }
  }

  const linesFor = (name) => sections.get(name) ?? [];
  const entriesFor = (name) => {
    const entries = [];
    for (const line of linesFor(name)) {
      if (line.startsWith('- ')) {
        if (entries.length && !entries.at(-1).detail) entries.at(-1).detail = plainResumeText(line);
      } else {
        entries.push({ title: plainResumeText(line), detail: '' });
      }
    }
    return entries;
  };

  return {
    summary: plainResumeText(linesFor('PROFESSIONAL SUMMARY')[0] ?? ''),
    skills: linesFor('SKILLS').map((line) => {
      const [label, ...detail] = plainResumeText(line).split(':');
      return detail.length ? { label: label.trim(), detail: detail.join(':').trim() } : { label: '', detail: label.trim() };
    }).filter(({ detail }) => detail),
    experience: entriesFor('EXPERIENCE'),
    projects: entriesFor('PROJECTS'),
  };
}

function splitSkillItems(detail) {
  const items = [];
  let current = '';
  let parentheses = 0;
  for (const character of detail) {
    if (character === '(') parentheses += 1;
    if (character === ')') parentheses = Math.max(0, parentheses - 1);
    if (character === ',' && parentheses === 0) {
      if (current.trim()) items.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }
  if (current.trim()) items.push(current.trim());
  return items;
}

export function buildComparisonModel(candidates) {
  const members = candidates.map((candidate) => {
    const profile = extractComparisonProfile(candidate);
    const skillItems = profile.skills.flatMap(({ detail }) => splitSkillItems(detail));
    const skills = [...new Map(skillItems.map((skill) => [skill.toLocaleLowerCase(), skill])).values()];
    return {
      candidate,
      profile,
      skills,
      counts: { skills: skills.length, experience: profile.experience.length, projects: profile.projects.length },
    };
  });
  const sharedSkills = members.length < 2 ? [] : members[0].skills.filter((skill) =>
    members.every((member) => member.skills.some((item) => item.toLocaleLowerCase() === skill.toLocaleLowerCase())));
  const sharedSkillKeys = new Set(sharedSkills.map((skill) => skill.toLocaleLowerCase()));
  const comparedMembers = members.map((member) => {
    return {
      ...member,
      nonSharedSkills: member.skills.filter((skill) => !sharedSkillKeys.has(skill.toLocaleLowerCase())),
    };
  });
  return {
    members: comparedMembers,
    sharedSkills,
    maxCounts: {
      skills: Math.max(1, ...members.map(({ counts }) => counts.skills)),
      experience: Math.max(1, ...members.map(({ counts }) => counts.experience)),
      projects: Math.max(1, ...members.map(({ counts }) => counts.projects)),
    },
  };
}

export function renderComparisonBoard(candidates, comparisonState) {
  if (!candidates.length) return `<div class="comparison-empty">
    <span class="empty-state-mark" aria-hidden="true">✓</span>
    <h3>No saved candidates yet</h3>
    <p>Save candidates from Logs to compare their resume evidence here.</p>
    <button class="button button-primary" type="button" data-return-to-logs>View logs</button>
  </div>`;

  const { members, sharedSkills, maxCounts } = buildComparisonModel(candidates);
  const missing = '<span class="comparison-missing">Not listed in resume</span>';
  const renderEvidence = (entries) => entries.length
    ? `<ul class="comparison-evidence-list">${entries.slice(0, 2).map(({ title, detail }) => `<li><strong>${escapeHtml(title)}</strong>${detail ? `<span>${escapeHtml(detail)}</span>` : ''}</li>`).join('')}</ul>${entries.length > 2 ? `<p class="comparison-more">+${entries.length - 2} more in full resume</p>` : ''}`
    : missing;
  const renderRow = (label, valueForMember) => `<tr><th scope="row">${label}</th>${members.map((member) => `<td>${valueForMember(member)}</td>`).join('')}</tr>`;
  const renderMetric = (member, key) => {
    const count = member.counts[key];
    const width = Math.round((count / maxCounts[key]) * 100);
    return `<div class="evidence-meter"><span class="evidence-meter-track" aria-hidden="true"><span style="width:${width}%"></span></span><strong>${count}</strong></div>`;
  };

  return `${members.length === 1 ? '<p class="comparison-nudge">Save another candidate to compare shared and distinct resume evidence.</p>' : ''}
    <section class="comparison-candidates" aria-label="Saved candidate decisions">
      ${members.map(({ candidate }) => {
        const name = escapeHtml(candidate.name || 'Candidate');
        const id = escapeHtml(candidate.id);
        const status = comparisonState.candidateStatuses?.[candidate.id];
        return `<article class="comparison-candidate-card">
          <div class="comparison-candidate-heading"><h3>${name}</h3><p>${escapeHtml(candidate.university || 'University not listed')} · ${escapeHtml(candidate.major || 'Major not listed')}</p></div>
          <div class="candidate-status-bar" role="group" aria-label="Recruitment status for ${name}">${['continue', 'waitlist', 'decline'].map((outcome) => `<button class="candidate-status${status === outcome ? ' is-selected' : ''} is-${outcome}" type="button" aria-pressed="${status === outcome}" data-candidate-status="${outcome}" data-candidate-id="${id}">${outcome === 'continue' ? 'Continue' : outcome === 'waitlist' ? 'Waitlist' : 'Decline'}</button>`).join('')}</div>
          <div class="comparison-card-actions"><button class="button button-secondary" type="button" data-view-resume="${id}" aria-label="Full resume for ${name}">Full resume</button>${comparisonState.transcriptIds?.includes(candidate.id) ? `<button class="button button-secondary" type="button" data-view-transcript="${id}" aria-label="View transcript for ${name}">Transcript</button>` : ''}<button class="comparison-remove" type="button" data-save="${id}" aria-label="Remove ${name} from saved candidates">Remove</button></div>
        </article>`;
      }).join('')}
    </section>
    <section class="comparison-panel" aria-labelledby="evidence-heading">
      <div class="comparison-panel-heading"><div><p class="eyebrow">At a glance</p><h3 id="evidence-heading">Evidence overview</h3></div><p id="evidence-note">Bars count items documented in each resume, not candidate quality or fit.</p></div>
      <div class="comparison-table-scroll" tabindex="0" aria-label="Scroll evidence chart horizontally">
        <table class="evidence-chart" aria-describedby="evidence-note"><thead><tr><th scope="col">Candidate</th><th scope="col">Skills listed</th><th scope="col">Experience roles</th><th scope="col">Projects</th></tr></thead><tbody>
          ${members.map((member) => `<tr><th scope="row">${escapeHtml(member.candidate.name || 'Candidate')}</th><td>${renderMetric(member, 'skills')}</td><td>${renderMetric(member, 'experience')}</td><td>${renderMetric(member, 'projects')}</td></tr>`).join('')}
        </tbody></table>
      </div>
    </section>
    <section class="comparison-panel" aria-labelledby="skills-comparison-heading">
      <div class="comparison-panel-heading"><div><p class="eyebrow">Overlap and differences</p><h3 id="skills-comparison-heading">Skills comparison</h3></div><p>Only skills explicitly listed in the resumes are included.</p></div>
      <div class="skill-contrast"><div class="shared-skills"><h4>Shared by every saved candidate</h4>${members.length < 2 ? '<p>Save another candidate to compare skills.</p>' : sharedSkills.length ? `<ul class="skill-tags">${sharedSkills.map((skill) => `<li>${escapeHtml(skill)}</li>`).join('')}</ul>` : '<p>No skills shared by every candidate.</p>'}</div>
        <div class="nonshared-skills"><h4>${members.length < 2 ? 'Listed skills' : 'Skills not shared by everyone'}</h4>${members.map((member) => `<div><strong>${escapeHtml(member.candidate.name || 'Candidate')}</strong>${member.nonSharedSkills.length ? `<ul class="skill-tags">${member.nonSharedSkills.map((skill) => `<li>${escapeHtml(skill)}</li>`).join('')}</ul>` : `<p>${member.skills.length ? 'Only the shared skills shown at left.' : 'No skills listed in resume.'}</p>`}</div>`).join('')}</div>
      </div>
    </section>
    <section class="comparison-panel" aria-labelledby="details-heading">
      <div class="comparison-panel-heading"><h3 id="details-heading">Detailed comparison</h3><p>Scroll sideways to review every saved candidate.</p></div>
      <div class="comparison-table-scroll" tabindex="0" aria-label="Scroll detailed comparison horizontally">
        <table class="comparison-matrix"><thead><tr><th scope="col">Compare</th>${members.map(({ candidate }) => `<th scope="col"><span class="matrix-name">${escapeHtml(candidate.name || 'Candidate')}</span></th>`).join('')}</tr></thead><tbody>
          ${renderRow('Profile', ({ profile }) => profile.summary ? escapeHtml(profile.summary) : missing)}
          ${renderRow('Education', ({ candidate }) => `${escapeHtml(candidate.university || 'University not listed')}<br>${escapeHtml(candidate.major || 'Major not listed')}`)}
          ${renderRow('Experience', ({ profile }) => renderEvidence(profile.experience))}
          ${renderRow('Projects', ({ profile }) => renderEvidence(profile.projects))}
        </tbody></table>
      </div>
    </section>`;
}

async function fetchCandidates() {
  const response = await fetch('/api/candidates');
  if (!response.ok) throw new Error('Candidate data could not be loaded.');

  const candidates = await response.json();
  if (!Array.isArray(candidates)) throw new Error('Candidate data is unavailable.');

  return {
    candidates: sortCheckInsByTime(excludeNonCandidateLogs(candidates.map(toCandidateLog))),
    source: response.headers.get('X-Candidate-Source'),
  };
}

const state = { activeView: 'logs', dataSource: 'live', savedIds: [], transcriptIds: [], transcriptTextByCandidate: {}, candidateStatuses: {}, filters: [], roleFilter: null, filterOptions: [], customFilterOptions: [], tagsByCandidate: {}, selectedCandidateId: null, resumeOpen: false, resumeClosing: false, isRecording: false, hasRecording: false, transcriptSaved: false };
let audioContext;
let audioProcessor;
let audioWebSocket;
let eventSource;
let liveTranscriptText = '';
let recordingStream;
let audioFrameRemainder = new Float32Array(0);
let voiceSessionId = '';
let resumeCloseTimer;
let dataStatusTimer;
let dataStatusHideTimer;
let googleClientId;
let googleConfigPromise;
let gmailAccessToken = '';
let gmailTokenExpiresAt = 0;
let emailCandidate;
let emailOutcome;
let emailReplyContext = null;

const gmailReadScope = 'https://www.googleapis.com/auth/gmail.readonly';
const gmailSendScope = 'https://www.googleapis.com/auth/gmail.send';

const findCandidate = () => checkIns.find((log) => log.id === state.selectedCandidateId);

function setDataStatus(message, isError = false) {
  const status = document.querySelector('[data-data-status]');
  window.clearTimeout(dataStatusTimer);
  window.clearTimeout(dataStatusHideTimer);
  status.classList.remove('is-dismissing');
  status.setAttribute('role', isError ? 'alert' : 'status');
  status.setAttribute('aria-live', isError ? 'assertive' : 'polite');
  status.classList.toggle('is-error', isError);
  status.textContent = message;
  status.hidden = !message;

  if (!message || isError) return;

  dataStatusTimer = window.setTimeout(() => {
    status.classList.add('is-dismissing');
    const fadeDuration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 240;
    dataStatusHideTimer = window.setTimeout(() => {
      status.hidden = true;
      status.classList.remove('is-dismissing');
    }, fadeDuration);
  }, 4000);
}

function gmailIsConnected() {
  return Boolean(gmailAccessToken && Date.now() < gmailTokenExpiresAt);
}

function setEmailConnectionStatus(message) {
  document.querySelector('[data-email-connection-status]').textContent = message;
}

function updateEmailSendButton() {
  document.querySelector('[data-email-send]').disabled = !gmailIsConnected() || !document.querySelector('[data-email-to]').value;
}

function loadGoogleConfig() {
  googleConfigPromise ??= fetch('/api/google-config')
    .then((response) => {
      if (!response.ok) throw new Error('Gmail connection is unavailable.');
      return response.json();
    })
    .then(({ clientId }) => {
      googleClientId = clientId;
      return clientId;
    }).catch((error) => {
      googleConfigPromise = undefined;
      throw error;
    });
  return googleConfigPromise;
}

async function loadEmailThread() {
  const thread = document.querySelector('[data-email-thread]');
  const candidateId = emailCandidate?.id;
  if (!candidateId || !gmailIsConnected()) return;
  thread.textContent = 'Loading conversation…';

  try {
    const { messages, replyContext } = await getGmailThread(gmailAccessToken, emailCandidate.email);
    if (emailCandidate?.id !== candidateId) return;
    emailReplyContext = replyContext;
    thread.replaceChildren();
    if (!messages.length) {
      thread.textContent = 'No previous Gmail conversation with this candidate.';
      return;
    }
    for (const message of messages) {
      const article = document.createElement('article');
      article.className = 'email-thread-message';
      const sender = document.createElement('strong');
      sender.textContent = message.from || 'Unknown sender';
      const date = document.createElement('time');
      date.textContent = message.date;
      const body = document.createElement('p');
      body.textContent = message.body;
      article.append(sender, date, body);
      thread.append(article);
    }
  } catch (error) {
    if (emailCandidate?.id !== candidateId) return;
    emailReplyContext = null;
    if (error.status === 401) {
      gmailAccessToken = '';
      updateEmailSendButton();
      setEmailConnectionStatus('Gmail access expired. Connect again to continue.');
    }
    thread.textContent = error.message || 'Could not load the Gmail conversation.';
  }
}

function openEmailDialog(candidate, outcome) {
  emailCandidate = candidate;
  emailOutcome = outcome;
  emailReplyContext = null;
  const draft = getGmailDraft(candidate, outcome);
  const dialog = document.querySelector('[data-email-dialog]');
  document.querySelector('[data-email-candidate]').textContent = `Email ${candidate.name}`;
  document.querySelector('[data-email-to]').value = draft.to;
  document.querySelector('[data-email-subject]').value = draft.subject;
  document.querySelector('[data-email-body]').value = draft.body;
  document.querySelector('[data-email-send-status]').textContent = '';
  document.querySelector('[data-email-thread]').textContent = draft.to
    ? 'Connect Gmail to load this candidate’s conversation.'
    : 'No email address was found in this candidate’s resume.';
  const connectButton = document.querySelector('[data-connect-gmail]');
  connectButton.disabled = true;
  updateEmailSendButton();
  setEmailConnectionStatus(draft.to ? 'Checking Gmail connection…' : 'No candidate email address is available.');
  dialog.showModal();
  document.body.classList.add('email-dialog-open');

  if (!draft.to) return;
  loadGoogleConfig().then((clientId) => {
    if (!dialog.open || emailCandidate?.id !== candidate.id) return;
    connectButton.disabled = !clientId;
    if (!clientId) {
      setEmailConnectionStatus('Gmail is not connected to this dashboard yet.');
    } else if (gmailIsConnected()) {
      setEmailConnectionStatus('Gmail connected.');
      updateEmailSendButton();
      loadEmailThread();
    } else {
      setEmailConnectionStatus('Connect Gmail to view the conversation and send.');
    }
  }).catch(() => {
    if (dialog.open) setEmailConnectionStatus('Gmail connection is unavailable right now.');
  });
}

function connectGmail() {
  const oauth = window.google?.accounts?.oauth2;
  if (!googleClientId || !oauth) {
    setEmailConnectionStatus('Google sign-in could not load. Refresh and try again.');
    return;
  }

  const client = oauth.initTokenClient({
    client_id: googleClientId,
    scope: `${gmailReadScope} ${gmailSendScope}`,
    callback: (result) => {
      if (!document.querySelector('[data-email-dialog]').open) return;
      if (!result.access_token || !oauth.hasGrantedAllScopes(result, gmailReadScope, gmailSendScope)) {
        setEmailConnectionStatus('Gmail access was not granted.');
        return;
      }
      gmailAccessToken = result.access_token;
      gmailTokenExpiresAt = Date.now() + Math.max(0, Number(result.expires_in ?? 3600) - 60) * 1000;
      setEmailConnectionStatus('Gmail connected.');
      updateEmailSendButton();
      loadEmailThread();
    },
    error_callback: () => setEmailConnectionStatus('Google sign-in was closed or blocked. Try again.'),
  });
  client.requestAccessToken({ prompt: gmailAccessToken ? '' : 'consent' });
}

async function sendCandidateEmail(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const sendButton = document.querySelector('[data-email-send]');
  const status = document.querySelector('[data-email-send-status]');
  if (!gmailIsConnected()) {
    status.textContent = 'Connect Gmail before sending.';
    updateEmailSendButton();
    return;
  }
  if (!form.reportValidity()) return;

  sendButton.disabled = true;
  status.textContent = 'Sending…';
  try {
    await sendGmailMessage(gmailAccessToken, {
      to: document.querySelector('[data-email-to]').value,
      subject: document.querySelector('[data-email-subject]').value.trim(),
      body: document.querySelector('[data-email-body]').value,
    }, emailReplyContext);
    status.textContent = 'Sent from your Gmail account.';
    await loadEmailThread();
  } catch (error) {
    status.textContent = error.message || 'Could not send this email.';
    if (error.status === 401) {
      gmailAccessToken = '';
      setEmailConnectionStatus('Gmail access expired. Connect again to continue.');
    }
  } finally {
    updateEmailSendButton();
  }
}

function setFilterStatus(message, isError = false) {
  const status = document.querySelector('[data-filter-status]');
  status.textContent = message;
  status.setAttribute('role', isError ? 'alert' : 'status');
  status.setAttribute('aria-live', isError ? 'assertive' : 'polite');
  status.classList.toggle('is-error', isError);
}

const customFiltersStorageKey = 'talentiq-custom-filters';

function readCustomFilters() {
  try {
    const saved = JSON.parse(localStorage.getItem(customFiltersStorageKey) ?? '[]');
    return Array.isArray(saved)
      ? saved.filter((item) => typeof item === 'string' && item.trim() && item.trim().length <= 200)
        .reduce(addCustomFilterOption, [])
      : [];
  } catch {
    return [];
  }
}

function persistCustomFilters() {
  try {
    localStorage.setItem(customFiltersStorageKey, JSON.stringify(state.customFilterOptions));
    return true;
  } catch {
    return false;
  }
}

function renderFilters() {
  document.querySelector('[data-clear-filters]').hidden = state.filters.length === 0 && !state.roleFilter;
  document.querySelector('[data-job-title]').value = state.roleFilter?.id ?? '';
  document.querySelector('[data-job-title-detail]').textContent = state.roleFilter
    ? state.roleFilter.tags.length
      ? `Matches any of ${state.roleFilter.tags.length} generated resume filters: ${state.roleFilter.tags.join(', ')}.`
      : 'No generated resume filters match this job title in the current resumes.'
    : 'Choose a title to match candidates by relevant generated resume filters.';
  document.querySelector('[data-filter-suggestions]').innerHTML = getFilterSuggestions(state.customFilterOptions, state.filterOptions).map(({ label, count, custom }) => {
    const selected = state.filters.some((filter) => custom
      ? filter.label.toLocaleLowerCase() === label.toLocaleLowerCase()
      : filter.tag === label) || (!custom && state.roleFilter?.tags.includes(label));
    return custom
      ? `<button class="filter-chip" type="button" data-add-custom-filter="${escapeHtml(label)}" aria-pressed="${selected}" aria-label="Apply saved filter ${escapeHtml(label)}">${escapeHtml(label)} <small>Saved</small></button>`
      : `<button class="filter-chip" type="button" data-add-tag="${escapeHtml(label)}" aria-pressed="${selected}" aria-label="Filter by ${escapeHtml(label)}, ${count} ${count === 1 ? 'candidate' : 'candidates'}">${escapeHtml(label)} <small>${count}</small></button>`;
  }).join('');
  document.querySelector('[data-active-filters]').innerHTML = `${state.roleFilter
    ? `<button class="filter-chip is-active" type="button" data-remove-role aria-label="Remove ${escapeHtml(state.roleFilter.label)} job title filter">${escapeHtml(state.roleFilter.label)} · any relevant filter <span aria-hidden="true">×</span></button>`
    : ''}${state.filters.map((filter, index) =>
    `<button class="filter-chip is-active" type="button" data-remove-filter="${index}" aria-label="Remove ${escapeHtml(filter.label)} filter">${escapeHtml(filter.label)} <span aria-hidden="true">×</span></button>`,
  ).join('')}`;
}

function filterGuidance(view = state.activeView) {
  if (view === 'saved') return 'Add a skill or experience above to narrow your saved comparison.';
  return state.filterOptions.length || state.customFilterOptions.length
    ? 'Suggested filters are based on evidence found in resumes. Missing tags do not mean a candidate lacks a skill.'
    : 'No supported filter tags were found in these resumes. You can still describe a custom filter.';
}

async function loadFilterOptions() {
  try {
    const response = await fetch('/api/filter-options');
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? 'Could not generate filters.');
    state.filterOptions = payload.options ?? [];
    state.tagsByCandidate = payload.tagsByCandidate ?? {};
    document.querySelector('[data-job-title]').disabled = false;
    if (state.roleFilter) state.roleFilter = getJobTitleFilter(state.roleFilter.id, state.filterOptions, state.tagsByCandidate);
    setFilterStatus(filterGuidance());
    renderFilters();
  } catch (error) {
    document.querySelector('[data-job-title-detail]').textContent = 'Job title matching is unavailable until resume filters load.';
    setFilterStatus(error.message || 'AI filters are unavailable right now.', true);
  }
}

function renderList() {
  const visibleLogs = getVisibleLogsForView(checkIns, state);
  const hasActiveLogFilters = state.activeView !== 'saved' && Boolean(state.filters.length || state.roleFilter);
  const title = state.activeView === 'saved' ? 'Saved candidates' : 'Check-in logs';
  const description = state.activeView === 'saved'
    ? 'Review your saved candidates side by side and decide who to follow up with.'
    : 'People who checked in at the TalentIQ career fair today.';

  document.querySelector('[data-view-title]').textContent = title;
  document.querySelector('[data-view-description]').textContent = description;
  document.querySelector('[data-log-count]').textContent = `${visibleLogs.length} ${visibleLogs.length === 1 ? 'person' : 'people'}`;
  document.querySelector('[data-summary-caption]').textContent = state.activeView === 'saved' ? 'saved for review' : countCaption(state.filters, state.roleFilter);
  document.querySelector('[data-total-checkins]').textContent = checkIns.length;
  document.querySelector('[data-saved-count]').textContent = state.savedIds.length;

  const savedView = state.activeView === 'saved';
  const filterStatus = document.querySelector('[data-filter-status]');
  if ([filterGuidance('saved'), filterGuidance('logs')].includes(filterStatus.textContent)) setFilterStatus(filterGuidance());
  document.querySelector('[data-dashboard-screen]').classList.toggle('is-comparison-view', savedView);
  document.querySelector('.filter-panel').hidden = savedView;
  document.querySelector('.comparison-section').hidden = !savedView;
  document.querySelector('.logs-section').hidden = savedView;
  const skipLink = document.querySelector('.skip-link');
  skipLink.href = savedView ? '#comparison-list' : '#candidate-list';
  skipLink.textContent = savedView ? 'Skip to candidate comparison' : 'Skip to candidate list';
  document.querySelector('[data-comparison-grid]').innerHTML = savedView ? renderComparisonBoard(visibleLogs, state) : '';

  const logList = document.querySelector('[data-log-list]');
  logList.innerHTML = savedView ? '' : visibleLogs.map((log) => `
    <div class="log-row${state.activeView === 'saved' ? ' is-saved' : ''}" role="row">
      <div class="person-cell" role="cell">
        <span class="avatar" aria-hidden="true">${escapeHtml(log.initials)}</span>
        <div>
          <div class="person-name-line">
            <h2>${escapeHtml(log.name)}</h2>
            <button class="resume-info-button" type="button" data-view-resume="${escapeHtml(log.id)}" aria-label="View resume for ${escapeHtml(log.name)}" title="View resume">
              <span aria-hidden="true">i</span>
            </button>
          </div>
          <p>${escapeHtml(log.university)} <span aria-hidden="true">·</span> ${escapeHtml(log.major)}</p>
          ${state.activeView === 'saved' ? `
            <div class="candidate-status-bar" role="group" aria-label="Recruitment status for ${escapeHtml(log.name)}">
              ${['continue', 'waitlist', 'decline'].map((status) => `<button class="candidate-status${state.candidateStatuses[log.id] === status ? ' is-selected' : ''} is-${status}" type="button" aria-pressed="${state.candidateStatuses[log.id] === status}" data-candidate-status="${status}" data-candidate-id="${escapeHtml(log.id)}">${status === 'continue' ? 'Continue' : status === 'waitlist' ? 'Waitlist' : 'Decline'}</button>`).join('')}
            </div>` : ''}
        </div>
      </div>
      <time role="cell" aria-label="Checked in at ${escapeHtml(log.time)}">${escapeHtml(log.time)}</time>
      <div class="row-actions" role="cell" aria-label="Actions for ${escapeHtml(log.name)}">
        ${state.transcriptIds.includes(log.id) ? `<button class="button button-secondary view-transcript-button" type="button" data-view-transcript="${escapeHtml(log.id)}">View transcript</button>` : ''}
        ${state.activeView !== 'saved' ? `<button class="button button-secondary record-button" type="button" data-record="${escapeHtml(log.id)}" aria-label="Open record for ${escapeHtml(log.name)}">
          <span aria-hidden="true">●</span> Record
        </button>` : ''}
        <button class="button button-primary" type="button" data-save="${escapeHtml(log.id)}" aria-label="${state.activeView === 'saved' ? 'Remove' : 'Save'} ${escapeHtml(log.name)}${state.activeView === 'saved' ? ' from saved candidates' : ' to saved candidates'}">
          ${state.activeView === 'saved' ? 'Remove' : 'Save'}
        </button>
      </div>
    </div>
  `).join('') || `
    <div class="empty-state" role="row">
      <div role="cell" aria-colspan="3">
        <span class="empty-state-mark" aria-hidden="true">✓</span>
        <h2>${hasActiveLogFilters ? 'No candidates match these filters' : state.activeView === 'saved' ? 'No saved candidates yet' : 'No check-ins available'}</h2>
        <p>${hasActiveLogFilters ? 'Try removing a filter or choosing a different job title.' : state.activeView === 'saved' ? 'Use Save on a check-in to keep a candidate handy for follow-up.' : 'Candidate check-ins will appear here when they are available.'}</p>
        ${hasActiveLogFilters ? '<button class="button button-primary" type="button" data-clear-filters>Clear filters</button>' : state.activeView === 'saved' ? '<button class="button button-primary" type="button" data-return-to-logs>View logs</button>' : ''}
      </div>
    </div>
  `;

  const maxActionWidth = [...logList.querySelectorAll('.row-actions')].reduce((maxWidth, actions) => {
    const buttonWidths = [...actions.children].reduce((sum, button) => sum + button.getBoundingClientRect().width, 0);
    const gap = Number.parseFloat(getComputedStyle(actions).columnGap) || 0;
    return Math.max(maxWidth, buttonWidths + Math.max(0, actions.children.length - 1) * gap);
  }, 0);
  document.querySelector('.logs-section').style.setProperty('--action-column-width', `${Math.ceil(maxActionWidth || 120)}px`);

  document.querySelectorAll('[data-view]').forEach((button) => {
    const isActive = button.dataset.view === state.activeView;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-current', isActive ? 'page' : 'false');
    button.setAttribute('aria-label', isActive
      ? `${state.activeView === 'saved' ? 'Saved' : 'Logs'}, current view, ${state.activeView === 'saved' ? state.savedIds.length : checkIns.length} candidates`
      : state.activeView === 'saved' ? `Saved candidates, ${state.savedIds.length}` : `Logs, ${checkIns.length} candidates`);
  });
  renderFilters();
}

function renderRecord() {
  const candidate = findCandidate();
  if (!candidate) return;

  document.querySelector('[data-record-name]').textContent = candidate.name;
  document.querySelector('[data-record-meta]').textContent = `${candidate.university} · ${candidate.major}`;
  document.querySelector('[data-record-time]').textContent = `Checked in at ${candidate.time}`;
  document.querySelector('#resume-drawer-title').textContent = state.dataSource === 'demo' ? 'Demo resume' : 'AI summarized resume';
  document.querySelector('[data-resume-content]').innerHTML = `${renderResumeMarkdown(candidate.shortResume || candidate.resume)}${renderFollowUpQuestions(candidate.followUpQuestions)}`;
  const resumeDrawer = document.querySelector('[data-resume-drawer]');
  resumeDrawer.classList.toggle('is-open', state.resumeOpen);
  resumeDrawer.setAttribute('aria-hidden', String(!state.resumeOpen));
  resumeDrawer.inert = !state.resumeOpen;
  const resumeToggle = document.querySelector('[data-open-resume]');
  resumeToggle.classList.toggle('is-shifted', state.resumeOpen);

  const microphone = document.querySelector('[data-toggle-recording]');
  const layout = getRecordScreenLayout(state.resumeOpen, state.resumeClosing);
  document.body.classList.toggle('resume-is-open', layout.hideSidebar);
  resumeToggle.hidden = !layout.showResumeTab;
  document.querySelector('[data-back-to-logs]').inert = layout.hideSidebar;
  microphone.classList.toggle('is-docked', layout.dockMicrophone);
  microphone.classList.toggle('is-recording', state.isRecording);
  microphone.setAttribute('aria-label', state.isRecording ? 'Stop recording' : 'Start recording');
  document.querySelector('[data-recording-label]').textContent = state.isRecording ? 'Stop recording' : 'Start recording';

  const controls = getRecordingControls(state.isRecording, state.hasRecording, state.transcriptSaved);
  document.querySelector('[data-recording-wave]').hidden = !controls.showWaveform;
  document.querySelector('[data-save-transcript]').hidden = !controls.showTranscriptSave;
  document.querySelector('[data-save-transcript]').disabled = state.transcriptSaved;
  document.querySelector('[data-transcript-added]').hidden = !state.transcriptSaved;
}

function openRecord(candidateId) {
  state.selectedCandidateId = candidateId;
  state.resumeOpen = false;
  state.resumeClosing = false;
  state.isRecording = false;
  state.hasRecording = false;
  state.transcriptSaved = false;
  liveTranscriptText = state.transcriptTextByCandidate[candidateId] ?? '';
  document.querySelector('[data-dashboard-screen]').hidden = true;
  document.querySelector('[data-record-screen]').hidden = false;
  renderRecord();
  document.querySelector('[data-back-to-logs]').focus();
}

let dashboardReturnFocus = null;

function rememberDashboardFocus(action, candidateId) {
  dashboardReturnFocus = { action, candidateId };
}

function restoreDashboardFocus() {
  if (!dashboardReturnFocus) return;

  const { action, candidateId } = dashboardReturnFocus;
  const selectorByAction = {
    record: '[data-record]',
    transcript: '[data-view-transcript]',
    resume: '[data-view-resume]',
  };
  const dataKeyByAction = { record: 'record', transcript: 'viewTranscript', resume: 'viewResume' };
  const target = [...document.querySelectorAll(selectorByAction[action] ?? '')]
    .find((element) => element.dataset[dataKeyByAction[action]] === candidateId);
  dashboardReturnFocus = null;
  target?.focus();
}

function closeRecord() {
  stopRecording();
  window.clearTimeout(resumeCloseTimer);
  document.body.classList.remove('resume-is-open');
  state.selectedCandidateId = null;
  state.resumeOpen = false;
  state.resumeClosing = false;
  document.querySelector('[data-record-screen]').hidden = true;
  document.querySelector('[data-dashboard-screen]').hidden = false;
  renderList();
  restoreDashboardFocus();
}

function renderTranscript() {
  const candidate = findCandidate();
  if (!candidate) return;

  document.querySelector('[data-transcript-name]').textContent = candidate.name;
  document.querySelector('[data-transcript-meta]').textContent = `${candidate.university} · ${candidate.major}`;
  const transcript = state.transcriptTextByCandidate[candidate.id]?.trim();
  document.querySelector('[data-transcript-body]').textContent = transcript || `A recording for ${candidate.name} was saved for follow-up. Live speech-to-text will appear here while recording.`;
}

function openTranscript(candidateId) {
  state.selectedCandidateId = candidateId;
  document.querySelector('[data-dashboard-screen]').hidden = true;
  document.querySelector('[data-transcript-screen]').hidden = false;
  renderTranscript();
  document.querySelector('[data-back-to-logs-from-transcript]').focus();
}

function closeTranscript() {
  state.selectedCandidateId = null;
  document.querySelector('[data-transcript-screen]').hidden = true;
  document.querySelector('[data-dashboard-screen]').hidden = false;
  renderList();
  restoreDashboardFocus();
}

function renderResumeInfo() {
  const candidate = findCandidate();
  if (!candidate) return;

  document.querySelector('[data-resume-info-name]').textContent = candidate.name;
  document.querySelector('[data-resume-info-meta]').textContent = `${candidate.university} · ${candidate.major}`;
  document.querySelector('[data-resume-info-content]').innerHTML = renderResumeMarkdown(getCandidateResume(checkIns, candidate.id));
}

function openResumeInfo(candidateId) {
  state.selectedCandidateId = candidateId;
  document.querySelector('[data-dashboard-screen]').hidden = true;
  document.querySelector('[data-resume-info-screen]').hidden = false;
  renderResumeInfo();
  document.querySelector('[data-back-to-logs-from-resume-info]').focus();
}

function closeResumeInfo() {
  state.selectedCandidateId = null;
  document.querySelector('[data-resume-info-screen]').hidden = true;
  document.querySelector('[data-dashboard-screen]').hidden = false;
  renderList();
  restoreDashboardFocus();
}

function finishResumeClose() {
  window.clearTimeout(resumeCloseTimer);
  if (!state.resumeClosing) return;

  state.resumeClosing = false;
  renderRecord();
  document.querySelector('[data-open-resume]').focus();
}

function closeResume() {
  if (!state.resumeOpen) return;

  state.resumeOpen = false;
  state.resumeClosing = true;
  renderRecord();
  document.querySelector('[data-toggle-recording]').focus();

  const drawer = document.querySelector('[data-resume-drawer]');
  drawer.addEventListener('transitionend', (event) => {
    if (event.propertyName === 'transform') finishResumeClose();
  }, { once: true });
  resumeCloseTimer = window.setTimeout(finishResumeClose, 300);
}

async function stopRecording(markComplete = false) {
  const candidateId = state.selectedCandidateId;
  const recordingSessionId = voiceSessionId;
  if (audioProcessor) audioProcessor.disconnect();
  if (audioContext) audioContext.close();
  if (audioWebSocket) audioWebSocket.close();
  recordingStream?.getTracks().forEach((track) => track.stop());
  audioProcessor = undefined;
  audioContext = undefined;
  audioWebSocket = undefined;
  recordingStream = undefined;
  audioFrameRemainder = new Float32Array(0);
  state.isRecording = false;
  state.hasRecording ||= markComplete;

  try {
    const response = await fetch(`http://${window.location.hostname}:8765/api/stop`, { method: 'POST' });
    if (!response.ok) throw new Error('The voice service could not stop.');

    const result = await response.json();
    const finalizedTranscript = transcriptTextForSession(result.transcript, recordingSessionId);
    if (finalizedTranscript && candidateId) {
      liveTranscriptText = finalizedTranscript;
      state.transcriptTextByCandidate[candidateId] = finalizedTranscript;
    }
  } catch {
    // The live EventSource may already have delivered transcript text; preserve it if stopping fails.
  } finally {
    if (eventSource) eventSource.close();
    eventSource = undefined;
    voiceSessionId = '';
  }
}

async function handleRecording() {
  const microphone = document.querySelector('[data-toggle-recording]');
  const status = document.querySelector('[data-recording-status]');

  if (state.isRecording || microphone.classList.contains('is-recording')) {
    await stopRecording(true);
    status.classList.remove('is-error');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.textContent = 'Recording complete. Save the transcript for later follow-up.';
    renderRecord();
    return;
  }

  try {
    if (!navigator.mediaDevices?.getUserMedia || !(window.AudioContext || window.webkitAudioContext)) {
      throw new Error('Recording is not supported by this browser.');
    }

    recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });
    const source = audioContext.createMediaStreamSource(recordingStream);
    audioWebSocket = new WebSocket(`ws://${window.location.hostname}:8765/api/stream`);

    const startResponse = await fetch(`http://${window.location.hostname}:8765/api/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: 'web', record: false }),
    });
    if (!startResponse.ok) throw new Error('The voice service could not start.');
    const startResult = await startResponse.json();
    voiceSessionId = startResult.session_id ?? '';

    audioProcessor = audioContext.createScriptProcessor(4096, 1, 1);
    audioProcessor.onaudioprocess = (event) => {
      if (audioWebSocket?.readyState !== WebSocket.OPEN) return;

      const framedAudio = frameAudioSamples(event.inputBuffer.getChannelData(0), audioFrameRemainder);
      audioFrameRemainder = framedAudio.remainder;
      framedAudio.frames.forEach((frame) => audioWebSocket.send(frame.buffer));
    };

    source.connect(audioProcessor);
    audioProcessor.connect(audioContext.destination);

    eventSource = new EventSource(`http://${window.location.hostname}:8765/api/events`);
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type !== 'transcript') return;

      liveTranscriptText = appendLiveTranscript(liveTranscriptText, data.text);
      state.transcriptTextByCandidate[state.selectedCandidateId] = liveTranscriptText;
      document.querySelector('[data-transcript-body]').textContent = liveTranscriptText;
    };

    state.isRecording = toggleRecording(false);
    status.classList.remove('is-error');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.textContent = 'Recording started. Streaming to local AI model...';
    renderRecord();
  } catch (error) {
    stopRecording();
    status.classList.add('is-error');
    status.setAttribute('role', 'alert');
    status.setAttribute('aria-live', 'assertive');
    status.textContent = error.message === 'Recording is not supported by this browser.'
      ? error.message
      : error.message === 'The voice service could not start.'
        ? 'The voice service is unavailable. Start it and try recording again.'
        : error.name === 'NotAllowedError' || error.name === 'SecurityError'
          ? 'Microphone permission is blocked. Allow microphone access in your browser settings, then try again.'
          : 'Recording could not start. Check microphone access and the voice service, then try again.';
  }
}

async function applyCustomFilter(query, control, input) {
  if (state.filters.some((filter) => filter.label.toLocaleLowerCase() === query.toLocaleLowerCase())) {
    setFilterStatus(`“${query}” is already active.`);
    document.querySelector('[data-filter-input]').focus();
    return;
  }

  control.disabled = true;
  setFilterStatus(`Finding resume evidence for “${query}”…`);
  try {
    const response = await fetch('/api/filter-query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? 'Could not apply this filter.');
    state.filters.push({ label: query, ids: payload.ids ?? [] });
    state.customFilterOptions = addCustomFilterOption(state.customFilterOptions, query);
    const persisted = persistCustomFilters();
    if (input) input.value = '';
    setFilterStatus(persisted
      ? `Added “${query}” and saved it to your filters.`
      : `Added “${query}”, but this browser could not save it for later.`, !persisted);
    renderList();
    document.querySelector('[data-filter-input]').focus();
  } catch (error) {
    setFilterStatus(error.message || 'Could not apply this filter.', true);
  } finally {
    control.disabled = false;
  }
}

function startDashboard() {
  state.customFilterOptions = readCustomFilters();
  document.querySelector('[data-toggle-recording]').addEventListener('click', handleRecording);
  document.querySelector('[data-job-title]').addEventListener('change', (event) => {
    state.roleFilter = getJobTitleFilter(event.currentTarget.value, state.filterOptions, state.tagsByCandidate);
    renderList();
  });
  document.querySelector('[data-filter-input]').addEventListener('input', (event) => {
    event.currentTarget.removeAttribute('aria-invalid');
    if (document.querySelector('[data-filter-status]').classList.contains('is-error')) setFilterStatus('');
  });
  const emailDialog = document.querySelector('[data-email-dialog]');
  emailDialog.querySelector('[data-email-close]').addEventListener('click', () => emailDialog.close());
  emailDialog.querySelector('[data-connect-gmail]').addEventListener('click', connectGmail);
  emailDialog.querySelector('[data-email-form]').addEventListener('submit', sendCandidateEmail);
  emailDialog.addEventListener('close', () => {
    document.body.classList.remove('email-dialog-open');
    const candidateId = emailCandidate?.id;
    const outcome = emailOutcome;
    emailCandidate = undefined;
    emailOutcome = undefined;
    emailReplyContext = null;
    [...document.querySelectorAll('[data-candidate-status]')]
      .find((button) => button.dataset.candidateId === candidateId && button.dataset.candidateStatus === outcome)?.focus();
  });

  document.querySelector('[data-filter-form]').addEventListener('submit', (event) => {
    event.preventDefault();
    const input = document.querySelector('[data-filter-input]');
    const button = document.querySelector('[data-filter-submit]');
    const query = input.value.trim();
    if (!query) {
      setFilterStatus('Enter a skill or experience to filter by.', true);
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return;
    }
    input.removeAttribute('aria-invalid');
    applyCustomFilter(query, button, input);
  });

  document.addEventListener('click', (event) => {
    const customButton = event.target.closest('[data-add-custom-filter]');
    if (customButton) {
      applyCustomFilter(customButton.dataset.addCustomFilter, customButton);
      return;
    }

    const tagButton = event.target.closest('[data-add-tag]');
    if (tagButton) {
      const tag = tagButton.dataset.addTag;
      if (state.roleFilter?.tags.includes(tag)) {
        setFilterStatus(`“${tag}” is already included in the ${state.roleFilter.label} job title match.`);
        return;
      }
      if (!state.filters.some((filter) => filter.tag === tag)) {
        const ids = Object.entries(state.tagsByCandidate).filter(([, tags]) => tags.includes(tag)).map(([id]) => id);
        state.filters.push({ label: tag, tag, ids });
        setFilterStatus(`Added “${tag}” based on resume tags.`);
        renderList();
        document.querySelector('[data-filter-input]').focus();
      }
      return;
    }

    const removeFilterButton = event.target.closest('[data-remove-filter]');
    if (removeFilterButton) {
      state.filters.splice(Number(removeFilterButton.dataset.removeFilter), 1);
      renderList();
      document.querySelector('[data-filter-input]').focus();
      return;
    }

    if (event.target.closest('[data-remove-role]')) {
      state.roleFilter = null;
      renderList();
      document.querySelector('[data-job-title]').focus();
      return;
    }

    if (event.target.closest('[data-clear-filters]')) {
      state.filters = [];
      state.roleFilter = null;
      renderList();
      document.querySelector('[data-filter-input]').focus();
      return;
    }

    const viewButton = event.target.closest('[data-view]');
    const saveButton = event.target.closest('[data-save]');
    const recordButton = event.target.closest('[data-record]');
    const transcriptButton = event.target.closest('[data-view-transcript]');
    const resumeInfoButton = event.target.closest('[data-view-resume]');
    const candidateStatusButton = event.target.closest('[data-candidate-status]');

    if (viewButton) {
      state.activeView = viewButton.dataset.view;
      renderList();
      return;
    }

    if (saveButton) {
      const id = saveButton.dataset.save;
      state.savedIds = state.activeView === 'saved'
        ? state.savedIds.filter((savedId) => savedId !== id)
        : saveCheckIn(state, id).savedIds;
      const candidateName = checkIns.find((log) => log.id === id)?.name ?? 'Candidate';
      setDataStatus(state.activeView === 'saved' ? `${candidateName} removed from Saved.` : `${candidateName} saved for follow-up.`);
      renderList();
      document.querySelector('[data-view="saved"]').focus();
      return;
    }

    if (recordButton) {
      rememberDashboardFocus('record', recordButton.dataset.record);
      openRecord(recordButton.dataset.record);
      return;
    }

    if (transcriptButton) {
      rememberDashboardFocus('transcript', transcriptButton.dataset.viewTranscript);
      openTranscript(transcriptButton.dataset.viewTranscript);
      return;
    }

    if (resumeInfoButton) {
      rememberDashboardFocus('resume', resumeInfoButton.dataset.viewResume);
      openResumeInfo(resumeInfoButton.dataset.viewResume);
      return;
    }

    if (candidateStatusButton) {
      const candidate = checkIns.find((log) => log.id === candidateStatusButton.dataset.candidateId);
      const status = candidateStatusButton.dataset.candidateStatus;
      if (!candidate) return;
      state.candidateStatuses = updateCandidateStatus(
        state,
        candidateStatusButton.dataset.candidateId,
        status,
      ).candidateStatuses;
      setDataStatus(`${candidate.name} marked ${status === 'continue' ? 'to continue' : status === 'waitlist' ? 'waitlisted' : 'declined'}. Email composer opened.`);
      renderList();
      openEmailDialog(candidate, status);
      return;
    }

    if (event.target.closest('[data-return-to-logs]')) {
      state.activeView = 'logs';
      renderList();
      return;
    }

    if (event.target.closest('[data-back-to-logs]')) {
      closeRecord();
      return;
    }

    if (event.target.closest('[data-back-to-logs-from-transcript]')) {
      closeTranscript();
      return;
    }

    if (event.target.closest('[data-back-to-logs-from-resume-info]')) {
      closeResumeInfo();
      return;
    }

    if (event.target.closest('[data-open-resume]')) {
      state.resumeOpen = true;
      renderRecord();
      document.querySelector('[data-close-resume]').focus();
      return;
    }

    if (event.target.closest('[data-close-resume]')) {
      closeResume();
      return;
    }

    if (event.target.closest('[data-save-transcript]')) {
      const transcriptState = saveTranscript(state, state.selectedCandidateId);
      state.savedIds = transcriptState.savedIds;
      state.transcriptIds = transcriptState.transcriptIds;
      state.transcriptSaved = true;
      document.querySelector('[data-recording-status]').textContent = 'Transcript saved to Saved candidates.';
      document.querySelector('[data-recording-status]').classList.remove('is-error');
      renderRecord();
      document.querySelector('[data-toggle-recording]').focus();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (emailDialog.open) return;

    if (state.resumeOpen) {
      closeResume();
    } else if (!document.querySelector('[data-record-screen]').hidden) {
      closeRecord();
    } else if (!document.querySelector('[data-transcript-screen]').hidden) {
      closeTranscript();
    } else if (!document.querySelector('[data-resume-info-screen]').hidden) {
      closeResumeInfo();
    }
  });

  fetchCandidates()
    .then(({ candidates, source }) => {
      checkIns = candidates;
      state.dataSource = source ?? 'live';
      setDataStatus(source === 'demo'
        ? 'Showing demo check-ins while live candidate data is unavailable.'
        : source === 'cache'
          ? 'Showing the most recently loaded candidate data.'
          : 'Live candidate data loaded.', source !== 'live');
      renderList();
      loadFilterOptions();
    })
    .catch(() => {
      checkIns = [];
      setDataStatus('Unable to load the candidate logs. Please refresh and try again.', true);
      renderList();
    });
}

if (typeof document !== 'undefined') startDashboard();
