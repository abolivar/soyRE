import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { ensureApiServer, type ApiServer } from './helpers/api-server.ts';
import { assertStatus, requestJson } from './helpers/http.ts';

let server: ApiServer;

before(async () => {
  server = await ensureApiServer();
});

after(async () => {
  await server.stop();
});

test('API health endpoint is public and healthy', async () => {
  const response = await requestJson<{ ok: boolean; service: string }>(
    server.baseUrl,
    '/health',
  );

  assertStatus(response, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.service, 'soyre-api');
});

test('authenticated user endpoint rejects requests without a session', async () => {
  const response = await requestJson<{ statusCode: number }>(
    server.baseUrl,
    '/auth/me',
  );

  assertStatus(response, 401);
  assert.equal(response.body.statusCode, 401);
});
