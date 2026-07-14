export type NationalIdValidationResult =
  | { valid: true; documentNumber: string; issuingCountry: 'COL' | 'PAN' }
  | { valid: false; message: string };

export function validateNationalId(
  issuingCountry?: string | null,
  documentNumber?: string | null,
): NationalIdValidationResult {
  const country = issuingCountry?.trim().toUpperCase();
  const rawNumber = documentNumber?.trim();

  if (country !== 'COL' && country !== 'PAN') {
    return {
      valid: false,
      message: 'La cédula solo está habilitada para Colombia y Panamá.',
    };
  }

  if (!rawNumber) {
    return {
      valid: false,
      message: 'El número de cédula es obligatorio.',
    };
  }

  if (country === 'COL') {
    const normalized = rawNumber.replace(/[.\s-]/g, '');

    return /^\d{6,10}$/.test(normalized)
      ? { valid: true, documentNumber: normalized, issuingCountry: country }
      : {
          valid: false,
          message: 'La cédula de Colombia debe contener entre 6 y 10 dígitos.',
        };
  }

  const normalized = rawNumber.toUpperCase().replace(/\s/g, '');

  return /^(?:PE|E|N|AV|[1-9]|1[0-3])-\d{1,4}-\d{1,8}$/.test(normalized)
    ? { valid: true, documentNumber: normalized, issuingCountry: country }
    : {
        valid: false,
        message: 'La cédula de Panamá no tiene un formato válido.',
      };
}
