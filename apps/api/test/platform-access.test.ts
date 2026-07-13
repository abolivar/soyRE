import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  parsePlatformAdminEmails,
  PlatformAccessService,
} from '../src/platform/platform-access.service.js';

describe('PlatformAccessService', () => {
  it('normalizes the platform administrator allowlist', () => {
    assert.deepEqual(
      parsePlatformAdminEmails(' Ana@SoyPMS.com, admin@example.com ,, '),
      new Set(['ana@soypms.com', 'admin@example.com']),
    );
  });

  it('allows exact email matches after normalization', () => {
    const service = new PlatformAccessService();

    assert.equal(
      service.isPlatformAdmin('ADMIN@example.com', 'admin@example.com'),
      true,
    );
  });

  it('denies users outside the allowlist', () => {
    const service = new PlatformAccessService();

    assert.equal(
      service.isPlatformAdmin('agent@example.com', 'admin@example.com'),
      false,
    );
  });
});
