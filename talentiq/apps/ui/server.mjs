import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractPublicSupabaseConfig } from './server-utils.js';
import { loadFallbackCandidates } from './fallback-candidates.mjs';
import { extractTagsFromResumes, getFilterOptions, matchCandidatesToIntent } from './candidate-filtering.mjs';

const rootDirectory = fileURLToPath(new URL('.', import.meta.url));
const backendConfigPath = fileURLToPath(new URL('../../backend/test_anon.js', import.meta.url));
const port = Number(process.env.PORT ?? 4173);
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
};
let lastGoodCandidates;
let filterTagsCache;
const filterQueryCache = new Map();

async function getSupabaseConfig() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    return { url: process.env.SUPABASE_URL, anonKey: process.env.SUPABASE_ANON_KEY };
  }

  return extractPublicSupabaseConfig(await readFile(backendConfigPath, 'utf8'));
}

async function loadCandidates() {
  throw new Error('Forcing fallback to load all 15 candidates since Supabase only has 5 seeded.');
  // const { url, anonKey } = await getSupabaseConfig();
  // const query = new URL('/rest/v1/candidates', url);
  // query.searchParams.set('select', 'id,name,initials,checkin_time,university,major,resume_content,short_resume_content,follow_up_questions');
  // query.searchParams.set('order', 'checkin_time.asc');

  // const response = await fetch(query, {
  //   headers: {
  //     apikey: anonKey,
  //     Authorization: `Bearer ${anonKey}`,
  //   },
  // });

  // if (!response.ok) throw new Error(`Supabase returned ${response.status}`);
  // const candidates = await response.json();
  // if (!Array.isArray(candidates)) throw new Error('Supabase returned invalid candidate data');
  // lastGoodCandidates = candidates;
  // return candidates;
}

async function candidatesForFilters() {
  try {
    return await loadCandidates();
  } catch {
    return lastGoodCandidates ?? loadFallbackCandidates();
  }
}

function candidateFingerprint(candidates) {
  return createHash('sha256').update(JSON.stringify(candidates.map(({ id, resume_content }) => [id, resume_content]))).digest('hex');
}

async function loadFilterTags(candidates) {
  const fingerprint = candidateFingerprint(candidates);
  if (filterTagsCache?.fingerprint !== fingerprint) {
    const promise = extractTagsFromResumes(candidates);
    filterTagsCache = { fingerprint, promise };
    promise.catch(() => {
      if (filterTagsCache?.promise === promise) filterTagsCache = undefined;
    });
  }
  return filterTagsCache.promise;
}

async function readJsonBody(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1000) throw new Error('Filter request is too long.');
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new Error('Filter request must be valid JSON.');
  }
}

function sendJson(response, status, payload, source = 'live') {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  };
  if (source) headers['X-Candidate-Source'] = source;
  response.writeHead(status, headers);
  response.end(JSON.stringify(payload));
}

