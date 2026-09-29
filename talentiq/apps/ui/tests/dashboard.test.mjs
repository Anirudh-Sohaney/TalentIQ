import assert from 'node:assert/strict';
import test from 'node:test';

import * as dashboard from '../app.js';
const { appendLiveTranscript, excludeNonCandidateLogs, frameAudioSamples, getCandidateResume, getLogsForView, getRecordScreenLayout, getRecordingControls, renderFollowUpQuestions, renderResumeMarkdown, saveCheckIn, saveTranscript, sortCheckInsByTime, toCandidateLog, toggleRecording, transcriptTextForSession, updateCandidateStatus } = dashboard;
import { extractPublicSupabaseConfig } from '../server-utils.js';
import { loadFallbackCandidates } from '../fallback-candidates.mjs';

const logs = [
  { id: 'ava-patel', name: 'Ava Patel' },
  { id: 'marcus-lee', name: 'Marcus Lee' },
];

test('local demo data keeps all 15 check-ins available during a live data outage', async () => {
  const candidates = await loadFallbackCandidates();

  assert.equal(candidates.length, 15);
  assert.equal(new Set(candidates.map((candidate) => candidate.id)).size, 15);
  assert.ok(candidates.every((candidate) => candidate.name && candidate.resume_content));
  assert.ok(candidates.every((candidate) => !['Vaman Agarwal', 'Science Fair Document'].includes(candidate.name)));
});

test('the check-in list excludes the Vaman and Science Fair data rows', () => {
  const visible = excludeNonCandidateLogs([
    ...logs,
    { id: '71932106-cc0c-4ec9-ad8f-3bef81ab1844', name: 'Vaman Agarwal' },
    { id: '44444444-4444-4444-4444-444444444444', name: 'Science Fair Document' },
  ]);

  assert.deepEqual(visible.map((log) => log.name), ['Ava Patel', 'Marcus Lee']);
});

test('saving a check-in makes only that attendee appear in Saved', () => {
  const state = saveCheckIn({ savedIds: [] }, 'marcus-lee');

  assert.deepEqual(state.savedIds, ['marcus-lee']);
  assert.deepEqual(
    getLogsForView(logs, state, 'saved').map((log) => log.id),
    ['marcus-lee'],
  );
});

test('saving an already-saved check-in does not create a duplicate', () => {
  const state = saveCheckIn({ savedIds: ['ava-patel'] }, 'ava-patel');

  assert.deepEqual(state.savedIds, ['ava-patel']);
});

test('the Logs view excludes attendees that have been saved', () => {
  const visibleLogs = getLogsForView(logs, { savedIds: ['ava-patel'] }, 'logs');

  assert.deepEqual(visibleLogs.map((log) => log.id), ['marcus-lee']);
});

test('recruiter filters narrow either list and combine as AND conditions', () => {
  const candidates = [
    { id: 'ava-patel', name: 'Ava Patel' },
    { id: 'marcus-lee', name: 'Marcus Lee' },
    { id: 'sofia-ramirez', name: 'Sofia Ramirez' },
  ];
  const filters = [
    { label: 'Python', ids: ['ava-patel', 'marcus-lee'] },
    { label: 'API projects', ids: ['ava-patel', 'sofia-ramirez'] },
  ];

  assert.deepEqual(dashboard.filterLogsBySelections(candidates, filters).map(({ id }) => id), ['ava-patel']);
  assert.deepEqual(dashboard.filterLogsBySelections(candidates, []).map(({ id }) => id), candidates.map(({ id }) => id));
});

test('the result count identifies filtered matches instead of calling them check-ins', () => {
  assert.equal(dashboard.countCaption([]), 'checked in');
  assert.equal(dashboard.countCaption([{ label: 'Python', ids: ['ava-patel'] }]), 'matching filters');
});

