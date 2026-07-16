import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import test from 'node:test';
import {
  createPrismaClient,
  MandateType,
  PropertyOperation,
} from '@soyre/database';
import { ensureApiServer } from '../helpers/api-server.ts';
import {
  addCoverFixture,
  createActiveListingContext,
  createListing,
} from '../helpers/listing-fixtures.ts';
import {
  cleanupMandateFixtures,
  registerFixtureOwner,
} from '../helpers/mandate-fixtures.ts';
import { assertStatus } from '../helpers/http.ts';

const enabled = process.env.LISTING_WORKSPACE_E2E_MUTATING === 'true';

test(
  'validates the authenticated listing workspace on desktop and mobile',
  { skip: !enabled, timeout: 360_000 },
  async () => {
    const marker = `e2e-listing-${Date.now()}`;
    const desktopMarker = `${marker}-desktop`;
    const mobileMarker = `${marker}-mobile`;
    const api = await ensureApiServer();
    const prisma = createPrismaClient();
    try {
      const owner = await registerFixtureOwner(
        api.baseUrl,
        marker,
        'workspace-listing',
      );
      for (const deviceMarker of [desktopMarker, mobileMarker]) {
        const context = await createActiveListingContext(
          prisma,
          api.baseUrl,
          owner,
          marker,
          deviceMarker,
          [PropertyOperation.SALE],
          MandateType.SALE,
        );
        const created = await createListing(
          api.baseUrl,
          owner,
          context,
          deviceMarker,
          { title: `Listing ${deviceMarker}` },
        );
        assertStatus(created, 201);
        await addCoverFixture(
          prisma,
          owner,
          created.body.listing.id,
          deviceMarker,
        );
      }

      const playwrightPort = process.env.PLAYWRIGHT_PORT ?? '3114';
      const result = await runPlaywright({
        ...process.env,
        API_PROXY_URL: new URL(api.baseUrl).origin,
        LISTING_WORKSPACE_E2E_COOKIE: owner.cookie,
        LISTING_WORKSPACE_E2E_DESKTOP_MARKER: desktopMarker,
        LISTING_WORKSPACE_E2E_MOBILE_MARKER: mobileMarker,
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
    ['--filter', '@soyre/web', 'test:e2e', 'listing-workspace-auth.spec.ts'],
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
