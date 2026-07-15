import {
  applyBasisPoints,
  assertNonNegativeCents,
  centsToString,
  MoneyInput,
  normalizeCurrency,
  toCents,
} from './money.js';

export type CommissionPlanMode = 'SIMPLE' | 'ADVANCED';
export type CommissionBase = 'SALE_PRICE' | 'NEGOTIATED_PRICE' | 'COLLECTED_AMOUNT' | 'NET_AMOUNT' | 'CUSTOM_AMOUNT';
export type CommissionCalculationType =
  | 'PERCENTAGE_OF_SALE'
  | 'PERCENTAGE_OF_COMMISSION'
  | 'FIXED_AMOUNT'
  | 'TIERED'
  | 'SLIDING_SCALE'
  | 'CAPPED'
  | 'CUSTOM';
export type CommissionReleaseTrigger =
  | 'ON_SIGNATURE'
  | 'ON_CLOSING'
  | 'ON_COLLECTION'
  | 'BY_PAYMENT_LINE'
  | 'MANUAL_APPROVAL';

export type CommissionPlanInput = {
  mode: CommissionPlanMode;
  currency?: string;
  commissionBase: CommissionBase;
  baseAmountCents: MoneyInput;
  simpleCommissionBasisPoints?: number;
  collectedAmountCents?: MoneyInput;
  rules: CommissionRuleInput[];
};

export type CommissionRuleInput = {
  participantKey: string;
  recipientType:
    | 'AGENT'
    | 'CO_AGENT'
    | 'REFERRER'
    | 'BROKER'
    | 'COMPANY'
    | 'EXTERNAL'
    | 'OTHER';
  label: string;
  calculationType: CommissionCalculationType;
  percentageBasisPoints?: number;
  fixedAmountCents?: MoneyInput;
  capAmountCents?: MoneyInput;
  minAmountCents?: MoneyInput;
  appliesAfterDeductions?: boolean;
  releaseTrigger?: CommissionReleaseTrigger;
};

export type CommissionAllocationOutput = {
  participantKey: string;
  recipientType: CommissionRuleInput['recipientType'];
  label: string;
  calculationType: CommissionCalculationType;
  percentageBasisPoints?: number;
  fixedAmountCents?: string;
  payableAmountCents: string;
  releaseTrigger: CommissionReleaseTrigger;
  status: 'PENDING';
};

export type CommissionPlanCalculationOutput = {
  currency: string;
  baseAmountCents: string;
  totalCommissionAmountCents: string;
  payableNowCents: string;
  allocations: CommissionAllocationOutput[];
  warnings: string[];
  errors: string[];
};

export function calculateCommissionPlan(
  input: CommissionPlanInput,
): CommissionPlanCalculationOutput {
  const currency = normalizeCurrency(input.currency ?? 'USD');
  const baseAmount = toCents(input.baseAmountCents, 'baseAmountCents');
  const collectedAmount =
    input.collectedAmountCents !== undefined
      ? toCents(input.collectedAmountCents, 'collectedAmountCents')
      : baseAmount;
  const warnings: string[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  try {
    assertNonNegativeCents(baseAmount, 'baseAmountCents');
    assertNonNegativeCents(collectedAmount, 'collectedAmountCents');
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'El monto de comisión no es válido.');
  }

  for (const rule of input.rules) {
    if (!rule.participantKey.trim()) {
      errors.push(`La regla ${rule.label} necesita un receptor registrado.`);
      continue;
    }

    const duplicateKey = `${rule.participantKey}:${rule.recipientType}`;

    if (seen.has(duplicateKey)) {
      errors.push(`La asignación de comisión para ${rule.label} está duplicada.`);
    }

    seen.add(duplicateKey);
  }

  const grossCommission = resolveGrossCommission(input, baseAmount, errors);
  const allocations: CommissionAllocationOutput[] = [];
  let remainingCommission = grossCommission;

  for (const rule of input.rules) {
    try {
      const amount = calculateRuleAmount(rule, baseAmount, grossCommission);
      const capped = applyCapAndMin(rule, amount);
      remainingCommission -= rule.appliesAfterDeductions ? capped : 0n;

      if (capped > grossCommission && rule.calculationType !== 'PERCENTAGE_OF_SALE') {
        warnings.push(`${rule.label} supera la comisión bruta.`);
      }

      allocations.push({
        calculationType: rule.calculationType,
        fixedAmountCents:
          rule.fixedAmountCents === undefined
            ? undefined
            : centsToString(toCents(rule.fixedAmountCents)),
        label: rule.label,
        participantKey: rule.participantKey,
        payableAmountCents: centsToString(capped),
        percentageBasisPoints: rule.percentageBasisPoints,
        recipientType: rule.recipientType,
        releaseTrigger: rule.releaseTrigger ?? 'ON_CLOSING',
        status: 'PENDING',
      });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'La regla de comisión no es válida.');
    }
  }

  if (input.mode === 'SIMPLE' && allocations.length !== 1) {
    errors.push('El modo de comisión simple requiere exactamente una asignación.');
  }

  if (remainingCommission < 0n) {
    errors.push('Las deducciones de comisión superan la comisión bruta.');
  }

  const total = allocations.reduce(
    (sum, allocation) => sum + toCents(allocation.payableAmountCents),
    0n,
  );
  const payableNow =
    input.commissionBase === 'COLLECTED_AMOUNT' && baseAmount > 0n
      ? (total * collectedAmount) / baseAmount
      : total;

  if (total > baseAmount) {
    warnings.push('La comisión total supera la base de cálculo.');
  }

  return {
    allocations,
    baseAmountCents: centsToString(baseAmount),
    currency,
    errors,
    payableNowCents: centsToString(payableNow),
    totalCommissionAmountCents: centsToString(total),
    warnings,
  };
}

