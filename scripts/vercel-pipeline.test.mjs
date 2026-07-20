import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

async function readJson(relativePath) {
  return JSON.parse(
    await readFile(path.join(workspaceRoot, relativePath), 'utf8'),
  );
}

test('conserva el proxy del API durante el build de Vercel', async () => {
  const [rootPackage, turbo, vercel] = await Promise.all([
    readJson('package.json'),
    readJson('turbo.json'),
    readJson('vercel.json'),
  ]);

  assert.ok(turbo.tasks.build.env.includes('API_PROXY_URL'));
  assert.ok(
    turbo.globalPassThroughEnv.includes('ENABLE_EXPERIMENTAL_COREPACK'),
  );
  assert.match(rootPackage.scripts['build:web'], /runtime:check/);
  assert.equal(vercel.buildCommand, 'pnpm build:web');
});
