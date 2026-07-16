import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatDate } from '../components/operational-format';

describe('operational format', () => {
  it('keeps date-only values on the same calendar day', () => {
    assert.match(formatDate('2026-07-15'), /^15 /);
    assert.match(formatDate('2026-12-31'), /^31 /);
  });
});
