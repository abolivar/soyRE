import { centsToString, type MoneyInput, toCents } from './money.js';

export type CompensationLedgerStatus =
  | 'AVAILABLE_FOR_COMPENSATION'
  | 'PARTIALLY_APPLIED'
  | 'APPLIED';

export function calculateDisbursementBalance(input: {
  originalAmountCents: MoneyInput;
  paidAmountCents?: MoneyInput;
  appliedAmountCents?: MoneyInput;
}) {
  const original = toCents(input.originalAmountCents, 'originalAmountCents');
  const paid = toCents(input.paidAmountCents ?? 0, 'paidAmountCents');
  const applied = toCents(input.appliedAmountCents ?? 0, 'appliedAmountCents');

  if (original <= 0n) {
    throw new Error('El valor original de la erogación debe ser mayor que cero.');
  }

  if (paid < 0n || applied < 0n || paid + applied > original) {
    throw new Error('Los valores pagado y aplicado exceden la erogación original.');
  }

  return {
    appliedAmountCents: centsToString(applied),
    originalAmountCents: centsToString(original),
    paidAmountCents: centsToString(paid),
    remainingAmountCents: centsToString(original - paid - applied),
  };
}

export function applyCompensation(input: {
  originalAmountCents: MoneyInput;
  paidAmountCents?: MoneyInput;
  appliedAmountCents?: MoneyInput;
  amountCents: MoneyInput;
}) {
  const current = calculateDisbursementBalance(input);
  const amount = toCents(input.amountCents, 'amountCents');
  const remaining = BigInt(current.remainingAmountCents);

  if (amount <= 0n) {
    throw new Error('El monto a compensar debe ser mayor que cero.');
  }

  if (amount > remaining) {
    throw new Error('La compensación supera el saldo disponible.');
  }

  const applied = BigInt(current.appliedAmountCents) + amount;
  const nextRemaining = remaining - amount;

  return {
    appliedAmountCents: centsToString(applied),
    appliedNowCents: centsToString(amount),
    remainingAmountCents: centsToString(nextRemaining),
    status: (nextRemaining === 0n ? 'APPLIED' : 'PARTIALLY_APPLIED') as CompensationLedgerStatus,
  };
}

export function reverseCompensation(input: {
  originalAmountCents: MoneyInput;
  paidAmountCents?: MoneyInput;
  appliedAmountCents: MoneyInput;
  amountCents: MoneyInput;
}) {
  const current = calculateDisbursementBalance(input);
  const amount = toCents(input.amountCents, 'amountCents');
  const applied = BigInt(current.appliedAmountCents);

  if (amount <= 0n || amount > applied) {
    throw new Error('El monto a reversar no es válido para esta erogación.');
  }

  const nextApplied = applied - amount;
  const remaining = BigInt(current.remainingAmountCents) + amount;

  return {
    appliedAmountCents: centsToString(nextApplied),
    remainingAmountCents: centsToString(remaining),
    reversedAmountCents: centsToString(amount),
    status: (nextApplied === 0n
      ? 'AVAILABLE_FOR_COMPENSATION'
      : 'PARTIALLY_APPLIED') as CompensationLedgerStatus,
  };
}

export function assertSameCurrency(source: string, destination: string) {
  if (source.trim().toUpperCase() !== destination.trim().toUpperCase()) {
    throw new Error('La operación origen y destino deben usar la misma moneda.');
  }
}
