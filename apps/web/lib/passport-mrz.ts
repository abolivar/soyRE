export type PassportMrzData = {
  birthDate: string | null;
  documentNumber: string;
  expirationDate: string | null;
  firstName: string;
  issuingCountry: string;
  lastName: string;
  mrz: string;
  nationality: string;
  sex: string | null;
};

const COUNTRY_NAMES: Record<string, string> = {
  ARG: 'Argentina',
  BRA: 'Brasil',
  CAN: 'Canada',
  CHL: 'Chile',
  COL: 'Colombia',
  CRI: 'Costa Rica',
  DOM: 'Republica Dominicana',
  ECU: 'Ecuador',
  ESP: 'Espana',
  MEX: 'Mexico',
  PAN: 'Panama',
  PER: 'Peru',
  USA: 'Estados Unidos',
  URY: 'Uruguay',
  VEN: 'Venezuela',
};

export function extractPassportMrz(text: string) {
  const lineGroups = text
    .split(/\r?\n/)
    .map(normalizeMrzLineCandidates)
    .filter((group) => group.length > 0);
  const candidates: Array<{ firstLine: string; score: number; secondLine: string }> = [];

  lineGroups.flat().forEach((line) => {
    if (line.length >= MRZ_LINE_LENGTH * 2) {
      for (
        let offset = 0;
        offset <= line.length - MRZ_LINE_LENGTH * 2;
        offset += 1
      ) {
        candidates.push(scorePassportMrzPair(
          line.slice(offset, offset + MRZ_LINE_LENGTH),
          line.slice(offset + MRZ_LINE_LENGTH, offset + MRZ_LINE_LENGTH * 2),
        ));
      }
    }
  });

  for (let index = 0; index < lineGroups.length - 1; index += 1) {
    const firstLineGroup = lineGroups[index] ?? [];
    const secondLineGroup = lineGroups[index + 1] ?? [];

    for (const firstLine of firstLineGroup) {
      for (const secondLine of secondLineGroup) {
        if (firstLine.length >= 25 && secondLine.length >= 25) {
          candidates.push(scorePassportMrzPair(firstLine, secondLine));
        }
      }
    }
  }

  const bestCandidate = candidates
    .filter((candidate) => candidate.score >= 28)
    .sort((left, right) => right.score - left.score)[0];

  return bestCandidate
    ? `${bestCandidate.firstLine}\n${bestCandidate.secondLine}`
    : null;
}

export function parsePassportMrz(mrz: string): PassportMrzData {
  const [firstLineCandidate, secondLineCandidate] = mrz
    .split(/\r?\n/)
    .map(normalizeMrzLine)
    .filter(Boolean);

  const { firstLine, secondLine } = normalizePassportMrz(
    firstLineCandidate ?? '',
    secondLineCandidate ?? '',
  );

  if (!firstLine || !secondLine || !firstLine.startsWith('P')) {
    throw new Error('La MRZ no corresponde a un pasaporte.');
  }

  const issuingCountryCode = firstLine.slice(2, 5);
  const names = parseNames(firstLine.slice(5));
  const nationalityCode = secondLine.slice(10, 13);

  validateMrzCheckDigit(secondLine.slice(0, 9), secondLine.slice(9, 10), 'pasaporte');
  validateMrzCheckDigit(
    secondLine.slice(13, 19),
    secondLine.slice(19, 20),
    'fecha de nacimiento',
  );
  validateMrzCheckDigit(
    secondLine.slice(21, 27),
    secondLine.slice(27, 28),
    'fecha de expiracion',
  );

  return {
    birthDate: parseMrzDate(secondLine.slice(13, 19), 'birth'),
    documentNumber: cleanMrzValue(secondLine.slice(0, 9)),
    expirationDate: parseMrzDate(secondLine.slice(21, 27), 'expiration'),
    firstName: names.firstName,
    issuingCountry: countryName(issuingCountryCode),
    lastName: names.lastName,
    mrz: `${firstLine}\n${secondLine}`,
    nationality: countryName(nationalityCode),
    sex: parseSex(secondLine.slice(20, 21)),
  };
}

const MRZ_LINE_LENGTH = 44;

const DIGIT_REPAIRS: Record<string, string> = {
  A: '4',
  B: '8',
  D: '0',
  G: '6',
  I: '1',
  L: '1',
  O: '0',
  Q: '0',
  S: '5',
  T: '7',
  Z: '2',
};

