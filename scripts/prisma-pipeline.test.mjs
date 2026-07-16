import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(workspaceRoot, relativePath), 'utf8'));
}

test('centraliza prisma generate en un unico nodo de Turbo', async () => {
  const [databasePackage, turbo] = await Promise.all([
    readJson('packages/database/package.json'),
    readJson('turbo.json'),
  ]);

  assert.equal(databasePackage.scripts['db:generate'], 'prisma generate');
  assert.doesNotMatch(databasePackage.scripts.build, /prisma generate/);
  assert.doesNotMatch(databasePackage.scripts.typecheck, /prisma generate/);

  assert.equal(turbo.tasks['db:generate'].cache, false);
  assert.ok(turbo.tasks['db:generate'].outputs.includes('src/generated/prisma/**'));
  assert.ok(turbo.tasks.build.dependsOn.includes('db:generate'));
  assert.ok(turbo.tasks.typecheck.dependsOn.includes('db:generate'));
});
