import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseNationalIdOcr } from './national-id-ocr';

describe('national ID OCR parser', () => {
  it('reads labeled national ID data', () => {
    const parsed = parseNationalIdOcr(
      `
      Republica de Panama
      Cedula No. 8-888-888
      Apellidos
      RODRIGUEZ PEREZ
      Nombres
      MARIA ELENA
    `,
      'PA',
    );

    assert.equal(parsed.documentNumber, '8-888-888');
    assert.equal(parsed.firstName, 'MARIA ELENA');
    assert.equal(parsed.lastName, 'RODRIGUEZ PEREZ');
  });

  it('repairs common OCR substitutions in document numbers and names', () => {
    const parsed = parseNationalIdOcr(
      `
      REPUBLICA DE PANAMA
      CEDULA N0 B-88B-8S8
      APELLID0S
      G0MEZ SANCHE2
      N0MBRES
      J0SE LUI5
    `,
      'PA',
    );

    assert.equal(parsed.documentNumber, '8-888-858');
    assert.equal(parsed.firstName, 'JOSE LUIS');
    assert.equal(parsed.lastName, 'GOMEZ SANCHEZ');
  });

  it('supports prefixed identity numbers', () => {
    const parsed = parseNationalIdOcr(
      `
      IDENTIFICACION
      PE-12O-45S67
      NOMBRES: ANA ISABEL
      APELLIDOS: DE LA CRUZ
    `,
      'PA',
    );

    assert.equal(parsed.documentNumber, 'PE-120-45567');
    assert.equal(parsed.firstName, 'ANA ISABEL');
    assert.equal(parsed.lastName, 'DE LA CRUZ');
  });

  it('reads Colombian citizenship card numbers without punctuation', () => {
    const parsed = parseNationalIdOcr(
      `
      REPUBLICA DE COLOMBIA
      CEDULA DE CIUDADANIA
      NUMERO 1.032.456.789
      APELLIDOS
      RAMIREZ TORRES
      NOMBRES
      LAURA SOFIA
    `,
      'CO',
    );

    assert.equal(parsed.country, 'CO');
    assert.equal(parsed.documentNumber, '1032456789');
    assert.equal(parsed.firstName, 'LAURA SOFIA');
    assert.equal(parsed.lastName, 'RAMIREZ TORRES');
  });

  it('repairs common OCR substitutions in Colombian document numbers', () => {
    const parsed = parseNationalIdOcr(
      `
      CEDULA DE CIUDADANIA
      NUIP 8O1234S67
      APELLIDOS: PEREZ
      NOMBRES: CARLOS
    `,
      'CO',
    );

    assert.equal(parsed.documentNumber, '801234567');
  });
});