const LETTER_REPAIRS: Record<string, string> = {
  '0': 'O',
  '1': 'I',
  '2': 'Z',
  '3': 'E',
  '4': 'A',
  '5': 'S',
  '6': 'G',
  '8': 'B',
};

const CHECK_DIGIT_ALTERNATIVES: Record<string, readonly string[]> = {
  '0': ['O', 'Q', 'D'],
  '1': ['I', 'L'],
  '2': ['Z'],
  '5': ['S'],
  '6': ['G'],
  '8': ['B'],
  B: ['8'],
  D: ['0'],
  G: ['6'],
  I: ['1'],
  L: ['1'],
  O: ['0'],
  Q: ['0'],
  S: ['5'],
  Z: ['2'],
};

function normalizeMrzLine(value: string) {
  return value
    .toUpperCase()
    .replace(/[«‹≤]/g, '<')
    .replace(/\s/g, '')
    .replace(/[^A-Z0-9<]/g, '');
}

function normalizeMrzLineCandidates(value: string) {
  const compact = normalizeMrzLine(value);
  const withFillers = value
    .toUpperCase()
    .replace(/[«‹≤]/g, '<')
    .replace(/\s+/g, '<')
    .replace(/[^A-Z0-9<]/g, '');

  return Array.from(new Set([compact, withFillers])).filter(
    (line) => line.length >= 25,
  );
}

function normalizePassportMrz(firstLineCandidate: string, secondLineCandidate: string) {
  return {
    firstLine: repairPassportFirstLine(firstLineCandidate),
    secondLine: repairPassportSecondLine(secondLineCandidate),
  };
}

function scorePassportMrzPair(firstLineCandidate: string, secondLineCandidate: string) {
  const { firstLine, secondLine } = normalizePassportMrz(
    firstLineCandidate,
    secondLineCandidate,
  );
  let score = 0;

  if (!firstLine.startsWith('P')) {
    return { firstLine, score, secondLine };
  }

  score += 12;

  if (firstLine.slice(1, 2) === '<') {
    score += 4;
  }

  if (/^[A-Z]{3}$/.test(firstLine.slice(2, 5))) {
    score += 4;
  }

  if (firstLine.slice(5).includes('<<')) {
    score += 5;
  }

  if (/^[A-Z]{3}$/.test(secondLine.slice(10, 13))) {
    score += 4;
  }

  score += scoreCheckDigit(secondLine.slice(0, 9), secondLine.slice(9, 10), 8);
  score += scoreCheckDigit(secondLine.slice(13, 19), secondLine.slice(19, 20), 8);
  score += scoreCheckDigit(secondLine.slice(21, 27), secondLine.slice(27, 28), 8);
  score += scoreCheckDigit(secondLine.slice(28, 42), secondLine.slice(42, 43), 3);

  const compositeValue = [
    secondLine.slice(0, 10),
    secondLine.slice(13, 20),
    secondLine.slice(21, 43),
  ].join('');
  score += scoreCheckDigit(compositeValue, secondLine.slice(43, 44), 10);

  return { firstLine, score, secondLine };
}

function scoreCheckDigit(value: string, checkDigit: string, points: number) {
  return /^\d$/.test(checkDigit) && calculateMrzCheckDigit(value) === checkDigit
    ? points
    : 0;
}

function repairPassportFirstLine(value: string) {
  const candidates = repairPassportFirstLineCandidates(value);

  return (
    candidates.sort(
      (left, right) => scorePassportFirstLine(right) - scorePassportFirstLine(left),
    )[0] ?? repairPassportFirstLineCandidate(value)
  );
}

function repairPassportFirstLineCandidates(value: string) {
  const variants = new Set<string>();

  addFirstLineDeletionVariants(variants, normalizeMrzLine(value));
  addFirstLineDeletionVariants(variants, repairDoubleKNameSeparators(value));

  return Array.from(
    new Set(
      Array.from(variants)
        .filter(Boolean)
        .map(repairPassportFirstLineCandidate),
    ),
  );
}

function addFirstLineDeletionVariants(variants: Set<string>, value: string) {
  if (!value) {
    return;
  }

  variants.add(value);

  const removableIndexes = value
    .split('')
    .map((character, index) =>
      isLikelySpuriousNameK(value, index) && character === 'K' ? index : -1,
    )
    .filter((index) => index >= 0)
    .slice(0, 10);
  const maxMask = 1 << removableIndexes.length;

  for (let mask = 1; mask < maxMask; mask += 1) {
    if (countMaskBits(mask) > 4) {
      continue;
    }

    variants.add(removeCharactersAt(value, removableIndexes, mask));
  }
}

