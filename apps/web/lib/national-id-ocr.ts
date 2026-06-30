export type NationalIdOcrData = {
  documentNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  rawText: string;
};

const DOCUMENT_NUMBER_LABELS = [
  'CEDULA',
  'CÉDULA',
  'IDENTIFICACION',
  'IDENTIFICACIÓN',
  'DOCUMENTO',
  'ID',
  'NO',
  'NUMERO',
  'NÚMERO',
];

const COMPACT_DOCUMENT_NUMBER_PATTERN = /\b[A-Z0-9]{6,12}\b/gi;

const DIGIT_REPAIRS: Record<string, string> = {
  B: '8',
  G: '6',
  I: '1',
  L: '1',
  O: '0',
  Q: '0',
  S: '5',
  Z: '2',
};

const LETTER_REPAIRS: Record<string, string> = {
  '0': 'O',
  '1': 'I',
  '2': 'Z',
  '5': 'S',
  '6': 'G',
  '8': 'B',
};

export function parseNationalIdOcr(text: string): NationalIdOcrData {
  const lines = normalizeLines(text);

  return {
    documentNumber: findDocumentNumber(lines),
    firstName: findLabeledValue(lines, [
      'NOMBRES',
      'NOMBRE',
      'NAME',
      'GIVEN NAMES',
      'GIVEN NAME',
    ]),
    lastName: findLabeledValue(lines, [
      'APELLIDOS',
      'APELLIDO',
      'SURNAME',
      'SURNAMES',
      'LAST NAME',
    ]),
    rawText: lines.join('\n'),
  };
}

function normalizeLines(text: string) {
  return text
    .split(/\r?\n/)
    .map(normalizeOcrLine)
    .filter(Boolean);
}

function findDocumentNumber(lines: string[]) {
  const labeledCandidates = lines.flatMap((line, index) => {
    if (!hasAnyLabel(line, DOCUMENT_NUMBER_LABELS)) {
      return [];
    }

    return [line, lines[index + 1], lines[index + 2]].filter(Boolean) as string[];
  });

  for (const candidate of labeledCandidates) {
    const documentNumber = extractDocumentNumber(candidate);

    if (documentNumber) {
      return documentNumber;
    }
  }

  return extractDocumentNumber(lines.join(' '));
}

function extractDocumentNumber(value: string) {
  const tokens = normalizeOcrLine(value)
    .split(/[^A-Z0-9]+/)
    .filter(Boolean)
    .filter((token) => !isIgnoredDocumentToken(token));
  const candidates: string[] = [];

  for (let index = 0; index < tokens.length - 2; index += 1) {
    const [prefix, middle, suffix] = tokens.slice(index, index + 3);

    if (
      looksLikeDocumentPrefix(prefix) &&
      looksLikeDocumentDigits(middle) &&
      looksLikeDocumentDigits(suffix)
    ) {
      candidates.push(`${prefix}-${middle}-${suffix}`);
    }
  }

  candidates.push(...(value.match(COMPACT_DOCUMENT_NUMBER_PATTERN) ?? []));

  const repaired = Array.from(new Set(candidates))
    .map(repairDocumentNumber)
    .filter((candidate): candidate is string => Boolean(candidate))
    .sort((left, right) => scoreDocumentNumber(right) - scoreDocumentNumber(left));

  return repaired[0] ?? null;
}

function findLabeledValue(lines: string[], labels: string[]) {
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const normalizedLine = normalizeLabel(line);
    const matchingLabel = labels.find((label) =>
      normalizedLine.includes(normalizeLabel(label)),
    );

    if (!matchingLabel) {
      continue;
    }

    const inlineValue = extractInlineLabelValue(line);

    if (inlineValue && isProbableName(inlineValue)) {
      return cleanName(inlineValue);
    }

    for (const nextLine of [lines[index + 1], lines[index + 2]]) {
      if (nextLine && isProbableName(nextLine)) {
        return cleanName(nextLine);
      }
    }
  }

  return null;
}

