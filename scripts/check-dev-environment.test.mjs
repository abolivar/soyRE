import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { getDevEnvironmentProblems } from './check-dev-environment.mjs';

test('acepta un workspace sin store local de pnpm', async () => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'soyre-dev-check-'));

  try {
    assert.deepEqual(getDevEnvironmentProblems(workspaceRoot), []);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test('rechaza un store de pnpm dentro del workspace', async () => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'soyre-dev-check-'));

  try {
    await mkdir(path.join(workspaceRoot, '.pnpm-store'));

    const problems = getDevEnvironmentProblems(workspaceRoot);

    assert.equal(problems.length, 1);
    assert.match(problems[0], /Turbopack/);
    assert.match(problems[0], /\.pnpm-store/);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