function repairPassportFirstLineCandidate(value: string) {
  const characters = fitMrzLine(value).split('');

  characters[0] = repairPassportCode(characters[0]);
  characters[1] = repairFillerOrLetter(characters[1]);

  for (let index = 2; index < 5; index += 1) {
    characters[index] = repairLetter(characters[index]);
  }

  for (let index = 5; index < MRZ_LINE_LENGTH; index += 1) {
    characters[index] = repairFillerOrLetter(characters[index]);
  }

  return repairNameFillerNoise(characters.join(''));
}

function repairPassportSecondLine(value: string) {
  const candidates = repairPassportSecondLineCandidates(value);

  return (
    candidates.sort(
      (left, right) => scorePassportSecondLine(right) - scorePassportSecondLine(left),
    )[0] ?? repairPassportSecondLineCandidate(value)
  );
}

function repairPassportSecondLineCandidates(value: string) {
  const normalized = normalizeMrzLine(value);
  const variants = new Set<string>([normalized]);

  for (let index = 0; index <= Math.min(13, normalized.length - 1); index += 1) {
    variants.add(`${normalized.slice(0, index)}${normalized.slice(index + 1)}`);
  }

  return Array.from(
    new Set(
      Array.from(variants)
        .filter(Boolean)
        .map(repairPassportSecondLineCandidate),
    ),
  );
}

function repairPassportSecondLineCandidate(value: string) {
  const characters = fitMrzLine(value).split('');

  repairRange(characters, 0, 9, repairDocumentCharacter);
  characters[9] = repairDigit(characters[9]);
  repairRange(characters, 10, 13, repairLetter);
  repairRange(characters, 13, 19, repairDigit);
  characters[19] = repairDigit(characters[19]);
  characters[20] = repairSex(characters[20]);
  repairRange(characters, 21, 27, repairDigit);
  characters[27] = repairDigit(characters[27]);
  repairRange(characters, 28, 42, repairDocumentCharacter);
  characters[42] = repairDigitOrFiller(characters[42]);
  characters[43] = repairDigit(characters[43]);

  const documentNumber = repairFieldByCheckDigit(
    characters.slice(0, 9).join(''),
    characters[9] ?? '',
  );
  replaceRange(characters, 0, documentNumber);

  const optionalData = repairFieldByCheckDigit(
    characters.slice(28, 42).join(''),
    characters[42] ?? '',
  );
  replaceRange(characters, 28, optionalData);
  repairOptionalFillerNoise(characters);
  enforcePassportTrailingCheckDigits(characters);

  return characters.join('');
}

function scorePassportFirstLine(line: string) {
  let score = 0;
  const nameSection = line.slice(5);
  const separatorIndex = nameSection.indexOf('<<');
  const names = parseNames(nameSection);

  if (line.startsWith('P<')) {
    score += 12;
  }

  if (COUNTRY_NAMES[line.slice(2, 5)]) {
    score += 6;
  } else if (/^[A-Z]{3}$/.test(line.slice(2, 5))) {
    score += 3;
  }

  if (separatorIndex >= 0) {
    score += 10;
  }

  if (names.firstName) {
    score += 4;
  }

  if (names.lastName) {
    score += 4;
  }

  score -= countSuspiciousNameFillers(nameSection);

  return score;
}

function scorePassportSecondLine(line: string) {
  const compositeValue = [
    line.slice(0, 10),
    line.slice(13, 20),
    line.slice(21, 43),
  ].join('');
  let score = 0;

  if (COUNTRY_NAMES[line.slice(10, 13)]) {
    score += 6;
  } else if (/^[A-Z]{3}$/.test(line.slice(10, 13))) {
    score += 3;
  }

  score += scoreCheckDigit(line.slice(0, 9), line.slice(9, 10), 12);
  score += scoreCheckDigit(line.slice(13, 19), line.slice(19, 20), 10);
  score += scoreCheckDigit(line.slice(21, 27), line.slice(27, 28), 10);
  score += scoreCheckDigit(line.slice(28, 42), line.slice(42, 43), 4);
  score += scoreCheckDigit(compositeValue, line.slice(43, 44), 12);

  return score;
}

function isLikelySpuriousNameK(value: string, index: number) {
  if (index < 5 || value[index] !== 'K') {
    return false;
  }

  const previous = value[index - 1];
  const next = value[index + 1];

  return previous === '<' || next === '<' || previous === 'K' || next === 'K';
}

