import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractPublicSupabaseConfig } from './server-utils.js';
import { loadFallbackCandidates } from './fallback-candidates.mjs';

const rootDirectory = fileURLToPath(new URL('.', import.meta.url));
const backendConfigPath = fileURLToPath(new URL('../backend/test_anon.js', import.meta.url));
const port = Number(process.env.PORT ?? 4173);
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
};
let lastGoodCandidates;

async function getSupabaseConfig() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    return { url: process.env.SUPABASE_URL, anonKey: process.env.SUPABASE_ANON_KEY };
  }

  return extractPublicSupabaseConfig(await readFile(backendConfigPath, 'utf8'));
}

async function loadCandidates() {
  const { url, anonKey } = await getSupabaseConfig();
  const query = new URL('/rest/v1/candidates', url);
  query.searchParams.set('select', 'id,name,initials,checkin_time,university,major,resume_content,short_resume_content,follow_up_questions');
  query.searchParams.set('order', 'checkin_time.asc');

  const response = await fetch(query, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });

  if (!response.ok) throw new Error(`Supabase returned ${response.status}`);
  const candidates = await response.json();
  if (!Array.isArray(candidates)) throw new Error('Supabase returned invalid candidate data');
  lastGoodCandidates = candidates;
  return candidates;
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
