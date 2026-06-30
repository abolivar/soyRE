import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseNationalIdOcr } from './national-id-ocr';

describe('national ID OCR parser', () => {
  it('reads labeled national ID data', () => {
    const parsed = parseNationalIdOcr(`
      Republica de Panama
      Cedula No. 8-888-888
      Apellidos
      RODRIGUEZ PEREZ
      Nombres
      MARIA ELENA
    `);

    assert.equal(parsed.documentNumber, '8-888-888');
    assert.equal(parsed.firstName, 'MARIA ELENA');
    assert.equal(parsed.lastName, 'RODRIGUEZ PEREZ');
  });

  it('repairs common OCR substitutions in document numbers and names', () => {
    const parsed = parseNationalIdOcr(`
      REPUBLICA DE PANAMA
      CEDULA N0 B-88B-8S8
      APELLID0S
      G0MEZ SANCHE2
      N0MBRES
      J0SE LUI5
    `);

    assert.equal(parsed.documentNumber, '8-888-858');
    assert.equal(parsed.firstName, 'JOSE LUIS');
    assert.equal(parsed.lastName, 'GOMEZ SANCHEZ');
  });

  it('supports prefixed identity numbers', () => {
    const parsed = parseNationalIdOcr(`
      IDENTIFICACION
      PE-12O-45S67
      NOMBRES: ANA ISABEL
      APELLIDOS: DE LA CRUZ
    `);

    assert.equal(parsed.documentNumber, 'PE-120-45567');
    assert.equal(parsed.firstName, 'ANA ISABEL');
    assert.equal(parsed.lastName, 'DE LA CRUZ');
  });
});
