import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildLoginRedirectUrl,
  isProtectedAppPath,
  resolveLoginRedirectTarget,
} from './auth-routing';

describe('auth routing', () => {
  it('detects authenticated app routes', () => {
    assert.equal(isProtectedAppPath('/platform'), true);
    assert.equal(isProtectedAppPath('/platform/users'), true);
    assert.equal(isProtectedAppPath('/dashboard'), true);
    assert.equal(isProtectedAppPath('/login'), false);
    assert.equal(isProtectedAppPath('/api/platform/access'), false);
  });

  it('builds login redirects with the requested destination', () => {
    const redirectUrl = buildLoginRedirectUrl(
      new URL('https://soypms.test/platform?tab=users'),
    );

    assert.equal(redirectUrl.pathname, '/login');
    assert.equal(redirectUrl.searchParams.get('next'), '/platform?tab=users');
  });

  it('accepts only internal login redirect targets', () => {
    assert.equal(resolveLoginRedirectTarget('/platform'), '/platform');
    assert.equal(resolveLoginRedirectTarget('//evil.test'), '/dashboard');
    assert.equal(resolveLoginRedirectTarget('https://evil.test'), '/dashboard');
    assert.equal(resolveLoginRedirectTarget('/login?next=/platform'), '/dashboard');
    assert.equal(resolveLoginRedirectTarget(undefined), '/dashboard');
  });
});
