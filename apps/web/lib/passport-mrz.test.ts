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

const passportScanCases = [
  {
    input: [
      'P<COLTORO<KLONDONO<K<JUAN<KALEJANDRO<K<LLLLL',
      'BE692783<6COL6902254M3408157CC7556422<<K<<<K',
    ].join('\n'),
    expected: [
      'P<COLTORO<LONDONO<<JUAN<ALEJANDRO<<<<<<<<<<<',
      'BE692783<6COL6902254M3408157CC7556422<<<<<96',
    ].join('\n'),
    documentNumber: 'BE692783',
    firstName: 'JUAN ALEJANDRO',
    lastName: 'TORO LONDONO',
    birthDate: '1969-02-25',
    expirationDate: '2034-08-15',
  },
  {
    input: [
      'P<VENBOLIVAR<MORENO<<ARGENIS<DAVID<L<L<LLLL<',
      'B172217127AVEN7604290M321018912662113<<<<<<4',
    ].join('\n'),
    expected: [
      'P<VENBOLIVAR<MORENO<<ARGENIS<DAVID<<<<<<<<<<',
      '1722171274VEN7604290M321018912662113<<<<<<44',
    ].join('\n'),
    documentNumber: '172217127',
    firstName: 'ARGENIS DAVID',
    lastName: 'BOLIVAR MORENO',
    birthDate: '1976-04-29',
    expirationDate: '2032-10-18',
  },
  {
    input: [
      'P<MEXMONTOYA<FIERROKKALEXIS<<K<LLLLLLLLLLLLL',
      'G232535846MEX6711115M2611240<<<<<<<<<K<K<K<K',
    ].join('\n'),
    expected: [
      'P<MEXMONTOYA<FIERRO<<ALEXIS<<<<<<<<<<<<<<<<<',
      'G232535846MEX6711115M2611240<<<<<<<<<<<<<<00',
    ].join('\n'),
    documentNumber: 'G23253584',
    firstName: 'ALEXIS',
    lastName: 'MONTOYA FIERRO',
    birthDate: '1967-11-11',
    expirationDate: '2026-11-24',
  },
] as const;

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

  it('repairs MRZ OCR from uploaded passport scans', () => {
    for (const testCase of passportScanCases) {
      const parsed = parsePassportMrz(testCase.input);

      assert.equal(parsed.documentNumber, testCase.documentNumber);
      assert.equal(parsed.firstName, testCase.firstName);
      assert.equal(parsed.lastName, testCase.lastName);
      assert.equal(parsed.birthDate, testCase.birthDate);
      assert.equal(parsed.expirationDate, testCase.expirationDate);
      assert.equal(parsed.mrz, testCase.expected);
    }
  });

  it('extracts repaired MRZ pairs from uploaded passport OCR text', () => {
    for (const testCase of passportScanCases) {
      const detected = extractPassportMrz(`
        OCR text
        ${testCase.input}
        Signature
      `);

      assert.equal(detected, testCase.expected);
    }
  });
});
