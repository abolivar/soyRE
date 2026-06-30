import {
  assertNonNegativeCents,
  centsToString,
  MoneyInput,
  normalizeCurrency,
  toCents,
} from './money.js';

export type PaymentFrequency =
  | 'NONE'
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'SEMIANNUAL'
  | 'ANNUAL'
  | 'CUSTOM';

export type PaymentLineType =
  | 'RESERVATION'
  | 'DOWN_PAYMENT'
  | 'SIGNATURE'
  | 'REGULAR_INSTALLMENT'
  | 'SPECIAL_INSTALLMENT'
  | 'MILESTONE'
  | 'CLOSING'
  | 'HANDOVER'
  | 'ASSIGNMENT_FEE'
  | 'MATERIAL_ADJUSTMENT'
  | 'LATE_FEE'
  | 'OTHER';

export type PaymentPlanPreset =
  | 'CASH'
  | 'RESERVATION_SIGNATURE_BALANCE'
  | 'SIGNATURE_INSTALLMENTS'
  | 'REGULAR_INSTALLMENTS'
  | 'MILESTONE_BASED'
  | 'CUSTOM';

export type RoundingStrategy =
  | 'LAST_INSTALLMENT'
  | 'FIRST_INSTALLMENT'
  | 'DISTRIBUTE'
  | 'MANUAL';

export type PaymentPlanInput = {
  preset: PaymentPlanPreset;
  totalAmountCents: MoneyInput;
  currency?: string;
  startDate?: string;
  closingDate?: string;
  signatureDate?: string;
  dueDay?: number;
  frequency?: PaymentFrequency;
  installmentCount?: number;
  reservationAmountCents?: MoneyInput;
  signatureAmountCents?: MoneyInput;
  finalAmountCents?: MoneyInput;
  roundingStrategy?: RoundingStrategy;
  specialLines?: PaymentPlanInputLine[];
  milestones?: PaymentPlanInputLine[];
};

export type PaymentPlanInputLine = {
  label: string;
  lineType: PaymentLineType;
  amountCents?: MoneyInput;
  percentageBasisPoints?: number;
  dueDate?: string;
  dueEvent?: string;
  isManual?: boolean;
};

export type PaymentScheduleLineOutput = {
  sequence: number;
  label: string;
  lineType: PaymentLineType;
  amountCents: string;
  percentageBasisPoints?: number;
  dueDate?: string;
  dueEvent?: string;
  isManual: boolean;
  source: 'GENERATED' | 'USER_ADDED' | 'CONTRACT_CLAUSE' | 'ADJUSTMENT';
};

export type PaymentPlanCalculationOutput = {
  currency: string;
  totalAmountCents: string;
  generatedTotalCents: string;
  differenceCents: string;
  roundingStrategy: RoundingStrategy;
  lines: PaymentScheduleLineOutput[];
  warnings: string[];
  errors: string[];
};