function repairDoubleKNameSeparators(value: string) {
  const normalized = normalizeMrzLine(value);
  const prefix = normalized.slice(0, 5);
  const nameSection = normalized.slice(5).replace(/KK/g, '<<');

  return `${prefix}${nameSection}`;
}

function repairNameFillerNoise(line: string) {
  const characters = line.split('');
  const nameSection = characters.slice(5).join('');
  const trailingFiller = nameSection.match(/[<KL]{3,}$/);

  if (!trailingFiller || trailingFiller.index === undefined) {
    return line;
  }

  const start = 5 + trailingFiller.index;

  for (let index = start; index < characters.length; index += 1) {
    if (characters[index] === 'K' || characters[index] === 'L') {
      characters[index] = '<';
    }
  }

  return characters.join('');
}

function repairOptionalFillerNoise(characters: string[]) {
  const optionalData = characters.slice(28, 42).join('');
  const trailingFiller = optionalData.match(/[<KL]{3,}$/);

  if (!trailingFiller || trailingFiller.index === undefined) {
    return;
  }

  const start = 28 + trailingFiller.index;

  for (let index = start; index < 42; index += 1) {
    if (characters[index] === 'K' || characters[index] === 'L') {
      characters[index] = '<';
    }
  }
}

function enforcePassportTrailingCheckDigits(characters: string[]) {
  const optionalCheckDigit = calculateMrzCheckDigit(characters.slice(28, 42).join(''));

  if (
    !/^\d$/.test(characters[42] ?? '') ||
    characters[42] !== optionalCheckDigit
  ) {
    characters[42] = optionalCheckDigit;
  }

  const compositeValue = [
    characters.slice(0, 10).join(''),
    characters.slice(13, 20).join(''),
    characters.slice(21, 43).join(''),
  ].join('');
  const compositeCheckDigit = calculateMrzCheckDigit(compositeValue);

  if (
    !/^\d$/.test(characters[43] ?? '') ||
    characters[43] !== compositeCheckDigit
  ) {
    characters[43] = compositeCheckDigit;
  }
}

function countSuspiciousNameFillers(value: string) {
  const fillerLikeCharacters = value.split('').filter((character, index) => {
    const previous = value[index - 1];
    const next = value[index + 1];

    return (
      (character === 'K' || character === 'L') &&
      (previous === '<' || next === '<' || previous === character || next === character)
    );
  }).length;
  const longLeadingKTokens = value.match(/<KL[A-Z]{4,}/g)?.length ?? 0;

  return fillerLikeCharacters + longLeadingKTokens * 6;
}

function countMaskBits(value: number) {
  let count = 0;
  let remaining = value;

  while (remaining > 0) {
    count += remaining & 1;
    remaining >>= 1;
  }

  return count;
}

function removeCharactersAt(value: string, indexes: number[], mask: number) {
  const indexesToRemove = new Set<number>();

  indexes.forEach((index, bitIndex) => {
    if (mask & (1 << bitIndex)) {
      indexesToRemove.add(index);
    }
  });

  return value
    .split('')
    .filter((_, index) => !indexesToRemove.has(index))
    .join('');
}

function fitMrzLine(value: string) {
  return value.slice(0, MRZ_LINE_LENGTH).padEnd(MRZ_LINE_LENGTH, '<');
}

function parseNames(value: string) {
  const [lastName = '', firstName = ''] = value.split('<<');

  return {
    firstName: cleanMrzValue(firstName),
    lastName: cleanMrzValue(lastName),
  };
}

function cleanMrzValue(value: string) {
  return value.replace(/</g, ' ').replace(/\s+/g, ' ').trim();
}

function repairRange(
  characters: string[],
  start: number,
  end: number,
  repair: (character: string | undefined) => string,
) {
  for (let index = start; index < end; index += 1) {
    characters[index] = repair(characters[index]);
  }
}

function replaceRange(characters: string[], start: number, value: string) {
  value.split('').forEach((character, index) => {
    characters[start + index] = character;
  });
}

function repairDigit(character: string | undefined) {
  if (!character) {
    return '<';
  }

  if (/^\d$/.test(character)) {
    return character;
  }

  return DIGIT_REPAIRS[character] ?? character;
}

function repairPassportCode(character: string | undefined) {
  if (!character) {
    return '<';
  }

  return character === 'P' || character === 'F' || character === 'R'
    ? 'P'
    : character;
}

function repairDigitOrFiller(character: string | undefined) {
  if (character === '<') {
    return '<';
  }

  return repairDigit(character);
}

function repairLetter(character: string | undefined) {
  if (!character || character === '<') {
    return '<';
  }

  return LETTER_REPAIRS[character] ?? character;
}

