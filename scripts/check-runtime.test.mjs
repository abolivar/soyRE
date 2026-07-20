import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EXPECTED_PNPM_VERSION,
  getRuntimeProblems,
  parseNodeVersion,
  runRuntimeCheck,
} from './check-runtime.mjs';

test('interpreta versiones de Node con o sin prefijo v', () => {
  assert.deepEqual(parseNodeVersion('v22.22.2'), {
    major: 22,
    minor: 22,
    patch: 2,
  });
  assert.deepEqual(parseNodeVersion('22.23.0'), {
    major: 22,
    minor: 23,
    patch: 0,
  });
  assert.equal(parseNodeVersion('desconocida'), undefined);
});

test('acepta cualquier patch soportado de Node 22 y pnpm exacto', () => {
  assert.deepEqual(
    getRuntimeProblems({
      nodeVersion: 'v22.23.0',
      pnpmVersion: EXPECTED_PNPM_VERSION,
    }),
    [],
  );
});

test('rechaza un major de Node distinto de 22', () => {
  const problems = getRuntimeProblems({
    nodeVersion: 'v25.9.0',
    pnpmVersion: EXPECTED_PNPM_VERSION,
  });

  assert.equal(problems.length, 1);
  assert.match(problems[0], /Node 22\.x/);
  assert.match(problems[0], /nvm use/);
});

test('rechaza una version diferente de pnpm', () => {
  const problems = getRuntimeProblems({
    nodeVersion: 'v22.22.2',
    pnpmVersion: '9.15.0',
  });

  assert.equal(problems.length, 1);
  assert.match(problems[0], /pnpm 10\.33\.2/);
  assert.match(problems[0], /Corepack/);
});

test('el chequeo devuelve error cuando el contrato no se cumple', () => {
  const originalConsoleError = console.error;
  const messages = [];
  console.error = (message) => messages.push(message);

  try {
    assert.equal(
      runRuntimeCheck({
        nodeVersion: 'v26.1.0',
        pnpmVersion: null,
        nodeExecutable: '/usr/local/bin/node',
      }),
      1,
    );
    assert.equal(messages.length, 3);
    assert.match(messages.at(-1), /\/usr\/local\/bin\/node/);
  } finally {
    console.error = originalConsoleError;
  }
});