function resolveGrossCommission(
  input: CommissionPlanInput,
  baseAmount: bigint,
  errors: string[],
) {
  if (input.simpleCommissionBasisPoints !== undefined) {
    validateBasisPoints(input.simpleCommissionBasisPoints, 'Simple commission');
    return applyBasisPoints(baseAmount, input.simpleCommissionBasisPoints);
  }

  const firstSalePercentage = input.rules.find(
    (rule) => rule.calculationType === 'PERCENTAGE_OF_SALE',
  );

  if (!firstSalePercentage?.percentageBasisPoints) {
    errors.push('Se requiere un porcentaje de venta o de comisión simple.');
    return 0n;
  }

  validateBasisPoints(firstSalePercentage.percentageBasisPoints, firstSalePercentage.label);
  return applyBasisPoints(baseAmount, firstSalePercentage.percentageBasisPoints);
}

function calculateRuleAmount(
  rule: CommissionRuleInput,
  baseAmount: bigint,
  grossCommission: bigint,
) {
  switch (rule.calculationType) {
    case 'PERCENTAGE_OF_SALE':
      validateBasisPoints(rule.percentageBasisPoints, rule.label);
      return applyBasisPoints(baseAmount, rule.percentageBasisPoints);
    case 'PERCENTAGE_OF_COMMISSION':
      validateBasisPoints(rule.percentageBasisPoints, rule.label);
      return applyBasisPoints(grossCommission, rule.percentageBasisPoints);
    case 'FIXED_AMOUNT': {
      const fixedAmount = toCents(rule.fixedAmountCents ?? 0, `${rule.label} fixedAmountCents`);
      assertNonNegativeCents(fixedAmount, `${rule.label} fixedAmountCents`);
      return fixedAmount;
    }
    case 'CAPPED':
      validateBasisPoints(rule.percentageBasisPoints, rule.label);
      return applyBasisPoints(baseAmount, rule.percentageBasisPoints);
    case 'TIERED':
    case 'SLIDING_SCALE':
    case 'CUSTOM':
      throw new Error(`${rule.calculationType} requiere un motor personalizado futuro.`);
    default:
      throw new Error('El tipo de cálculo de comisión no está soportado.');
  }
}

function applyCapAndMin(rule: CommissionRuleInput, amount: bigint) {
  const cap =
    rule.capAmountCents !== undefined
      ? toCents(rule.capAmountCents, `${rule.label} capAmountCents`)
      : null;
  const min =
    rule.minAmountCents !== undefined
      ? toCents(rule.minAmountCents, `${rule.label} minAmountCents`)
      : null;

  if (cap !== null) {
    assertNonNegativeCents(cap, `${rule.label} capAmountCents`);
    amount = amount > cap ? cap : amount;
  }

  if (min !== null) {
    assertNonNegativeCents(min, `${rule.label} minAmountCents`);
    amount = amount < min ? min : amount;
  }

  return amount;
}

function validateBasisPoints(value: number | undefined, label: string): asserts value is number {
  if (
    value === undefined ||
    !Number.isInteger(value) ||
    value <= 0 ||
    value > 10000
  ) {
    throw new Error(`El porcentaje de ${label} debe ser mayor que 0 y hasta 100%.`);
  }
}
