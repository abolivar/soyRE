import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isPublicAnalyticsEvent,
  isValidGaMeasurementId,
  sanitizeAnalyticsParameters,
} from './public-analytics';

describe('public analytics contract', () => {
  it('accepts GA4 measurement IDs only', () => {
    assert.equal(isValidGaMeasurementId('G-ABC12345'), true);
    assert.equal(isValidGaMeasurementId('UA-123-4'), false);
    assert.equal(isValidGaMeasurementId(''), false);
  });

  it('recognizes only the documented event names', () => {
    assert.equal(isPublicAnalyticsEvent('demo_form_success'), true);
    assert.equal(isPublicAnalyticsEvent('form_email'), false);
  });

  it('drops PII and undeclared parameters from every event', () => {
    assert.deepEqual(
      sanitizeAnalyticsParameters('demo_form_error', {
        email: 'ada@example.com',
        error_type: 'network',
        name: 'Ada',
      }),
      { error_type: 'network' },
    );
    assert.deepEqual(
      sanitizeAnalyticsParameters('content_link_click', {
        destination_path: '/producto',
        referrer: 'https://chatgpt.com',
      }),
      { destination_path: '/producto' },
    );
  });
});
