export type NationalIdOcrData = {
  documentNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  rawText: string;
};

const DOCUMENT_NUMBER_PATTERNS = [
  /\b(?:PE|E|N|AV|[1-9]|1[0-3])[-\s]\d{1,4}[-\s]\d{1,7}\b/i,
  /\b\d{6,12}\b/,
];

export function parseNationalIdOcr(text: string): NationalIdOcrData {
  const lines = normalizeLines(text);

  return {
    documentNumber: findDocumentNumber(lines),
    firstName: findLabeledValue(lines, ['NOMBRES', 'NOMBRE', 'NAME']),
    lastName: findLabeledValue(lines, ['APELLIDOS', 'APELLIDO', 'SURNAME']),
    rawText: lines.join('\n'),
  };
}

function normalizeLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) =>
      line
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean);
}

function findDocumentNumber(lines: string[]) {
  const joined = lines.join(' ');

  for (const pattern of DOCUMENT_NUMBER_PATTERNS) {
    const match = joined.match(pattern);

    if (match?.[0]) {
      return match[0].replace(/\s/g, '-').toUpperCase();
    }
  }

  return null;
}

function findLabeledValue(lines: string[], labels: string[]) {
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.toUpperCase() ?? '';
    const matchingLabel = labels.find((label) => line.includes(label));

    if (!matchingLabel) {
      continue;
    }

    const inlineValue = line
      .split(matchingLabel)
      .at(1)
      ?.replace(/^[:\-\s]+/, '')
      .trim();

    if (inlineValue && isProbableName(inlineValue)) {
      return cleanName(inlineValue);
    }

    const nextLine = lines[index + 1];

    if (nextLine && isProbableName(nextLine)) {
      return cleanName(nextLine);
    }
  }

  return null;
}

function isProbableName(value: string) {
  return /^[A-Z\s]{2,}$/i.test(value) && !/\d/.test(value);
}

function cleanName(value: string) {
  return value.replace(/[^A-Z\s]/gi, '').replace(/\s+/g, ' ').trim().toUpperCase();
}
