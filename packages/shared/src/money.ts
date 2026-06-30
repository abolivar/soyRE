export type MoneyInput = bigint | number | string;

export function toCents(value: MoneyInput, field = 'amount'): bigint {
  if (typeof value === 'bigint') {
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new Error(`${field} must be integer cents.`);
    }

    return BigInt(value);
  }

  if (!/^-?\d+$/.test(value)) {
    throw new Error(`${field} must be integer cents.`);
  }

  return BigInt(value);
}

export function assertNonNegativeCents(value: bigint, field = 'amount') {
  if (value < 0n) {
    throw new Error(`${field} cannot be negative.`);
  }
}

export function centsToString(value: bigint) {
  return value.toString();
}

export function applyBasisPoints(amountCents: bigint, basisPoints: number) {
  if (!Number.isInteger(basisPoints)) {
    throw new Error('basisPoints must be an integer.');
  }

  return (amountCents * BigInt(basisPoints)) / 10000n;
}

export function normalizeCurrency(currency?: string) {
  const normalized = currency?.trim().toUpperCase();

  if (!normalized || !/^[A-Z]{3}$/.test(normalized)) {
    throw new Error('Currency must be a valid ISO-like 3 letter code.');
  }

  return normalized;
}