function extractInlineLabelValue(value: string) {
  return value.split(/[:-]/).slice(1).join(' ').trim();
}

function normalizeOcrLine(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function normalizeLabel(value: string) {
  return normalizeOcrLine(value)
    .split('')
    .map((character) => LETTER_REPAIRS[character] ?? character)
    .join('')
    .replace(/[^A-Z0-9]/g, '');
}

function hasAnyLabel(value: string, labels: string[]) {
  const normalized = normalizeLabel(value);

  return labels.some((label) => normalized.includes(normalizeLabel(label)));
}

function isIgnoredDocumentToken(value: string) {
  const normalized = normalizeLabel(value);
  const ignoredTokens = new Set([
    ...DOCUMENT_NUMBER_LABELS.map(normalizeLabel),
    'REPUBLICA',
    'PANAMA',
    'PERSONAL',
    'TRIBUNAL',
    'ELECTORAL',
  ]);

  return ignoredTokens.has(normalized);
}

function looksLikeDocumentPrefix(value = '') {
  return /^(?:P[E3O0]?|A[VY]|[EN]|1[0-3]|[1-9BISZGO])$/.test(value);
}

function looksLikeDocumentDigits(value = '') {
  return /^[A-Z0-9]{1,8}$/.test(value) && /[\dBISZGOQL]/.test(value);
}

function repairDocumentNumber(value: string) {
  const parts = value
    .toUpperCase()
    .replace(/[.:]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9-]/g, '')
    .split('-')
    .filter(Boolean);

  if (parts.length >= 3) {
    const [firstPart, secondPart, ...restParts] = parts;
    const prefix = repairDocumentPrefix(firstPart);
    const second = repairDigits(secondPart);
    const third = repairDigits(restParts.join(''));
    const candidate = `${prefix}-${second}-${third}`;

    return isValidDocumentNumber(candidate) ? candidate : null;
  }

  const compact = parts.join('');

  if (!/\d|[BISZGOQL]/.test(compact)) {
    return null;
  }

  const repairedCompact = repairDigits(compact);

  if (/^\d{6,12}$/.test(repairedCompact)) {
    return repairedCompact;
  }

  return null;
}

function repairDocumentPrefix(value = '') {
  const compact = value.replace(/[^A-Z0-9]/g, '');
  const letterLike = compact
    .split('')
    .map((character) => LETTER_REPAIRS[character] ?? character)
    .join('');

  if (letterLike.startsWith('PE') || letterLike.startsWith('PO')) {
    return 'PE';
  }

  if (letterLike.startsWith('AV') || letterLike.startsWith('AY')) {
    return 'AV';
  }

  if (letterLike === 'E' || letterLike === 'N') {
    return letterLike;
  }

  return repairDigits(compact);
}

function repairDigits(value = '') {
  return value
    .split('')
    .map((character) =>
      /\d/.test(character) ? character : DIGIT_REPAIRS[character] ?? character,
    )
    .join('');
}

function isValidDocumentNumber(value: string) {
  return /^(?:PE|E|N|AV|[1-9]|1[0-3])-\d{1,4}-\d{1,8}$/.test(value);
}

function scoreDocumentNumber(value: string) {
  let score = 0;

  if (isValidDocumentNumber(value)) {
    score += 20;
  }

  if (value.includes('-')) {
    score += 8;
  }

  if (/^(?:PE|E|N|AV)-/.test(value)) {
    score += 6;
  }

  return score + Math.min(value.length, 16);
}

function isProbableName(value: string) {
  const cleaned = cleanName(value);

  return /^[A-Z\s]{2,}$/.test(cleaned) && cleaned.length >= 2;
}

function cleanName(value: string) {
  return value
    .split('')
    .map((character) => LETTER_REPAIRS[character] ?? character)
    .join('')
    .replace(/[^A-Z\s]/g, '')
    .replace(/\b(?:NOMBRES?|APELLIDOS?|SURNAME|SURNAMES|NAME|GIVEN|LAST)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