test('a Supabase candidate row maps to a dashboard check-in without losing its resume', () => {
  const candidate = toCandidateLog({
    id: 'ava-patel',
    name: 'Ava Patel',
    initials: 'AP',
    checkin_time: '9:03 AM',
    university: 'University of Arkansas',
    major: 'Computer Science',
    resume_content: '# Resume: Ava Patel\n\n## Education\n- B.S. Computer Science',
  });

  assert.deepEqual(candidate, {
    id: 'ava-patel',
    name: 'Ava Patel',
    initials: 'AP',
    time: '9:03 AM',
    university: 'University of Arkansas',
    major: 'Computer Science',
    resume: '# Resume: Ava Patel\n\n## Education\n- B.S. Computer Science',
    shortResume: undefined,
    followUpQuestions: undefined,
    email: '',
  });
});

test('a Supabase candidate row carries its AI-generated follow-up questions', () => {
  const candidate = toCandidateLog({
    id: 'ava-patel',
    name: 'Ava Patel',
    checkin_time: '9:03 AM',
    resume_content: 'Resume',
    follow_up_questions: ['What projects have you led?', 'How do you approach debugging?'],
  });

  assert.deepEqual(candidate.followUpQuestions, ['What projects have you led?', 'How do you approach debugging?']);
});

test('candidate email is found when the stored resume has escaped newlines', () => {
  const candidate = toCandidateLog({
    id: 'ava-patel',
    name: 'Ava Patel',
    resume_content: String.raw`# Ava Patel\n\n**Email**: ava-patel@example.com | **Phone**: (555) 123-4567`,
  });

  assert.equal(candidate.email, 'ava-patel@example.com');
});

test('follow-up questions render below resume content and missing or empty data adds no markup', () => {
  const questions = renderFollowUpQuestions(['What <b>interests</b> you?', '']);

  assert.match(questions, /AI-generated follow-up questions/);
  assert.match(questions, /<li>What &lt;b&gt;interests&lt;\/b&gt; you\?<\/li>/);
  assert.doesNotMatch(questions, /<b>/);
  assert.equal(renderFollowUpQuestions(undefined), '');
  assert.equal(renderFollowUpQuestions([]), '');
  assert.equal(renderFollowUpQuestions(['', '  ']), '');
});

test('follow-up questions render from the Markdown string returned by the backend', () => {
  const questions = renderFollowUpQuestions('- What project are you proudest of?\n- How did you measure its impact?');

  assert.match(questions, /<li>What project are you proudest of\?<\/li>/);
  assert.match(questions, /<li>How did you measure its impact\?<\/li>/);
});

