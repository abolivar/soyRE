import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import test from 'node:test';
import { createPrismaClient, PropertyOperation } from '@soyre/database';
import { ensureApiServer } from '../helpers/api-server.ts';
import {
  cleanupMandateFixtures,
  createMandate,
  createMandateContext,
  registerFixtureOwner,
} from '../helpers/mandate-fixtures.ts';
import { assertStatus } from '../helpers/http.ts';

const enabled = process.env.MANDATE_WORKSPACE_E2E_MUTATING === 'true';

test(
  'validates the authenticated mandate workspace on desktop and mobile',
  { skip: !enabled, timeout: 360_000 },
  async () => {
    const marker = `e2e-workspace-${Date.now()}`;
    const desktopMarker = `${marker}-desktop`;
    const mobileMarker = `${marker}-mobile`;
    const api = await ensureApiServer();
    const prisma = createPrismaClient();

    try {
      const owner = await registerFixtureOwner(
        api.baseUrl,
        marker,
        'workspace',
      );
      for (const deviceMarker of [desktopMarker, mobileMarker]) {
        const context = await createMandateContext(
          prisma,
          owner,
          marker,
          deviceMarker,
          [PropertyOperation.SALE],
        );
        const created = await createMandate(
          api.baseUrl,
          owner,
          context,
          deviceMarker,
          { exclusive: true, key: deviceMarker, type: 'SALE' },
        );
        assertStatus(created, 201);
      }

      const playwrightPort = process.env.PLAYWRIGHT_PORT ?? '3112';
      const result = await runPlaywright({
        ...process.env,
        API_PROXY_URL: new URL(api.baseUrl).origin,
        MANDATE_WORKSPACE_E2E_DESKTOP_MARKER: desktopMarker,
        MANDATE_WORKSPACE_E2E_COOKIE: owner.cookie,
        MANDATE_WORKSPACE_E2E_MOBILE_MARKER: mobileMarker,
        NEXT_PUBLIC_API_URL: `http://127.0.0.1:${playwrightPort}`,
        PLAYWRIGHT_PORT: playwrightPort,
      });
      assert.equal(result.code, 0, result.output);
    } finally {
      await cleanupMandateFixtures(prisma, marker);
      await prisma.$disconnect();
      await api.stop();
    }
  },
);

async function runPlaywright(env: NodeJS.ProcessEnv) {
  const child = spawn(
    'pnpm',
    ['--filter', '@soyre/web', 'test:e2e', 'mandate-workspace-auth.spec.ts'],
    { cwd: process.cwd(), env, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let output = '';
  const append = (chunk: Buffer) => {
    output += chunk.toString();
    output = output.slice(-30_000);
  };
  child.stdout.on('data', append);
  child.stderr.on('data', append);
  await once(child, 'exit');
  return { code: child.exitCode, output };
}
