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

test('filter completions request the DeepSeek JSON-capable model', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENROUTER_KEY;
  let request;
  process.env.OPENROUTER_KEY = 'test-key';
  globalThis.fetch = async (_url, options) => {
    request = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"candidate_ids":["ava"]}' } }] }),
    };
  };

  try {
    assert.deepEqual(await filtering.completeFilterJson('Find Python candidates'), { candidate_ids: ['ava'] });
    assert.equal(request.model, 'deepseek/deepseek-v4.1-flash');
    assert.deepEqual(request.response_format, { type: 'json_object' });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENROUTER_KEY;
    else process.env.OPENROUTER_KEY = originalKey;
  }
});
