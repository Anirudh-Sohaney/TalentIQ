import assert from 'node:assert/strict';
import test from 'node:test';

const filtering = await import('../candidate-filtering.mjs');

const candidates = [
  { id: 'ava', name: 'Ava', resume_content: 'Built Python APIs.' },
  { id: 'lee', name: 'Lee', resume_content: 'Designed Java services.' },
];

test('resume extraction keeps only supported tags tied to known candidates', async () => {
  const tags = await filtering.extractTagsFromResumes(candidates, async () => ({
    candidates: [
      { id: 'ava', tags: ['Python', 'API development', 'Python', 'Made-up skill'] },
      { id: 'lee', tags: ['Java'] },
      { id: 'unknown', tags: ['Python'] },
    ],
  }));

  assert.deepEqual(tags, { ava: ['Python', 'API development'], lee: ['Java'] });
});

test('generated filter options count candidates once per tag', () => {
  assert.deepEqual(filtering.getFilterOptions({ ava: ['Python', 'API development'], lee: ['Python'] }), [
    { tag: 'Python', count: 2 },
    { tag: 'API development', count: 1 },
  ]);
});

test('free-form recruiter intent returns only known candidate ids', async () => {
  const result = await filtering.matchCandidatesToIntent(candidates, 'people with Python API work', async () => ({
    candidate_ids: ['ava', 'unknown', 'ava'],
  }));

  assert.deepEqual(result, ['ava']);
});

test('empty recruiter intent is rejected before calling the model', async () => {
  await assert.rejects(
    filtering.matchCandidatesToIntent(candidates, '   ', async () => { throw new Error('should not call model'); }),
    /Enter a filter/,
  );
});
