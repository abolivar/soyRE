import assert from 'node:assert/strict';
import test from 'node:test';
import { resolvePublicSiteConfig } from './public-site';

test('public site config defaults to the verified production alias with indexing disabled', () => {
  const config = resolvePublicSiteConfig({});

  assert.equal(config.url.toString(), 'https://soypms-alpha.vercel.app/');
  assert.equal(config.indexingEnabled, false);
});

test('public site config accepts an approved HTTPS canonical URL', () => {
  const config = resolvePublicSiteConfig({
    NEXT_PUBLIC_SITE_URL: 'https://soypms.com/path?ignored=true',
    PUBLIC_SITE_INDEXING_ENABLED: 'TRUE',
  });

  assert.equal(config.url.toString(), 'https://soypms.com/');
  assert.equal(config.indexingEnabled, true);
});

test('public site config rejects unsafe or malformed canonical URLs', () => {
  assert.equal(
    resolvePublicSiteConfig({
      NEXT_PUBLIC_SITE_URL: 'http://soypms.com',
    }).url.toString(),
    'https://soypms-alpha.vercel.app/',
  );
  assert.equal(
    resolvePublicSiteConfig({
      NEXT_PUBLIC_SITE_URL: 'not-a-url',
    }).url.toString(),
    'https://soypms-alpha.vercel.app/',
  );
});
