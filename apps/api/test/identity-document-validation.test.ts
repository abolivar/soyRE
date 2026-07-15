import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateNationalId } from '../src/clients/identity-document-validation.js';

describe('national identity document validation', () => {
  it('normalizes Colombian identity numbers', () => {
    assert.deepEqual(validateNationalId('COL', '1.032.456.789'), {
      valid: true,
      documentNumber: '1032456789',
      issuingCountry: 'COL',
    });
  });

  it('accepts Panama identity prefixes and separators', () => {
    assert.deepEqual(validateNationalId('PAN', 'PE-120-45567'), {
      valid: true,
      documentNumber: 'PE-120-45567',
      issuingCountry: 'PAN',
    });
  });

  it('rejects unsupported countries', () => {
    assert.deepEqual(validateNationalId('USA', '123456789'), {
      valid: false,
      message: 'La cédula solo está habilitada para Colombia y Panamá.',
    });
  });

  it('rejects invalid country-specific formats', () => {
    assert.equal(validateNationalId('COL', 'ABC123').valid, false);
    assert.equal(validateNationalId('PAN', '123456789').valid, false);
  });
});