function repairFillerOrLetter(character: string | undefined) {
  if (!character || character === '<') {
    return '<';
  }

  return repairLetter(character);
}

function repairDocumentCharacter(character: string | undefined) {
  if (!character) {
    return '<';
  }

  return character;
}

function repairSex(character: string | undefined) {
  const repaired = repairLetter(character);

  if (repaired === 'M' || repaired === 'F' || repaired === '<') {
    return repaired;
  }

  return character ?? '<';
}

function repairFieldByCheckDigit(value: string, checkDigit: string) {
  if (!/^\d$/.test(checkDigit) || calculateMrzCheckDigit(value) === checkDigit) {
    return value;
  }

  const singleRepair = findRepairedField(value, checkDigit, 1);

  if (singleRepair) {
    return singleRepair;
  }

  return findRepairedField(value, checkDigit, 2) ?? value;
}

function findRepairedField(value: string, checkDigit: string, maxChanges: 1 | 2) {
  const characters = value.split('');
  const alternatives = characters.map((character) => [
    character,
    ...(CHECK_DIGIT_ALTERNATIVES[character] ?? []),
  ]);

  if (maxChanges === 1) {
    for (let index = 0; index < alternatives.length; index += 1) {
      for (const alternative of alternatives[index] ?? []) {
        if (alternative === characters[index]) {
          continue;
        }

        const candidate = replaceCharacters(characters, [[index, alternative]]);

        if (calculateMrzCheckDigit(candidate) === checkDigit) {
          return candidate;
        }
      }
    }

    return null;
  }

  for (let firstIndex = 0; firstIndex < alternatives.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < alternatives.length;
      secondIndex += 1
    ) {
      for (const firstAlternative of alternatives[firstIndex] ?? []) {
        for (const secondAlternative of alternatives[secondIndex] ?? []) {
          if (
            firstAlternative === characters[firstIndex] &&
            secondAlternative === characters[secondIndex]
          ) {
            continue;
          }

          const candidate = replaceCharacters(characters, [
            [firstIndex, firstAlternative],
            [secondIndex, secondAlternative],
          ]);

          if (calculateMrzCheckDigit(candidate) === checkDigit) {
            return candidate;
          }
        }
      }
    }
  }

  return null;
}

function replaceCharacters(
  characters: string[],
  replacements: Array<[number, string]>,
) {
  const candidate = [...characters];

  replacements.forEach(([index, character]) => {
    candidate[index] = character;
  });

  return candidate.join('');
}

function parseSex(value: string) {
  if (value === 'M') {
    return 'M';
  }

  if (value === 'F') {
    return 'F';
  }

  return null;
}

function parseMrzDate(value: string, mode: 'birth' | 'expiration') {
  if (!/^\d{6}$/.test(value)) {
    return null;
  }

  const year = Number(value.slice(0, 2));
  const month = Number(value.slice(2, 4));
  const day = Number(value.slice(4, 6));
  const currentYear = new Date().getFullYear() % 100;
  const century = mode === 'expiration' || year <= currentYear ? 2000 : 1900;
  const fullYear = century + year;
  const date = new Date(Date.UTC(fullYear, month - 1, day));

  if (
    date.getUTCFullYear() !== fullYear ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${fullYear.toString().padStart(4, '0')}-${value.slice(
    2,
    4,
  )}-${value.slice(4, 6)}`;
}

function validateMrzCheckDigit(value: string, checkDigit: string, fieldLabel: string) {
  if (!/^\d$/.test(checkDigit)) {
    throw new Error(`La MRZ no tiene dígito de verificación válido para ${fieldLabel}.`);
  }

  if (calculateMrzCheckDigit(value) !== checkDigit) {
    throw new Error(`La MRZ tiene dígito de verificación inválido en ${fieldLabel}.`);
  }
}

function calculateMrzCheckDigit(value: string) {
  const weights = [7, 3, 1];
  const sum = value.split('').reduce((total, character, index) => {
    const weight = weights[index % weights.length] ?? 0;

    return total + mrzCharacterValue(character) * weight;
  }, 0);

  return String(sum % 10);
}

function mrzCharacterValue(character: string) {
  if (character === '<') {
    return 0;
  }

  if (/^\d$/.test(character)) {
    return Number(character);
  }

  if (/^[A-Z]$/.test(character)) {
    return character.charCodeAt(0) - 55;
  }

  return 0;
}

function countryName(code: string) {
  return COUNTRY_NAMES[code] ?? code;
}
