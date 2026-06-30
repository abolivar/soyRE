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
  const lines = text
    .split(/\r?\n/)
    .map(normalizeMrzLine)
    .filter((line) => line.length >= 25 && line.includes('<'));

  for (let index = 0; index < lines.length - 1; index += 1) {
    const firstLine = lines[index];
    const secondLine = lines[index + 1];

    if (firstLine?.startsWith('P') && secondLine && secondLine.length >= 35) {
      return `${fitMrzLine(firstLine)}\n${fitMrzLine(secondLine)}`;
    }
  }

  return null;
}

export function parsePassportMrz(mrz: string): PassportMrzData {
  const [firstLine, secondLine] = mrz
    .split(/\r?\n/)
    .map(normalizeMrzLine)
    .map(fitMrzLine);

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

function normalizeMrzLine(value: string) {
  return value
    .toUpperCase()
    .replace(/[«‹]/g, '<')
    .replace(/\s/g, '')
    .replace(/[^A-Z0-9<]/g, '');
}

function fitMrzLine(value: string) {
  return value.slice(0, 44).padEnd(44, '<');
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
    throw new Error(`La MRZ no tiene digito de verificacion valido para ${fieldLabel}.`);
  }

  if (calculateMrzCheckDigit(value) !== checkDigit) {
    throw new Error(`La MRZ tiene digito de verificacion invalido en ${fieldLabel}.`);
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