test('resume rendering creates readable headings and escapes unsafe markup', () => {
  const html = renderResumeMarkdown('# Resume: Ava Patel\n\n## Education\n- <script>alert(1)</script>');

  assert.match(html, /<h1>Resume: Ava Patel<\/h1>/);
  assert.match(html, /<h2>Education<\/h2>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test('resume rendering normalizes escaped newlines and preserves resume Markdown structure', () => {
  const markdown = String.raw`# Marcus Lee\n\n**Email**: marcus-lee@example.com\n\n---\n\n## EDUCATION\n**Oklahoma State University**\n*Bachelor of Science in Supply Chain Management*\n- GPA: 3.8/4.0`;
  const html = renderResumeMarkdown(markdown);

  assert.match(html, /<h1>Marcus Lee<\/h1>/);
  assert.match(html, /<strong>Email<\/strong>: marcus-lee@example.com/);
  assert.match(html, /<hr>/);
  assert.match(html, /<h2>EDUCATION<\/h2>/);
  assert.match(html, /<em>Bachelor of Science in Supply Chain Management<\/em>/);
  assert.match(html, /<li>GPA: 3\.8\/4\.0<\/li>/);
  assert.doesNotMatch(html, /\\n/);
});

test('public Supabase configuration is read without accepting a service key', () => {
  const config = extractPublicSupabaseConfig(`
    const url = 'https://example-project.supabase.co';
    const anonKey = 'sb_publishable_123';
    const serviceRole = 'do-not-use';
  `);

  assert.deepEqual(config, {
    url: 'https://example-project.supabase.co',
    anonKey: 'sb_publishable_123',
  });
});

test('check-in logs are ordered chronologically when Supabase returns text times', () => {
  const sorted = sortCheckInsByTime([
    { id: 'late', time: '10:07 AM' },
    { id: 'early', time: '9:03 AM' },
    { id: 'noon', time: '12:02 PM' },
  ]);

  assert.deepEqual(sorted.map((log) => log.id), ['early', 'late', 'noon']);
});

test('the microphone control toggles its recording state', () => {
  assert.equal(toggleRecording(false), true);
  assert.equal(toggleRecording(true), false);
});

test('recording controls show the waveform only while recording and offer transcript save when finished', () => {
  assert.deepEqual(getRecordingControls(true, false, false), { showWaveform: true, showTranscriptSave: false });
  assert.deepEqual(getRecordingControls(false, true, false), { showWaveform: false, showTranscriptSave: true });
  assert.deepEqual(getRecordingControls(false, true, true), { showWaveform: false, showTranscriptSave: true });
});

test('saving a transcript keeps the candidate in Logs and marks its transcript as available', () => {
  const state = saveTranscript({ savedIds: [], transcriptIds: [] }, 'ava-patel');

  assert.deepEqual(state.savedIds, []);
  assert.deepEqual(state.transcriptIds, ['ava-patel']);
  assert.deepEqual(getLogsForView(logs, state, 'logs').map((log) => log.id), ['ava-patel', 'marcus-lee']);
});

test('a saved candidate can be assigned one recruitment outcome', () => {
  const state = updateCandidateStatus({ candidateStatuses: {} }, 'ava-patel', 'waitlist');

  assert.deepEqual(state.candidateStatuses, { 'ava-patel': 'waitlist' });
});

test('live transcript chunks are accumulated as readable transcript text', () => {
  assert.equal(appendLiveTranscript('', 'Hello'), 'Hello');
  assert.equal(appendLiveTranscript('Hello', 'world'), 'Hello world');
});

test('the saved transcript uses only finalized ASR entries from its recording session', () => {
  const transcript = transcriptTextForSession([
    { session_id: 'previous', kind: 'final', text: 'Do not include this.' },
    { session_id: 'current', kind: 'partial', text: 'Do not include this either.' },
    { session_id: 'current', kind: 'final', text: 'First finalized sentence.' },
    { session_id: 'current', kind: 'final', text: 'Second finalized sentence.' },
  ], 'current');

  assert.equal(transcript, 'First finalized sentence. Second finalized sentence.');
});

test('browser audio is framed into the 480-sample blocks RNNoise requires', () => {
  const samples = new Float32Array(1_000).map((_, index) => index);
  const { frames, remainder } = frameAudioSamples(samples);

  assert.equal(frames.length, 2);
  assert.equal(frames[0].length, 480);
  assert.equal(frames[0][479], 479);
  assert.equal(frames[1][0], 480);
  assert.equal(remainder.length, 40);
  assert.equal(remainder[0], 960);
});

test('opening a resume switches the record screen into focused document mode', () => {
  assert.deepEqual(getRecordScreenLayout(true), { hideSidebar: true, dockMicrophone: true, showResumeTab: false });
  assert.deepEqual(getRecordScreenLayout(false), { hideSidebar: false, dockMicrophone: false, showResumeTab: true });
  assert.deepEqual(getRecordScreenLayout(false, true), { hideSidebar: true, dockMicrophone: true, showResumeTab: false });
});

test('the log info view resolves the selected candidate’s raw resume', () => {
  const resume = getCandidateResume([
    { id: 'ava-patel', resume: '# Ava Patel' },
    { id: 'marcus-lee', resume: '# Marcus Lee' },
  ], 'marcus-lee');

  assert.equal(resume, '# Marcus Lee');
});
