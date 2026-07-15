import {
  centsToString,
  type MoneyInput,
  normalizeCurrency,
  toCents,
} from './money.js';

export type NegotiationAdjustmentCategory =
  | 'MATERIALS'
  | 'IMPROVEMENTS'
  | 'ASSIGNMENT'
  | 'OTHER';

export type NegotiationAdjustmentDirection = 'INCREASE' | 'DECREASE';

export type NegotiationAdjustmentInput = {
  id?: string;
  category: NegotiationAdjustmentCategory;
  label: string;
  amountCents: MoneyInput;
  direction: NegotiationAdjustmentDirection;
  appliesTo?: string;
  notes?: string;
};

export type NegotiationAdjustmentOutput = {
  id: string;
  category: NegotiationAdjustmentCategory;
  label: string;
  amountCents: string;
  currency: string;
  direction: NegotiationAdjustmentDirection;
  appliesTo?: string;
  notes?: string;
  effect: 'REFERENCE_ONLY';
};

export type NegotiationAdjustmentCalculation = {
  currency: string;
  items: NegotiationAdjustmentOutput[];
  increaseTotalCents: string;
  decreaseTotalCents: string;
  netReferenceCents: string;
  errors: string[];
  warnings: string[];
};

const adjustmentCategories = new Set<NegotiationAdjustmentCategory>([
  'MATERIALS',
  'IMPROVEMENTS',
  'ASSIGNMENT',
  'OTHER',
]);

const adjustmentDirections = new Set<NegotiationAdjustmentDirection>([
  'INCREASE',
  'DECREASE',
]);

export function calculateNegotiationAdjustments(input: {
  currency?: string;
  adjustments?: NegotiationAdjustmentInput[];
}): NegotiationAdjustmentCalculation {
  const currency = normalizeCurrency(input.currency ?? 'USD');
  const errors: string[] = [];
  const warnings: string[] = [];
  const items: NegotiationAdjustmentOutput[] = [];

  for (const [index, adjustment] of (input.adjustments ?? []).entries()) {
    const label = adjustment.label?.trim();

    if (!label) {
      errors.push(`El ajuste ${index + 1} necesita un concepto.`);
      continue;
    }

    if (!adjustmentCategories.has(adjustment.category)) {
      errors.push(`La categoría de ${label} no es válida.`);
      continue;
    }

    if (!adjustmentDirections.has(adjustment.direction)) {
      errors.push(`El sentido de ${label} no es válido.`);
      continue;
    }

    let amount: bigint;

    try {
      amount = toCents(adjustment.amountCents, `adjustment[${index}].amountCents`);
    } catch {
      errors.push(`El monto de ${label} debe expresarse en centavos enteros.`);
      continue;
    }

    if (amount <= 0n) {
      errors.push(`El monto referencial de ${label} debe ser mayor que cero.`);
      continue;
    }

    items.push({
      id: adjustment.id?.trim() || `adjustment-${index + 1}`,
      category: adjustment.category,
      label,
      amountCents: centsToString(amount),
      currency,
      direction: adjustment.direction,
      appliesTo: adjustment.appliesTo?.trim() || undefined,
      notes: adjustment.notes?.trim() || undefined,
      effect: 'REFERENCE_ONLY',
    });
  }

  const increaseTotal = items
    .filter((item) => item.direction === 'INCREASE')
    .reduce((total, item) => total + BigInt(item.amountCents), 0n);
  const decreaseTotal = items
    .filter((item) => item.direction === 'DECREASE')
    .reduce((total, item) => total + BigInt(item.amountCents), 0n);

  if (items.length > 0) {
    warnings.push(
      'Los ajustes son referenciales y no modifican automáticamente el total contractual ni el plan de pagos.',
    );
  }

  return {
    currency,
    items,
    increaseTotalCents: centsToString(increaseTotal),
    decreaseTotalCents: centsToString(decreaseTotal),
    netReferenceCents: centsToString(increaseTotal - decreaseTotal),
    errors,
    warnings,
  };
}