export function calculatePaymentPlan(
  input: PaymentPlanInput,
): PaymentPlanCalculationOutput {
  const currency = normalizeCurrency(input.currency ?? 'USD');
  const totalAmount = toCents(input.totalAmountCents, 'totalAmountCents');
  const warnings: string[] = [];
  const errors: string[] = [];
  const roundingStrategy = input.roundingStrategy ?? 'LAST_INSTALLMENT';

  try {
    assertNonNegativeCents(totalAmount, 'totalAmountCents');
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Invalid total amount.');
  }

  const generated: Array<Omit<PaymentScheduleLineOutput, 'sequence'>> = [];

  if (errors.length === 0) {
    try {
      switch (input.preset) {
        case 'CASH':
          generated.push({
            amountCents: centsToString(totalAmount),
            dueDate: input.closingDate,
            isManual: false,
            label: 'Pago contado',
            lineType: 'CLOSING',
            source: 'GENERATED',
          });
          break;
        case 'RESERVATION_SIGNATURE_BALANCE':
          generated.push(
            ...reservationSignatureBalanceLines(input, totalAmount),
          );
          break;
        case 'SIGNATURE_INSTALLMENTS':
          generated.push(...signatureInstallmentLines(input, totalAmount));
          break;
        case 'REGULAR_INSTALLMENTS':
          generated.push(...regularInstallmentLines(input, totalAmount, 0n));
          break;
        case 'MILESTONE_BASED':
          generated.push(...milestoneLines(input, totalAmount));
          break;
        case 'CUSTOM':
          generated.push(...manualLines(input.specialLines ?? [], totalAmount));
          break;
        default:
          errors.push('Unsupported payment plan preset.');
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Payment plan error.');
    }
  }

  if (input.specialLines?.length && input.preset !== 'CUSTOM') {
    generated.push(...manualLines(input.specialLines, totalAmount));
  }

  const lines = generated
    .map((line, index) => ({ ...line, sequence: index + 1 }))
    .sort((a, b) => {
      const left = a.dueDate ?? a.dueEvent ?? '';
      const right = b.dueDate ?? b.dueEvent ?? '';
      return left.localeCompare(right) || a.sequence - b.sequence;
    })
    .map((line, index) => ({ ...line, sequence: index + 1 }));

  const generatedTotal = lines.reduce(
    (total, line) => total + toCents(line.amountCents),
    0n,
  );
  const difference = totalAmount - generatedTotal;

  if (difference !== 0n) {
    errors.push('Payment schedule does not match the payable amount.');
  }

  if (lines.some((line) => toCents(line.amountCents) === 0n)) {
    warnings.push('Payment schedule contains zero amount lines.');
  }

  if (input.closingDate && input.signatureDate && input.closingDate < input.signatureDate) {
    errors.push('Closing date cannot be before signature date.');
  }

  return {
    currency,
    differenceCents: centsToString(difference),
    errors,
    generatedTotalCents: centsToString(generatedTotal),
    lines,
    roundingStrategy,
    totalAmountCents: centsToString(totalAmount),
    warnings,
  };
}

function reservationSignatureBalanceLines(
  input: PaymentPlanInput,
  totalAmount: bigint,
) {
  const reservationAmount = toCents(
    input.reservationAmountCents ?? 0,
    'reservationAmountCents',
  );
  const signatureAmount = toCents(
    input.signatureAmountCents ?? 0,
    'signatureAmountCents',
  );

  assertNonNegativeCents(reservationAmount, 'reservationAmountCents');
  assertNonNegativeCents(signatureAmount, 'signatureAmountCents');

  const balance = totalAmount - reservationAmount - signatureAmount;
  assertNonNegativeCents(balance, 'balanceAmountCents');

  return [
    {
      amountCents: centsToString(reservationAmount),
      dueDate: input.startDate,
      isManual: false,
      label: 'Reserva',
      lineType: 'RESERVATION' as const,
      source: 'GENERATED' as const,
    },
    {
      amountCents: centsToString(signatureAmount),
      dueDate: input.signatureDate,
      isManual: false,
      label: 'Pago a la firma',
      lineType: 'SIGNATURE' as const,
      source: 'GENERATED' as const,
    },
    {
      amountCents: centsToString(balance),
      dueDate: input.closingDate,
      isManual: false,
      label: 'Saldo al cierre',
      lineType: 'CLOSING' as const,
      source: 'GENERATED' as const,
    },
  ];
}

function signatureInstallmentLines(input: PaymentPlanInput, totalAmount: bigint) {
  const signatureAmount = toCents(
    input.signatureAmountCents ?? 0,
    'signatureAmountCents',
  );
  assertNonNegativeCents(signatureAmount, 'signatureAmountCents');
  const installmentBase = totalAmount - signatureAmount;
  assertNonNegativeCents(installmentBase, 'installmentBaseCents');

  return [
    {
      amountCents: centsToString(signatureAmount),
      dueDate: input.signatureDate,
      isManual: false,
      label: 'Pago a la firma',
      lineType: 'SIGNATURE' as const,
      source: 'GENERATED' as const,
    },
    ...regularInstallmentLines(input, installmentBase, 1n),
  ];
}

function regularInstallmentLines(
  input: PaymentPlanInput,
  totalAmount: bigint,
  sequenceOffset: bigint,
) {
  const count = input.installmentCount ?? 0;

  if (!Number.isInteger(count) || count <= 0) {
    throw new Error('Installment count must be greater than zero.');
  }

  const base = totalAmount / BigInt(count);
  const remainder = totalAmount % BigInt(count);
  const startDate = parseDate(input.startDate, 'startDate');

  return Array.from({ length: count }, (_, index) => {
    const extra =
      input.roundingStrategy === 'FIRST_INSTALLMENT'
        ? index === 0
        : index === count - 1;
    const amount = base + (extra ? remainder : 0n);
    const date = addFrequency(startDate, input.frequency ?? 'MONTHLY', index);

    return {
      amountCents: centsToString(amount),
      dueDate: applyDueDay(date, input.dueDay),
      isManual: false,
      label: `Cuota ${index + 1}`,
      lineType: 'REGULAR_INSTALLMENT' as const,
      source: 'GENERATED' as const,
    };
  }).map((line, index) => ({
    ...line,
    label: `Cuota ${Number(sequenceOffset) + index + 1}`,
  }));
}

function milestoneLines(input: PaymentPlanInput, totalAmount: bigint) {
  return manualLines(input.milestones ?? [], totalAmount, 'GENERATED');
}

function manualLines(
  lines: PaymentPlanInputLine[],
  totalAmount: bigint,
  source: PaymentScheduleLineOutput['source'] = 'USER_ADDED',
) {
  return lines.map((line) => {
    const amount =
      line.amountCents !== undefined
        ? toCents(line.amountCents, 'line.amountCents')
        : percentageAmount(totalAmount, line.percentageBasisPoints);

    assertNonNegativeCents(amount, 'line.amountCents');

    return {
      amountCents: centsToString(amount),
      dueDate: line.dueDate,
      dueEvent: line.dueEvent,
      isManual: line.isManual ?? source === 'USER_ADDED',
      label: line.label,
      lineType: line.lineType,
      percentageBasisPoints: line.percentageBasisPoints,
      source,
    };
  });
}

function percentageAmount(totalAmount: bigint, basisPoints?: number) {
  if (!basisPoints || basisPoints <= 0 || basisPoints > 10000) {
    throw new Error('Line percentage must be greater than zero and up to 100%.');
  }

  return (totalAmount * BigInt(basisPoints)) / 10000n;
}

function parseDate(value: string | undefined, field: string) {
  if (!value) {
    throw new Error(`${field} is required.`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${field} is invalid.`);
  }

  return date;
}

function addFrequency(date: Date, frequency: PaymentFrequency, index: number) {
  const next = new Date(date);

  switch (frequency) {
    case 'WEEKLY':
      next.setUTCDate(date.getUTCDate() + index * 7);
      break;
    case 'BIWEEKLY':
      next.setUTCDate(date.getUTCDate() + index * 14);
      break;
    case 'MONTHLY':
      next.setUTCMonth(date.getUTCMonth() + index);
      break;
    case 'QUARTERLY':
      next.setUTCMonth(date.getUTCMonth() + index * 3);
      break;
    case 'SEMIANNUAL':
      next.setUTCMonth(date.getUTCMonth() + index * 6);
      break;
    case 'ANNUAL':
      next.setUTCFullYear(date.getUTCFullYear() + index);
      break;
    case 'NONE':
    case 'CUSTOM':
      break;
    default:
      throw new Error('Unsupported payment frequency.');
  }

  return next;
}

function applyDueDay(date: Date, dueDay?: number) {
  if (dueDay !== undefined) {
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
      throw new Error('Due day must be between 1 and 31.');
    }

    const lastDay = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
    ).getUTCDate();
    date.setUTCDate(Math.min(dueDay, lastDay));
  }

  return date.toISOString().slice(0, 10);
}