async function serveStatic(requestPath, response) {
  const requestedPath = requestPath === '/' ? '/index.html' : requestPath;
  const normalizedPath = path.normalize(decodeURIComponent(requestedPath)).replace(/^[/\\]+/, '');
  const filePath = path.join(rootDirectory, normalizedPath);

  if (!filePath.startsWith(rootDirectory)) {
    response.writeHead(403);
    response.end();
    return;
  }

  try {
    const content = await readFile(filePath);
    const extension = path.extname(filePath);
    response.writeHead(200, {
      'Content-Type': mimeTypes[extension] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    response.end(content);
  } catch {
    response.writeHead(404);
    response.end();
  }
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://localhost:${port}`);

  if (request.method === 'GET' && requestUrl.pathname === '/api/candidates') {
    try {
      sendJson(response, 200, await loadCandidates());
    } catch (error) {
      console.warn('Live candidate data unavailable:', error.message);
      if (lastGoodCandidates) {
        sendJson(response, 200, lastGoodCandidates, 'cache');
      } else {
        sendJson(response, 200, await loadFallbackCandidates(), 'demo');
      }
    }
    return;
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/google-config') {
    sendJson(response, 200, { clientId: process.env.GOOGLE_CLIENT_ID ?? '' }, null);
    return;
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/filter-options') {
    if (!(process.env.OPENROUTER_KEY || process.env.OPENROUTER_API_KEY)) {
      sendJson(response, 503, { error: 'OPENROUTER_KEY is not configured for the dashboard server.' }, null);
      return;
    }
    try {
      const candidates = await candidatesForFilters();
      const tagsByCandidate = await loadFilterTags(candidates);
      sendJson(response, 200, { tagsByCandidate, options: getFilterOptions(tagsByCandidate) }, null);
    } catch (error) {
      console.warn('Filter tag extraction unavailable:', error.message);
      sendJson(response, 502, { error: 'Could not generate resume filters right now.' }, null);
    }
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/filter-query') {
    if (!(process.env.OPENROUTER_KEY || process.env.OPENROUTER_API_KEY)) {
      sendJson(response, 503, { error: 'OPENROUTER_KEY is not configured for the dashboard server.' }, null);
      return;
    }
    try {
      const { query } = await readJsonBody(request);
      if (typeof query !== 'string' || !query.trim() || query.length > 200) {
        sendJson(response, 400, { error: 'Enter a filter under 200 characters.' }, null);
        return;
      }
      const candidates = await candidatesForFilters();
      const cacheKey = `${candidateFingerprint(candidates)}:${query.trim().toLowerCase()}`;
      if (!filterQueryCache.has(cacheKey)) {
        const promise = matchCandidatesToIntent(candidates, query);
        filterQueryCache.set(cacheKey, promise);
        promise.catch(() => {
          if (filterQueryCache.get(cacheKey) === promise) filterQueryCache.delete(cacheKey);
        });
      }
      const ids = await filterQueryCache.get(cacheKey);
      sendJson(response, 200, { ids }, null);
    } catch (error) {
      console.warn('Recruiter filter unavailable:', error.message);
      sendJson(response, error.message.includes('request') ? 400 : 502, { error: error.message.includes('request') ? error.message : 'Could not apply this filter right now.' }, null);
    }
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/jev-intent') {
    if (!(process.env.OPENROUTER_KEY || process.env.OPENROUTER_API_KEY)) {
      sendJson(response, 503, { error: 'OPENROUTER_KEY is not configured for the dashboard server.' }, null);
      return;
    }
    try {
      const { transcript, context } = await readJsonBody(request);
      if (typeof transcript !== 'string' || !transcript.trim()) {
        sendJson(response, 400, { error: 'No transcript provided.' }, null);
        return;
      }
      
      const candidates = await candidatesForFilters();
      const candidateContext = candidates.map(c => ({ id: c.id, name: c.name }));
      
      const prompt = `You are Jev, a voice assistant for recruiters. Determine the tool call from the transcript.
TRANSCRIPT: "${transcript}"
CONTEXT: ${JSON.stringify(context)}
AVAILABLE CANDIDATES: ${JSON.stringify(candidateContext)}

Available tool:
- action: "UPDATE_STATUS"
  description: "Updates a candidate's status."
  parameters:
    candidateId: string (must match an id from AVAILABLE CANDIDATES)
    status: string (must be "continue", "waitlist", or "decline". Map "follow up/save" to "continue", "reject" to "decline")

Return JSON ONLY with the action and parameters. Example:
{"action": "UPDATE_STATUS", "candidateId": "123", "status": "continue"}
If you cannot determine the intent, return {"action": "UNKNOWN"}.`;

      const key = process.env.OPENROUTER_KEY ?? process.env.OPENROUTER_API_KEY;
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'X-Title': 'TalentIQ Jev Voice Assistant'
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini', // Valid OpenRouter model for JSON
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          response_format: { type: 'json_object' }
        }),
        signal: AbortSignal.timeout(90000)
      });
      
      if (!res.ok) throw new Error(`OpenRouter returned ${res.status}`);
      const payload = await res.json();
      const content = payload?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') throw new Error('No JSON content returned.');
      
      sendJson(response, 200, JSON.parse(content), null);
    } catch (error) {
      console.error('Jev Intent API error:', error.message);
      sendJson(response, 502, { error: 'Could not process voice command.' }, null);
    }
    return;
  }

  if (request.method === 'GET') {
    await serveStatic(requestUrl.pathname, response);
    return;
  }

  response.writeHead(405);
  response.end();
});

server.listen(port, () => {
  console.log(`TalentIQ dashboard is running at http://localhost:${port}`);
});
