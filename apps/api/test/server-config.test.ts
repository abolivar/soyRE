import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveApiPort } from '../src/server-config.js';

describe('resolveApiPort', () => {
  it('prefers Render-compatible PORT', () => {
    assert.equal(resolveApiPort({ API_PORT: '4000', PORT: '10000' }), 10000);
  });

  it('falls back to API_PORT', () => {
    assert.equal(resolveApiPort({ API_PORT: '4001' }), 4001);
  });

  it('defaults to local API port', () => {
    assert.equal(resolveApiPort({}), 4000);
  });

  it('rejects invalid ports', () => {
    assert.throws(() => resolveApiPort({ PORT: 'not-a-port' }), /Invalid API port/);
  });
});
