import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { extractPassportMrz, parsePassportMrz } from './passport-mrz';

const cleanMrz = [
  'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<',
  'L898902C36UTO7408122F1204159ZE184226B<<<<<10',
].join('\n');

const noisyMrz = [
  'P<UT0ERIKSS0N<<ANNA<MAR1A<<<<<<<<<<<<<<<<<<<',
  'L8989O2C36UT074O8122F12O4159ZE184226B<<<<<1O',
].join('\n');

describe('passport MRZ parser', () => {
  it('parses a valid passport MRZ', () => {
    const parsed = parsePassportMrz(cleanMrz);

    assert.equal(parsed.documentNumber, 'L898902C3');
    assert.equal(parsed.firstName, 'ANNA MARIA');
    assert.equal(parsed.lastName, 'ERIKSSON');
    assert.equal(parsed.birthDate, '1974-08-12');
    assert.equal(parsed.expirationDate, '2012-04-15');
    assert.equal(parsed.sex, 'F');
  });

  it('repairs common OCR substitutions before parsing', () => {
    const parsed = parsePassportMrz(noisyMrz);

    assert.equal(parsed.documentNumber, 'L898902C3');
    assert.equal(parsed.firstName, 'ANNA MARIA');
    assert.equal(parsed.lastName, 'ERIKSSON');
    assert.equal(parsed.birthDate, '1974-08-12');
    assert.equal(parsed.expirationDate, '2012-04-15');
    assert.equal(parsed.mrz, cleanMrz);
  });

  it('extracts the best MRZ pair from OCR text with noise', () => {
    const detected = extractPassportMrz(`
      Republic of OCR
      P<UT0ERIKSS0N<<ANNA<MAR1A<<<<<<<<<<<<<<<<<<<
      L8989O2C36UT074O8122F12O4159ZE184226B<<<<<1O
      Signature
    `);

    assert.equal(detected, cleanMrz);
  });
});
