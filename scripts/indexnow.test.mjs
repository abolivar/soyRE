import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildIndexNowPayload,
  resolveIndexNowConfig,
} from './submit-indexnow.mjs';

const enabledEnvironment = {
  INDEXNOW_ENABLED: 'true',
  INDEXNOW_KEY: 'soypms-indexnow-key',
  NEXT_PUBLIC_SITE_URL: 'https://soypms.com',
  PUBLIC_SITE_CUSTOM_DOMAIN_ENABLED: 'true',
  PUBLIC_SITE_INDEXING_ENABLED: 'true',
};

test('IndexNow refuses to run while any publication gate is closed', () => {
  assert.throws(() =>
    resolveIndexNowConfig({
      ...enabledEnvironment,
      PUBLIC_SITE_INDEXING_ENABLED: 'false',
    }),
  );
});

test('IndexNow accepts only the approved canonical origin', () => {
  assert.throws(() =>
    resolveIndexNowConfig({
      ...enabledEnvironment,
      NEXT_PUBLIC_SITE_URL: 'https://soypms-alpha.vercel.app',
    }),
  );
});

test('IndexNow payload includes only the five indexable public URLs', () => {
  const payload = buildIndexNowPayload(
    resolveIndexNowConfig(enabledEnvironment),
  );

  assert.equal(payload.host, 'soypms.com');
  assert.equal(
    payload.keyLocation,
    'https://soypms.com/soypms-indexnow-key.txt',
  );
  assert.equal(payload.urlList.length, 5);
  assert.equal(payload.urlList.includes('https://soypms.com/login'), false);
});
