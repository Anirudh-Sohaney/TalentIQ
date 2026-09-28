const gmailApi = 'https://gmail.googleapis.com/gmail/v1/users/me';

function encodeBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeBase64Url(value) {
  if (!value) return '';
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

function matchingReplyContext(subject, context) {
  return context?.threadId && context.subject === subject && /^<[^<>\r\n]+>$/.test(context.messageId ?? '')
    ? context
    : null;
}

export function encodeGmailMessage({ to, subject, body }, replyContext) {
  if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(to ?? '') ||
      typeof subject !== 'string' || !subject.trim() || /[\r\n]/.test(subject)) {
    throw new Error('A valid recipient and subject are required.');
  }

  const encodedSubject = encodeBase64Url(subject).replace(/-/g, '+').replace(/_/g, '/');
  const safeSubject = /[^\x20-\x7e]/.test(subject)
    ? `=?UTF-8?B?${encodedSubject.padEnd(Math.ceil(encodedSubject.length / 4) * 4, '=')}?=`
    : subject;
  const normalizedBody = String(body ?? '').replace(/\r?\n/g, '\r\n');
  const reply = matchingReplyContext(subject, replyContext);
  const replyHeaders = reply ? `In-Reply-To: ${reply.messageId}\r\nReferences: ${reply.messageId}\r\n` : '';
  const mime = `To: ${to}\r\nSubject: ${safeSubject}\r\n${replyHeaders}MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n${normalizedBody}`;
  return encodeBase64Url(mime);
}

function plainTextPart(payload) {
  if (!payload) return '';
  if ((!payload.mimeType || payload.mimeType === 'text/plain') && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  for (const part of payload.parts ?? []) {
    const text = plainTextPart(part);
    if (text) return text;
  }
  return '';
}

export function parseGmailThread(thread) {
  return (thread.messages ?? []).map((message) => {
    const headers = new Map((message.payload?.headers ?? [])
      .map(({ name, value }) => [name.toLowerCase(), value]));
    return {
      id: message.id,
      from: headers.get('from') ?? '',
      subject: headers.get('subject') ?? '',
      date: headers.get('date') ?? '',
      body: plainTextPart(message.payload) || message.snippet || '',
    };
  });
}

async function gmailRequest(accessToken, path, options = {}) {
  const response = await fetch(`${gmailApi}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error?.message || 'Gmail could not complete the request.');
    error.status = response.status;
    throw error;
  }
  return result;
}

export async function getGmailThread(accessToken, email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email ?? '')) return { messages: [], replyContext: null };
  const query = new URLSearchParams({ q: `from:${email} OR to:${email}`, maxResults: '10' });
  const matches = await gmailRequest(accessToken, `/messages?${query}`);
  if (!matches.messages?.length) return { messages: [], replyContext: null };
  const threadId = matches.messages[0].threadId;
  const thread = await gmailRequest(accessToken, `/threads/${encodeURIComponent(threadId)}?format=full`);
  const lastHeaders = new Map((thread.messages?.at(-1)?.payload?.headers ?? [])
    .map(({ name, value }) => [name.toLowerCase(), value]));
  return {
    messages: parseGmailThread(thread),
    replyContext: {
      threadId,
      subject: lastHeaders.get('subject') ?? '',
      messageId: lastHeaders.get('message-id') ?? '',
    },
  };
}

export async function sendGmailMessage(accessToken, draft, replyContext) {
  const reply = matchingReplyContext(draft.subject, replyContext);
  return gmailRequest(accessToken, '/messages/send', {
    method: 'POST',
    body: JSON.stringify({ raw: encodeGmailMessage(draft, reply), ...(reply ? { threadId: reply.threadId } : {}) }),
  });
}
