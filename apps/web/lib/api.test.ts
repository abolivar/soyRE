import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveApiUrl } from './api';

describe('resolveApiUrl', () => {
  it('uses the configured public API URL without trailing slash', () => {
    assert.equal(
      resolveApiUrl('https://api.soypms.test/', 'production'),
      'https://api.soypms.test',
    );
  });

  it('keeps the local fallback outside production', () => {
    assert.equal(resolveApiUrl(undefined, 'development'), 'http://localhost:4000');
  });

  it('does not point production builds to localhost by default', () => {
    assert.equal(resolveApiUrl(undefined, 'production'), null);
  });

  it('rejects explicit localhost URLs in production', () => {
    assert.equal(resolveApiUrl('http://localhost:4000', 'production'), null);
    assert.equal(resolveApiUrl('http://127.0.0.1:4000', 'production'), null);
  });
});
