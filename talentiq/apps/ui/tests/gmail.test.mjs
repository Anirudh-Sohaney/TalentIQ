import assert from 'node:assert/strict';
import test from 'node:test';

import { getGmailDraft } from '../app.js';
import { encodeGmailMessage, getGmailThread, parseGmailThread, sendGmailMessage } from '../gmail.js';

test('each candidate outcome opens a recipient-specific email draft', () => {
  const candidate = { name: 'Ava Patel', email: 'ava-patel@example.com' };

  for (const status of ['continue', 'waitlist', 'decline']) {
    const draft = getGmailDraft(candidate, status);
    assert.equal(draft.to, candidate.email);
    assert.match(draft.subject, /career fair|meeting/i);
    assert.match(draft.body, /Hi Ava Patel,/);
  }
  assert.equal(getGmailDraft(candidate, 'unknown'), null);
});

test('Gmail send payload contains a safe UTF-8 MIME message', () => {
  const raw = encodeGmailMessage({
    to: 'ava-patel@example.com',
    subject: 'Next steps after the career fair',
    body: 'Hi Ava,\n\nThanks for speaking with us.',
  });
  const mime = Buffer.from(raw, 'base64url').toString('utf8');

  assert.match(mime, /^To: ava-patel@example\.com\r\nSubject: Next steps after the career fair\r\n/);
  assert.match(mime, /\r\n\r\nHi Ava,\r\n\r\nThanks for speaking with us\./);
  assert.throws(() => encodeGmailMessage({ to: 'ava@example.com', subject: 'Hello\r\nBcc: someone@example.com', body: 'Hello' }));
});

test('non-ASCII subjects use a padded MIME encoded word', () => {
  const raw = encodeGmailMessage({ to: 'ava@example.com', subject: 'Résumé X', body: 'Hello' });
  const mime = Buffer.from(raw, 'base64url').toString('utf8');

  assert.match(mime, /Subject: =\?UTF-8\?B\?[A-Za-z0-9+/]+={0,2}\?=/);
  const encoded = mime.match(/Subject: =\?UTF-8\?B\?([^?]+)\?=/)[1];
  assert.equal(encoded.length % 4, 0);
  assert.equal(Buffer.from(encoded, 'base64').toString('utf8'), 'Résumé X');
});

test('Gmail thread text is decoded for display in the dashboard', () => {
  const body = Buffer.from('Thanks for reaching out.', 'utf8').toString('base64url');
  const messages = parseGmailThread({ messages: [{
    id: 'message-1',
    payload: {
      headers: [{ name: 'From', value: 'Ava Patel <ava-patel@example.com>' }, { name: 'Subject', value: 'Next steps' }],
      body: { data: body },
    },
  }] });

  assert.deepEqual(messages, [{ id: 'message-1', from: 'Ava Patel <ava-patel@example.com>', subject: 'Next steps', date: '', body: 'Thanks for reaching out.' }]);
});

test('Gmail API loads a candidate conversation and sends from the connected account', async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    if (url.includes('/messages?')) return Response.json({ messages: [{ threadId: 'thread-1' }] });
    if (url.includes('/threads/thread-1')) return Response.json({ id: 'thread-1', messages: [{ id: 'message-1', snippet: 'Previous note', payload: { headers: [{ name: 'Subject', value: 'Next steps' }, { name: 'Message-ID', value: '<previous@example.com>' }] } }] });
    return Response.json({ id: 'sent-1' });
  };

  try {
    const thread = await getGmailThread('access-token', 'ava@example.com');
    const sent = await sendGmailMessage('access-token', { to: 'ava@example.com', subject: 'Next steps', body: 'Hello' }, thread.replyContext);

    assert.equal(thread.messages[0].body, 'Previous note');
    assert.equal(sent.id, 'sent-1');
    assert.match(requests[0].url, /\/messages\?q=from%3Aava%40example\.com\+OR\+to%3Aava%40example\.com/);
    assert.match(requests[1].url, /\/threads\/thread-1\?format=full/);
    assert.match(requests[2].url, /\/messages\/send$/);
    assert.equal(requests[2].options.headers.Authorization, 'Bearer access-token');
    assert.equal(requests[2].options.method, 'POST');
    const outgoing = JSON.parse(requests[2].options.body);
    assert.equal(outgoing.threadId, 'thread-1');
    assert.match(Buffer.from(outgoing.raw, 'base64url').toString('utf8'), /In-Reply-To: <previous@example\.com>\r\nReferences: <previous@example\.com>/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
