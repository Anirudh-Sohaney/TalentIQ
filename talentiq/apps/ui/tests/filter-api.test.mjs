import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import test from 'node:test';

async function freePort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

test('filter API reports unavailable when the AI key is not configured', async () => {
  const port = await freePort();
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, PORT: String(port), OPENROUTER_KEY: '', OPENROUTER_API_KEY: '' },
    stdio: 'ignore',
  });
  try {
    let response;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      try {
        response = await fetch(`http://127.0.0.1:${port}/api/filter-options`);
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
    assert.ok(response, 'dashboard server did not start');
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /OPENROUTER_KEY/);
  } finally {
    child.kill();
  }
});
