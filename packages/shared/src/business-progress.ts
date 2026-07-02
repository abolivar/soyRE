export type BusinessDraftProgressInput = Record<string, unknown> | null | undefined;

export type BusinessDraftProgressStep = {
  id:
    | 'mode'
    | 'clients'
    | 'property'
    | 'contract'
    | 'financial'
    | 'payments'
    | 'commissions'
    | 'automation';
  label: string;
  complete: boolean;
};

export type BusinessDraftProgress = {
  completedSteps: number;
  nextStepLabel: string | null;
  percent: number;
  steps: BusinessDraftProgressStep[];
  totalSteps: number;
};

export function calculateBusinessDraftProgress(
  draftData: BusinessDraftProgressInput,
): BusinessDraftProgress {
  const data = objectValue(draftData);
  const financial = objectValue(data.financial);
  const paymentPlan = objectValue(data.paymentPlan);
  const commissionPlan = objectValue(data.commissionPlan);
  const automations = objectValue(data.automations);
  const participants = [
    ...arrayValue(data.participants),
    ...arrayValue(data.clients),
  ].map(objectValue);

  const steps: BusinessDraftProgressStep[] = [
    {
      complete: Boolean(textValue(data.operationType) && textValue(data.currency)),
      id: 'mode',
      label: 'Tipo',
    },
    {
      complete: participants.some(
        (participant) =>
          Boolean(textValue(participant.clientId)) ||
          Boolean(textValue(participant.displayName)),
      ),
      id: 'clients',
      label: 'Clientes',
    },
    {
      complete: Boolean(textValue(data.propertyId)),
      id: 'property',
      label: 'Inmueble',
    },
    {
      complete: Boolean(textValue(data.contractTypeId)),
      id: 'contract',
      label: 'Contrato',
    },
    {
      complete:
        positiveCents(financial.totalContractAmountCents) ||
        positiveCents(financial.negotiatedPriceCents) ||
        positiveCents(financial.basePriceCents),
      id: 'financial',
      label: 'Montos',
    },
    {
      complete:
        Boolean(textValue(paymentPlan.preset)) &&
        (positiveCents(paymentPlan.totalAmountCents) ||
          positiveCents(financial.payableAmountCents) ||
          arrayValue(paymentPlan.specialLines).length > 0),
      id: 'payments',
      label: 'Pagos',
    },
    {
      complete:
        positiveNumber(commissionPlan.simpleCommissionBasisPoints) ||
        arrayValue(commissionPlan.rules).length > 0,
      id: 'commissions',
      label: 'Comisiones',
    },
    {
      complete: Object.keys(automations).length > 0,
      id: 'automation',
      label: 'Acciones',
    },
  ];
  const completedSteps = steps.filter((step) => step.complete).length;
  const nextStep = steps.find((step) => !step.complete) ?? null;

  return {
    completedSteps,
    nextStepLabel: nextStep?.label ?? null,
    percent: Math.round((completedSteps / steps.length) * 100),
    steps,
    totalSteps: steps.length,
  };
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function textValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function positiveCents(value: unknown) {
  if (typeof value === 'bigint') {
    return value > 0n;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0;
  }

  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    return BigInt(value.trim()) > 0n;
  }

  return false;
}

function positiveNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}
