'use client';

import {
  AlertTriangle,
  Banknote,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  FileText,
  HandCoins,
  Home,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  ShieldCheck,
  Sparkles,
  UserRoundPlus,
  Users,
  Workflow,
  X,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  apiFetch,
  AuthMembership,
  AuthUser,
  BusinessContextAgent,
  BusinessContextClient,
  BusinessContextProperty,
  BusinessContextResponse,
  BusinessDraftResponse,
  BusinessMode,
  BusinessOperationType,
  BusinessParticipantRole,
  BusinessPreview,
  BusinessRecord,
  BusinessValidationItem,
  ClientRole,
  CommissionPlanCalculation,
  CreateClientPayload,
  OrganizationClient,
  PaymentPlanCalculation,
} from '../lib/api';
import {
  ErrorState,
  LoadingState,
  PageHeader,
  SectionPanel,
  StatusBadge,
} from '@soyre/ui';

type WizardStepId =
  | 'mode'
  | 'clients'
  | 'property'
  | 'contract'
  | 'financial'
  | 'payments'
  | 'commissions'
  | 'automation'
  | 'review';

type BusinessParticipantDraft = {
  participantKey: string;
  clientId?: string;
  realEstateAgentId?: string;
  displayName: string;
  email?: string | null;
  phone?: string | null;
  documentId?: string | null;
  role: BusinessParticipantRole;
  isPrimary?: boolean;
  commissionEligible?: boolean;
};

type ClauseDraft = {
  clauseType: string;
  title: string;
  description?: string;
  calculationType: string;
  amountCents?: string;
  percentageBps?: number;
  appliesTo: string;
  triggerEvent: string;
  createsReceivable: boolean;
  requiresApproval: boolean;
};

type PaymentPlanDraft = {
  preset: string;
  totalAmountCents: string;
  reservationAmountCents: string;
  signatureAmountCents: string;
  installmentCount: number;
  frequency: string;
  startDate: string;
  signatureDate: string;
  closingDate: string;
  dueDay: number;
  roundingStrategy: string;
  specialLines: PaymentSpecialLineDraft[];
};

type PaymentSpecialLineDraft = {
  label: string;
  lineType: string;
  amountCents: string;
  dueDate: string;
};

type CommissionRuleDraft = {
  participantKey: string;
  recipientType: string;
  label: string;
  calculationType: string;
  percentageBasisPoints?: number;
  fixedAmountCents?: string;
  capAmountCents?: string;
  appliesAfterDeductions?: boolean;
  releaseTrigger: string;
};

type BusinessWizardData = {
  operationType: BusinessOperationType;
  mode: BusinessMode;
  currency: string;
  title: string;
  expectedSignatureDate: string;
  expectedClosingDate: string;
  notes: string;
  participants: BusinessParticipantDraft[];
  propertyId: string;
  contractTypeId: string;
  contract: {
    clauses: ClauseDraft[];
    legalNotes: string;
  };
  financial: {
    basePriceCents: string;
    negotiatedPriceCents: string;
    totalContractAmountCents: string;
    payableAmountCents: string;
    commissionBaseAmountCents: string;
  };
  paymentPlan: PaymentPlanDraft;
  commissionPlan: {
    commissionBase: string;
    baseAmountCents: string;
    simpleCommissionBasisPoints: number;
    releaseTrigger: string;
    rules: CommissionRuleDraft[];
  };
  automations: {
    paymentReminders: boolean;
    signatureTask: boolean;
    reviewTask: boolean;
    commissionReminders: boolean;
  };
};

type NewClientForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  legalId: string;
};

const steps: Array<{
  id: WizardStepId;
  label: string;
  icon: typeof BriefcaseBusiness;
}> = [
  { id: 'mode', label: 'Tipo', icon: BriefcaseBusiness },
  { id: 'clients', label: 'Clientes', icon: Users },
  { id: 'property', label: 'Inmueble', icon: Home },
  { id: 'contract', label: 'Contrato', icon: FileText },
  { id: 'financial', label: 'Montos', icon: Banknote },
  { id: 'payments', label: 'Pagos', icon: CircleDollarSign },
  { id: 'commissions', label: 'Comisiones', icon: HandCoins },
  { id: 'automation', label: 'Acciones', icon: Workflow },
  { id: 'review', label: 'Revision', icon: ClipboardCheck },
];

const clientRoleOptions: Array<{ value: BusinessParticipantRole; label: string }> = [
  { value: 'BUYER', label: 'Comprador' },
  { value: 'TENANT', label: 'Arrendatario' },
  { value: 'SELLER', label: 'Propietario' },
  { value: 'LANDLORD', label: 'Arrendador' },
  { value: 'GUARANTOR', label: 'Garante' },
  { value: 'LEGAL_REPRESENTATIVE', label: 'Representante' },
  { value: 'OTHER', label: 'Otro' },
];

const operationLabels: Record<BusinessOperationType, string> = {
  ASSIGNMENT: 'Cesion',
  OTHER: 'Otro',
  PRE_SALE: 'Preventa',
  RENT: 'Alquiler',
  RESERVATION: 'Reserva',
  SALE: 'Venta',
  SEPARATION: 'Separacion',
};

const presetLabels: Record<string, string> = {
  CASH: 'Contado',
  CUSTOM: 'Personalizado',
  MILESTONE_BASED: 'Por hitos',
  REGULAR_INSTALLMENTS: 'Cuotas regulares',
  RESERVATION_SIGNATURE_BALANCE: 'Reserva + firma + saldo',
  SIGNATURE_INSTALLMENTS: 'Firma + cuotas',
};

const releaseTriggerLabels: Record<string, string> = {
  BY_PAYMENT_LINE: 'Por cuota',
  MANUAL_APPROVAL: 'Aprobacion manual',
  ON_CLOSING: 'Al cierre',
  ON_COLLECTION: 'Contra cobro',
  ON_SIGNATURE: 'A la firma',
};

const defaultWizardData: BusinessWizardData = {
  operationType: 'SALE',
  mode: 'SIMPLE',
  currency: 'USD',
  title: '',
  expectedSignatureDate: '',
  expectedClosingDate: '',
  notes: '',
  participants: [],
  propertyId: '',
  contractTypeId: '',
  contract: {
    clauses: [],
    legalNotes: '',
  },
  financial: {
    basePriceCents: '0',
    negotiatedPriceCents: '0',
    totalContractAmountCents: '0',
    payableAmountCents: '0',
    commissionBaseAmountCents: '0',
  },
  paymentPlan: {
    preset: 'CASH',
    totalAmountCents: '0',
    reservationAmountCents: '0',
    signatureAmountCents: '0',
    installmentCount: 1,
    frequency: 'MONTHLY',
    startDate: '',
    signatureDate: '',
    closingDate: '',
    dueDay: 1,
    roundingStrategy: 'LAST_INSTALLMENT',
    specialLines: [],
  },
  commissionPlan: {
    commissionBase: 'NEGOTIATED_PRICE',
    baseAmountCents: '0',
    simpleCommissionBasisPoints: 300,
    releaseTrigger: 'ON_CLOSING',
    rules: [],
  },
  automations: {
    paymentReminders: true,
    signatureTask: true,
    reviewTask: true,
    commissionReminders: true,
  },
};

const emptyPaymentCalculation: PaymentPlanCalculation = {
  currency: 'USD',
  differenceCents: '0',
  errors: [],
  generatedTotalCents: '0',
  lines: [],
  roundingStrategy: 'LAST_INSTALLMENT',
  totalAmountCents: '0',
  warnings: [],
};

const emptyCommissionCalculation: CommissionPlanCalculation = {
  allocations: [],
  baseAmountCents: '0',
  currency: 'USD',
  errors: [],
  payableNowCents: '0',
  totalCommissionAmountCents: '0',
  warnings: [],
};

export function BusinessWizard() {
  const latestDataRef = useRef(defaultWizardData);
  const saveInFlightRef = useRef(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(
    null,
  );
  const [context, setContext] = useState<BusinessContextResponse | null>(null);
  const [draft, setDraft] = useState<BusinessRecord | null>(null);
  const [data, setData] = useState<BusinessWizardData>(defaultWizardData);
  const [activeStep, setActiveStep] = useState<WizardStepId>('mode');
  const [paymentCalculation, setPaymentCalculation] =
    useState<PaymentPlanCalculation>(emptyPaymentCalculation);
  const [commissionCalculation, setCommissionCalculation] =
    useState<CommissionPlanCalculation>(emptyCommissionCalculation);
  const [validation, setValidation] = useState<BusinessValidationItem[]>([]);
  const [preview, setPreview] = useState<BusinessPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [newClient, setNewClient] = useState<NewClientForm>({
    email: '',
    firstName: '',
    lastName: '',
    legalId: '',
    phone: '',
  });
  const [newAgentId, setNewAgentId] = useState('');
  const [commParticipantId, setCommParticipantId] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    latestDataRef.current = data;
  }, [data]);

  useEffect(() => {
    let isMounted = true;

    async function boot() {
      try {
        const auth = await apiFetch<{ user: AuthUser }>('/auth/me');
        const membership = activeMemberships(auth.user)[0];

        if (!membership) {
          throw new Error('No tienes una organizacion activa.');
        }

        const query = new URLSearchParams({
          organizationId: membership.organizationId,
        });
        const contextResponse = await apiFetch<BusinessContextResponse>(
          `/businesses/new/context?${query.toString()}`,
        );
        const draftResponse = await apiFetch<BusinessDraftResponse>(
          '/business-drafts',
          {
            body: JSON.stringify({
              currency: defaultWizardData.currency,
              mode: defaultWizardData.mode,
              operationType: defaultWizardData.operationType,
              organizationId: membership.organizationId,
              title: 'Nuevo negocio',
            }),
            method: 'POST',
          },
        );
        const merged = mergeWizardData(
          defaultWizardData,
          draftResponse.business.draftData,
        );

        if (!isMounted) {
          return;
        }

        setUser(auth.user);
        setActiveOrganizationId(membership.organizationId);
        setContext(contextResponse);
        setDraft(draftResponse.business);
        setData(merged);
        setIsDirty(false);
        setLastSavedAt(new Date(draftResponse.business.updatedAt));
      } catch (caught) {
        if (isMounted) {
          setError(
            caught instanceof Error ? caught.message : 'No se pudo iniciar el wizard.',
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    boot();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!draft || !isDirty) {
      return;
    }

    const handle = window.setTimeout(() => {
      void saveDraft();
    }, 1000);

    return () => window.clearTimeout(handle);
  }, [draft, isDirty, data]);

  useEffect(() => {
    if (!draft) {
      return;
    }

    const handle = window.setTimeout(() => {
      void refreshCalculations();
    }, 450);

    return () => window.clearTimeout(handle);
  }, [draft?.id, data]);

  const activeMembership = useMemo(
    () =>
      activeMemberships(user).find(
        (membership) => membership.organizationId === activeOrganizationId,
      ) ?? null,
    [activeOrganizationId, user],
  );
  const currentStepIndex = steps.findIndex((step) => step.id === activeStep);
  const selectedProperty = useMemo(
    () =>
      context?.properties.find((property) => property.id === data.propertyId) ??
      null,
    [context?.properties, data.propertyId],
  );
  const selectedContractType = useMemo(
    () =>
      context?.contractTypes.find(
        (contractType) => contractType.id === data.contractTypeId,
      ) ?? null,
    [context?.contractTypes, data.contractTypeId],
  );
  const primaryAgent = data.participants.find(
    (participant) => participant.role === 'PRIMARY_AGENT',
  );
  const validationCounts = useMemo(
    () => ({
      errors: validation.filter((item) => item.level === 'ERROR').length,
      warnings: validation.filter((item) => item.level === 'WARNING').length,
    }),
    [validation],
  );
  const visiblePaymentCalculation = paymentCalculation ?? emptyPaymentCalculation;
  const visibleCommissionCalculation =
    commissionCalculation ?? emptyCommissionCalculation;

  function updateData(patch: Partial<BusinessWizardData>) {
    setData((current) => {
      const merged = mergeWizardData(current, patch);
      return normalizeDerivedData(merged);
    });
    setIsDirty(true);
    setPreview(null);
    setSuccessMessage(null);
  }

  function updateFinancial(
    key: keyof BusinessWizardData['financial'],
    value: string,
  ) {
    updateData({
      financial: {
        ...data.financial,
        [key]: moneyToCents(value),
      },
    });
  }

  function updatePaymentPlan(
    key: keyof PaymentPlanDraft,
    value: PaymentPlanDraft[keyof PaymentPlanDraft],
  ) {
    updateData({
      paymentPlan: {
        ...data.paymentPlan,
        [key]: value,
      },
    });
  }

  function updateCommissionPlan(
    key: keyof BusinessWizardData['commissionPlan'],
    value: BusinessWizardData['commissionPlan'][keyof BusinessWizardData['commissionPlan']],
  ) {
    updateData({
      commissionPlan: {
        ...data.commissionPlan,
        [key]: value,
      },
    });
  }

  async function saveDraft() {
    if (!draft || saveInFlightRef.current) {
      return draft;
    }

    const payload = latestDataRef.current;
    const payloadFingerprint = JSON.stringify(payload);

    saveInFlightRef.current = true;
    setIsSaving(true);
    setFormError(null);

    try {
      const response = await apiFetch<BusinessDraftResponse>(
        `/business-drafts/${draft.id}`,
        {
          body: JSON.stringify({
            data: payload,
            version: draft.version,
          }),
          method: 'PATCH',
        },
      );

      setDraft(response.business);
      setLastSavedAt(new Date());

      if (JSON.stringify(latestDataRef.current) === payloadFingerprint) {
        setIsDirty(false);
      }

      return response.business;
    } catch (caught) {
      setFormError(
        caught instanceof Error ? caught.message : 'No se pudo guardar el borrador.',
      );
      return null;
    } finally {
      saveInFlightRef.current = false;
      setIsSaving(false);
    }
  }

  async function refreshCalculations() {
    if (!draft) {
      return;
    }

    setIsCalculating(true);
    setCalcError(null);

    try {
      const [paymentResponse, commissionResponse, validationResponse] =
        await Promise.all([
          apiFetch<{ paymentPlan: PaymentPlanCalculation }>(
            `/business-drafts/${draft.id}/calculate/payment-plan`,
            {
              body: JSON.stringify({ data }),
              method: 'POST',
            },
          ),
          apiFetch<{ commissionPlan: CommissionPlanCalculation }>(
            `/business-drafts/${draft.id}/calculate/commissions`,
            {
              body: JSON.stringify({ data }),
              method: 'POST',
            },
          ),
          apiFetch<{ validation: BusinessValidationItem[] }>(
            `/business-drafts/${draft.id}/validate`,
            {
              body: JSON.stringify({ data }),
              method: 'POST',
            },
          ),
        ]);

      setPaymentCalculation(paymentResponse.paymentPlan);
      setCommissionCalculation(commissionResponse.commissionPlan);
      setValidation(validationResponse.validation);
    } catch (caught) {
      setCalcError(
        caught instanceof Error ? caught.message : 'No se pudo recalcular.',
      );
    } finally {
      setIsCalculating(false);
    }
  }

  async function refreshPreview() {
    if (!draft) {
      return null;
    }

    await saveDraft();
    setIsPreviewing(true);
    setFormError(null);

    try {
      const response = await apiFetch<{ preview: BusinessPreview }>(
        `/business-drafts/${draft.id}/preview`,
        {
          body: JSON.stringify({ data: latestDataRef.current }),
          method: 'POST',
        },
      );

      setPreview(response.preview);
      setValidation(response.preview.validation);
      setPaymentCalculation(response.preview.paymentPlan);
      setCommissionCalculation(response.preview.commissionPlan);
      return response.preview;
    } catch (caught) {
      setFormError(
        caught instanceof Error ? caught.message : 'No se pudo generar el preview.',
      );
      return null;
    } finally {
      setIsPreviewing(false);
    }
  }

  async function commitBusiness() {
    if (!draft) {
      return;
    }

    const nextPreview = preview ?? (await refreshPreview());
    const hasBlockingErrors = nextPreview?.validation.some(
      (item) => item.level === 'ERROR',
    );

    if (hasBlockingErrors) {
      setFormError('Hay errores bloqueantes antes de confirmar.');
      setActiveStep('review');
      return;
    }

    setIsCommitting(true);
    setFormError(null);

    try {
      const savedDraft = await saveDraft();
      const response = await apiFetch<{
        business: BusinessRecord;
        preview: BusinessPreview;
      }>(`/business-drafts/${draft.id}/commit`, {
        body: JSON.stringify({
          idempotencyKey: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`,
          version: savedDraft?.version ?? draft.version,
        }),
        method: 'POST',
      });

      setDraft(response.business);
      setPreview(response.preview);
      setSuccessMessage(
        `Negocio ${response.business.code ?? response.business.id} confirmado como ${response.business.status}.`,
      );
    } catch (caught) {
      setFormError(
        caught instanceof Error ? caught.message : 'No se pudo confirmar el negocio.',
      );
    } finally {
      setIsCommitting(false);
    }
  }

  function addExistingClient(clientId: string) {
    const client = context?.clients.find((item) => item.id === clientId);

    if (!client) {
      return;
    }

    if (
      data.participants.some(
        (participant) =>
          participant.clientId === client.id &&
          ['BUYER', 'TENANT', 'SELLER', 'LANDLORD'].includes(participant.role),
      )
    ) {
      setClientError('Ese cliente ya esta agregado al negocio.');
      return;
    }

    const role = defaultClientRole(data.operationType);
    updateData({
      participants: [
        ...data.participants,
        {
          clientId: client.id,
          displayName: client.displayName,
          documentId: client.legalId,
          email: client.email,
          isPrimary: !data.participants.some((item) => item.clientId),
          participantKey: client.id,
          phone: client.phone,
          role,
        },
      ],
    });
    setClientError(null);
  }

  async function createInlineClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeOrganizationId) {
      return;
    }

    setClientError(null);

    try {
      const role = data.operationType === 'RENT' ? 'LESSEE' : 'BUYER';
      const payload: CreateClientPayload = {
        dataConsent: true,
        email: cleanText(newClient.email) ?? undefined,
        firstName: cleanText(newClient.firstName) ?? undefined,
        lastName: cleanText(newClient.lastName) ?? undefined,
        legalId: cleanText(newClient.legalId) ?? undefined,
        organizationId: activeOrganizationId,
        phone: cleanText(newClient.phone) ?? undefined,
        roles: [role as ClientRole],
        status: 'ACTIVE',
        type: 'PERSON',
      };
      const response = await apiFetch<{ client: OrganizationClient }>('/clients', {
        body: JSON.stringify(payload),
        method: 'POST',
      });
      const client: BusinessContextClient = {
        displayName: response.client.displayName,
        email: response.client.email,
        id: response.client.id,
        identityDocumentValidated: response.client.identityDocumentValidated,
        legalId: response.client.legalId,
        phone: response.client.phone,
        roles: response.client.roles,
      };

      setContext((current) =>
        current
          ? {
              ...current,
              clients: [client, ...current.clients],
            }
          : current,
      );
      addExistingClient(client.id);
      setNewClient({
        email: '',
        firstName: '',
        lastName: '',
        legalId: '',
        phone: '',
      });
    } catch (caught) {
      setClientError(
        caught instanceof Error ? caught.message : 'No se pudo crear el cliente.',
      );
    }
  }

  function setParticipantRole(
    participantKey: string,
    role: BusinessParticipantRole,
  ) {
    updateData({
      participants: data.participants.map((participant) =>
        participant.participantKey === participantKey
          ? { ...participant, role }
          : participant,
      ),
    });
  }

  function removeParticipant(participantKey: string) {
    updateData({
      commissionPlan: {
        ...data.commissionPlan,
        rules: data.commissionPlan.rules.filter(
          (rule) => rule.participantKey !== participantKey,
        ),
      },
      participants: data.participants.filter(
        (participant) => participant.participantKey !== participantKey,
      ),
    });
  }

  function selectProperty(propertyId: string) {
    const property = context?.properties.find((item) => item.id === propertyId);

    updateData({
      financial:
        property?.suggestedPriceCents &&
        allMoneyZero([
          data.financial.basePriceCents,
          data.financial.negotiatedPriceCents,
          data.financial.totalContractAmountCents,
          data.financial.payableAmountCents,
          data.financial.commissionBaseAmountCents,
        ])
          ? {
              basePriceCents: property.suggestedPriceCents,
              commissionBaseAmountCents: property.suggestedPriceCents,
              negotiatedPriceCents: property.suggestedPriceCents,
              payableAmountCents: property.suggestedPriceCents,
              totalContractAmountCents: property.suggestedPriceCents,
            }
          : data.financial,
      paymentPlan: {
        ...data.paymentPlan,
        totalAmountCents: property?.suggestedPriceCents ?? data.paymentPlan.totalAmountCents,
      },
      propertyId,
    });
  }

  function syncFinancialTotals(source: keyof BusinessWizardData['financial']) {
    const amount = data.financial[source];

    updateData({
      commissionPlan: {
        ...data.commissionPlan,
        baseAmountCents: amount,
      },
      financial: {
        ...data.financial,
        commissionBaseAmountCents: amount,
        negotiatedPriceCents: amount,
        payableAmountCents: amount,
        totalContractAmountCents: amount,
      },
      paymentPlan: {
        ...data.paymentPlan,
        totalAmountCents: amount,
      },
    });
  }

  function toggleClause(clauseType: string) {
    const exists = data.contract.clauses.some(
      (clause) => clause.clauseType === clauseType,
    );
    const clauses = exists
      ? data.contract.clauses.filter((clause) => clause.clauseType !== clauseType)
      : [...data.contract.clauses, defaultClause(clauseType)];

    updateData({
      contract: {
        ...data.contract,
        clauses,
      },
    });
  }

  function addPrimaryAgent(agentId: string) {
    const agent = context?.agents.find((item) => item.id === agentId);

    if (!agent) {
      return;
    }

    const nextParticipants = data.participants.filter(
      (participant) => participant.role !== 'PRIMARY_AGENT',
    );

    updateData({
      participants: [
        ...nextParticipants,
        agentParticipant(agent, 'PRIMARY_AGENT'),
      ],
    });
    setNewAgentId(agentId);
  }

  function addCommissionParticipant(agentId: string, role: BusinessParticipantRole) {
    const agent = context?.agents.find((item) => item.id === agentId);

    if (!agent) {
      return;
    }

    const key = `${agent.id}:${role}`;

    if (data.participants.some((item) => item.participantKey === key)) {
      return;
    }

    updateData({
      participants: [...data.participants, agentParticipant(agent, role, key)],
    });
  }

  function addSimpleRuleToAdvanced() {
    const agent = data.participants.find(
      (participant) => participant.role === 'PRIMARY_AGENT',
    );

    if (!agent) {
      setFormError('Selecciona un agente principal antes de crear reglas.');
      return;
    }

    updateData({
      commissionPlan: {
        ...data.commissionPlan,
        rules: [
          ...data.commissionPlan.rules,
          {
            calculationType: 'PERCENTAGE_OF_SALE',
            label: agent.displayName,
            participantKey: agent.participantKey,
            percentageBasisPoints: data.commissionPlan.simpleCommissionBasisPoints,
            recipientType: 'AGENT',
            releaseTrigger: data.commissionPlan.releaseTrigger,
          },
        ],
      },
    });
  }

  function updateCommissionRule(
    index: number,
    patch: Partial<CommissionRuleDraft>,
  ) {
    updateData({
      commissionPlan: {
        ...data.commissionPlan,
        rules: data.commissionPlan.rules.map((rule, itemIndex) =>
          itemIndex === index ? { ...rule, ...patch } : rule,
        ),
      },
    });
  }

  function removeCommissionRule(index: number) {
    updateData({
      commissionPlan: {
        ...data.commissionPlan,
        rules: data.commissionPlan.rules.filter((_, itemIndex) => itemIndex !== index),
      },
    });
  }

  function addSpecialPaymentLine() {
    updateData({
      paymentPlan: {
        ...data.paymentPlan,
        specialLines: [
          ...data.paymentPlan.specialLines,
          {
            amountCents: '0',
            dueDate: '',
            label: 'Pago especial',
            lineType: 'SPECIAL_INSTALLMENT',
          },
        ],
      },
    });
  }

  function updateSpecialPaymentLine(
    index: number,
    patch: Partial<PaymentSpecialLineDraft>,
  ) {
    updateData({
      paymentPlan: {
        ...data.paymentPlan,
        specialLines: data.paymentPlan.specialLines.map((line, itemIndex) =>
          itemIndex === index ? { ...line, ...patch } : line,
        ),
      },
    });
  }

  function removeSpecialPaymentLine(index: number) {
    updateData({
      paymentPlan: {
        ...data.paymentPlan,
        specialLines: data.paymentPlan.specialLines.filter(
          (_, itemIndex) => itemIndex !== index,
        ),
      },
    });
  }

  function goToStep(offset: number) {
    const nextStep = steps[currentStepIndex + offset];

    if (nextStep) {
      void saveDraft();
      setActiveStep(nextStep.id);
    }
  }

  if (isLoading) {
    return (
      <LoadingState
        title="Preparando creacion de negocio"
        description="Cargando contexto de organizacion, clientes, inmuebles y contratos."
      />
    );
  }

  if (error || !context || !draft) {
    return (
      <ErrorState
        title="No se pudo abrir el wizard"
        description={error ?? 'Falta contexto para crear negocios.'}
      />
    );
  }

  return (
    <div className="business-wizard-page">
      <PageHeader
        eyebrow="Negocios"
        title="Crear negocio"
        description="Wizard transaccional con borrador, calculos, validacion y preview antes de confirmar."
        actions={
          <>
            <span className="save-indicator">
              {isSaving ? (
                <>
                  <Loader2 size={15} /> Guardando
                </>
              ) : lastSavedAt ? (
                <>Guardado {relativeTime(lastSavedAt)}</>
              ) : (
                <>Borrador activo</>
              )}
            </span>
            <button className="button secondary" type="button" onClick={() => void saveDraft()}>
              <Save size={17} />
              Guardar
            </button>
            <button
              className="button primary"
              disabled={isPreviewing}
              type="button"
              onClick={() => {
                setActiveStep('review');
                void refreshPreview();
              }}
            >
              {isPreviewing ? <Loader2 size={17} /> : <ClipboardCheck size={17} />}
              Preview
            </button>
          </>
        }
      />

      {formError ? <div className="form-error">{formError}</div> : null}
      {calcError ? <div className="form-error">{calcError}</div> : null}
      {successMessage ? (
        <div className="success-banner">
          <Check size={18} />
          {successMessage}
        </div>
      ) : null}

      <div className="business-wizard-shell">
        <aside className="business-stepper" aria-label="Pasos del negocio">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.id === activeStep;
            const isDone = index < currentStepIndex;

            return (
              <button
                className={`business-step${isActive ? ' active' : ''}${isDone ? ' done' : ''}`}
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                type="button"
              >
                <span>
                  <Icon size={17} />
                </span>
                {step.label}
              </button>
            );
          })}
        </aside>

        <section className="business-step-content">
          {activeStep === 'mode' ? (
            <ModeStep data={data} updateData={updateData} />
          ) : null}
          {activeStep === 'clients' ? (
            <ClientsStep
              clientError={clientError}
              clients={context.clients}
              data={data}
              newClient={newClient}
              onAddExistingClient={addExistingClient}
              onCreateClient={(event) => void createInlineClient(event)}
              onNewClientChange={setNewClient}
              onRemoveParticipant={removeParticipant}
              onRoleChange={setParticipantRole}
            />
          ) : null}
          {activeStep === 'property' ? (
            <PropertyStep
              data={data}
              onSelectProperty={selectProperty}
              properties={context.properties}
              selectedProperty={selectedProperty}
            />
          ) : null}
          {activeStep === 'contract' ? (
            <ContractStep
              contractTypes={context.contractTypes.filter(
                (contractType) => contractType.operationType === data.operationType,
              )}
              data={data}
              selectedContractType={selectedContractType}
              toggleClause={toggleClause}
              updateData={updateData}
            />
          ) : null}
          {activeStep === 'financial' ? (
            <FinancialStep
              data={data}
              onSyncTotals={syncFinancialTotals}
              updateFinancial={updateFinancial}
            />
          ) : null}
          {activeStep === 'payments' ? (
            <PaymentPlanStep
              calculation={visiblePaymentCalculation}
              data={data}
              isCalculating={isCalculating}
              onAddSpecialLine={addSpecialPaymentLine}
              onRemoveSpecialLine={removeSpecialPaymentLine}
              onSpecialLineChange={updateSpecialPaymentLine}
              updatePaymentPlan={updatePaymentPlan}
            />
          ) : null}
          {activeStep === 'commissions' ? (
            <CommissionStep
              agents={context.agents}
              calculation={visibleCommissionCalculation}
              commParticipantId={commParticipantId}
              data={data}
              newAgentId={newAgentId}
              onAddAdvancedRule={addSimpleRuleToAdvanced}
              onAddCommissionParticipant={addCommissionParticipant}
              onPrimaryAgentChange={addPrimaryAgent}
              onRemoveRule={removeCommissionRule}
              onRuleChange={updateCommissionRule}
              primaryAgent={primaryAgent}
              setCommParticipantId={setCommParticipantId}
              updateCommissionPlan={updateCommissionPlan}
              updateData={updateData}
            />
          ) : null}
          {activeStep === 'automation' ? (
            <AutomationStep data={data} updateData={updateData} />
          ) : null}
          {activeStep === 'review' ? (
            <ReviewStep
              canCommit={context.permissionHints.canCommit}
              commissionCalculation={visibleCommissionCalculation}
              data={data}
              isCommitting={isCommitting}
              isPreviewing={isPreviewing}
              onCommit={() => void commitBusiness()}
              onRefreshPreview={() => void refreshPreview()}
              paymentCalculation={visiblePaymentCalculation}
              preview={preview}
              validation={validation}
            />
          ) : null}

          <div className="wizard-navigation">
            <button
              className="button secondary"
              disabled={currentStepIndex === 0}
              onClick={() => goToStep(-1)}
              type="button"
            >
              <ChevronLeft size={17} />
              Volver
            </button>
            <button
              className="button primary"
              disabled={currentStepIndex === steps.length - 1}
              onClick={() => goToStep(1)}
              type="button"
            >
              Continuar
              <ChevronRight size={17} />
            </button>
          </div>
        </section>

        <BusinessSummary
          activeMembership={activeMembership}
          commissionCalculation={visibleCommissionCalculation}
          data={data}
          draft={draft}
          paymentCalculation={visiblePaymentCalculation}
          selectedContractType={selectedContractType}
          selectedProperty={selectedProperty}
          validationCounts={validationCounts}
        />
      </div>
    </div>
  );
}

function ModeStep({
  data,
  updateData,
}: {
  data: BusinessWizardData;
  updateData: (patch: Partial<BusinessWizardData>) => void;
}) {
  return (
    <SectionPanel
      title="Tipo de negocio y modo"
      description="Primero definimos la operacion, moneda y fechas base. El modo avanzado abre estructuras multiples sin cambiar el flujo."
    >
      <div className="business-form-grid">
        <label>
          Operacion
          <select
            value={data.operationType}
            onChange={(event) =>
              updateData({
                operationType: event.target.value as BusinessOperationType,
              })
            }
          >
            {Object.entries(operationLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Moneda
          <select
            value={data.currency}
            onChange={(event) => updateData({ currency: event.target.value })}
          >
            <option value="USD">USD</option>
            <option value="PAB">PAB</option>
          </select>
        </label>
        <label className="wide-field">
          Nombre o referencia
          <input
            value={data.title}
            onChange={(event) => updateData({ title: event.target.value })}
            placeholder="Venta Torre Norte 12B"
          />
        </label>
        <label>
          Firma esperada
          <input
            type="date"
            value={data.expectedSignatureDate}
            onChange={(event) =>
              updateData({
                expectedSignatureDate: event.target.value,
                paymentPlan: {
                  ...data.paymentPlan,
                  signatureDate: event.target.value,
                },
              })
            }
          />
        </label>
        <label>
          Cierre esperado
          <input
            type="date"
            value={data.expectedClosingDate}
            onChange={(event) =>
              updateData({
                expectedClosingDate: event.target.value,
                paymentPlan: {
                  ...data.paymentPlan,
                  closingDate: event.target.value,
                },
              })
            }
          />
        </label>
        <label className="wide-field">
          Notas iniciales
          <textarea
            value={data.notes}
            onChange={(event) => updateData({ notes: event.target.value })}
            placeholder="Notas operativas del negocio"
          />
        </label>
      </div>

      <div className="mode-selector" role="group" aria-label="Modo del negocio">
        <button
          className={data.mode === 'SIMPLE' ? 'active' : ''}
          onClick={() => updateData({ mode: 'SIMPLE' })}
          type="button"
        >
          <BriefcaseBusiness size={18} />
          <span>
            <strong>Modo simple</strong>
            <small>Un cliente, un agente, comision directa y pagos basicos.</small>
          </span>
        </button>
        <button
          className={data.mode === 'ADVANCED' ? 'active' : ''}
          onClick={() => updateData({ mode: 'ADVANCED' })}
          type="button"
        >
          <Sparkles size={18} />
          <span>
            <strong>Modo avanzado</strong>
            <small>Participantes, hitos, referidos, cargos y reglas multiples.</small>
          </span>
        </button>
      </div>
    </SectionPanel>
  );
}

function ClientsStep({
  clientError,
  clients,
  data,
  newClient,
  onAddExistingClient,
  onCreateClient,
  onNewClientChange,
  onRemoveParticipant,
  onRoleChange,
}: {
  clientError: string | null;
  clients: BusinessContextClient[];
  data: BusinessWizardData;
  newClient: NewClientForm;
  onAddExistingClient: (clientId: string) => void;
  onCreateClient: (event: FormEvent<HTMLFormElement>) => void;
  onNewClientChange: (value: NewClientForm) => void;
  onRemoveParticipant: (participantKey: string) => void;
  onRoleChange: (participantKey: string, role: BusinessParticipantRole) => void;
}) {
  const clientParticipants = data.participants.filter((participant) =>
    ['BUYER', 'TENANT', 'SELLER', 'LANDLORD', 'GUARANTOR', 'LEGAL_REPRESENTATIVE', 'OTHER'].includes(
      participant.role,
    ),
  );

  return (
    <SectionPanel
      title="Cliente y partes"
      description="Puedes buscar un cliente existente o crearlo sin salir del wizard."
    >
      {clientError ? <div className="form-error">{clientError}</div> : null}
      <div className="business-inline-actions">
        <label>
          Cliente existente
          <select
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) {
                onAddExistingClient(event.target.value);
                event.target.value = '';
              }
            }}
          >
            <option value="">Seleccionar cliente</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.displayName}
                {client.identityDocumentValidated ? ' - validado' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="business-list">
        {clientParticipants.length === 0 ? (
          <div className="business-empty-row">
            <Users size={18} />
            Aun no hay clientes en el negocio.
          </div>
        ) : (
          clientParticipants.map((participant) => (
            <div className="business-row-card" key={participant.participantKey}>
              <span className="avatar">{initials(participant.displayName)}</span>
              <div>
                <strong>{participant.displayName}</strong>
                <span className="meta-row">
                  {participant.email ?? 'Sin email'} · {participant.phone ?? 'Sin telefono'}
                </span>
              </div>
              <select
                value={participant.role}
                onChange={(event) =>
                  onRoleChange(
                    participant.participantKey,
                    event.target.value as BusinessParticipantRole,
                  )
                }
              >
                {clientRoleOptions.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <button
                aria-label="Quitar participante"
                className="icon-button"
                onClick={() => onRemoveParticipant(participant.participantKey)}
                type="button"
              >
                <X size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      <form className="inline-create-form" onSubmit={onCreateClient}>
        <strong>Crear cliente rapido</strong>
        <div className="business-form-grid compact">
          <label>
            Nombre
            <input
              value={newClient.firstName}
              onChange={(event) =>
                onNewClientChange({ ...newClient, firstName: event.target.value })
              }
            />
          </label>
          <label>
            Apellido
            <input
              value={newClient.lastName}
              onChange={(event) =>
                onNewClientChange({ ...newClient, lastName: event.target.value })
              }
            />
          </label>
          <label>
            Email
            <input
              value={newClient.email}
              onChange={(event) =>
                onNewClientChange({ ...newClient, email: event.target.value })
              }
            />
          </label>
          <label>
            Telefono
            <input
              value={newClient.phone}
              onChange={(event) =>
                onNewClientChange({ ...newClient, phone: event.target.value })
              }
            />
          </label>
          <label>
            Documento
            <input
              value={newClient.legalId}
              onChange={(event) =>
                onNewClientChange({ ...newClient, legalId: event.target.value })
              }
            />
          </label>
          <button className="button secondary" type="submit">
            <UserRoundPlus size={17} />
            Crear y agregar
          </button>
        </div>
      </form>
    </SectionPanel>
  );
}

function PropertyStep({
  data,
  onSelectProperty,
  properties,
  selectedProperty,
}: {
  data: BusinessWizardData;
  onSelectProperty: (propertyId: string) => void;
  properties: BusinessContextProperty[];
  selectedProperty: BusinessContextProperty | null;
}) {
  return (
    <SectionPanel
      title="Inmueble, proyecto o unidad"
      description="El negocio puede quedar como borrador sin inmueble, pero algunos contratos lo requeriran para confirmar."
    >
      <label>
        Inmueble
        <select
          value={data.propertyId}
          onChange={(event) => onSelectProperty(event.target.value)}
        >
          <option value="">Continuar sin inmueble</option>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.title} · {property.zone} · {property.status}
            </option>
          ))}
        </select>
      </label>

      {selectedProperty ? (
        <div className="property-availability">
          <span>
            <Home size={18} />
          </span>
          <div>
            <strong>{selectedProperty.title}</strong>
            <p>
              {selectedProperty.city}, {selectedProperty.zone} · Estado{' '}
              {selectedProperty.status}
            </p>
          </div>
          <StatusBadge
            tone={
              ['ACTIVE', 'PUBLISHED'].includes(selectedProperty.status)
                ? 'success'
                : 'warning'
            }
          >
            {['ACTIVE', 'PUBLISHED'].includes(selectedProperty.status)
              ? 'Disponible'
              : 'Revisar'}
          </StatusBadge>
        </div>
      ) : (
        <div className="warning-banner">
          <AlertTriangle size={18} />
          El borrador seguira sin inmueble. La confirmacion puede bloquearse si el contrato lo exige.
        </div>
      )}
    </SectionPanel>
  );
}

function ContractStep({
  contractTypes,
  data,
  selectedContractType,
  toggleClause,
  updateData,
}: {
  contractTypes: BusinessContextResponse['contractTypes'];
  data: BusinessWizardData;
  selectedContractType: BusinessContextResponse['contractTypes'][number] | null;
  toggleClause: (clauseType: string) => void;
  updateData: (patch: Partial<BusinessWizardData>) => void;
}) {
  const clauseOptions = [
    {
      type: 'MATERIAL_ESCALATION',
      label: 'Incremento por materiales',
      detail: 'Condicion manual con aprobacion antes de crear cargos.',
    },
    {
      type: 'ASSIGNMENT_FEE',
      label: 'Costo de cesion',
      detail: 'Queda condicionado a solicitud de cesion.',
    },
    {
      type: 'LATE_FEE',
      label: 'Penalidad por mora',
      detail: 'Puede generar cargos futuros por pagos vencidos.',
    },
    {
      type: 'FINANCING_CONDITION',
      label: 'Condicion de financiamiento',
      detail: 'Marca revision operativa o legal.',
    },
  ];

  return (
    <SectionPanel
      title="Contrato y condiciones"
      description="Selecciona el tipo de contrato y las condiciones que deben viajar al borrador contractual."
    >
      <div className="business-form-grid">
        <label>
          Tipo de contrato
          <select
            value={data.contractTypeId}
            onChange={(event) => updateData({ contractTypeId: event.target.value })}
          >
            <option value="">Seleccionar contrato</option>
            {contractTypes.map((contractType) => (
              <option key={contractType.id} value={contractType.id}>
                {contractType.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Requisitos
          <input
            readOnly
            value={
              selectedContractType
                ? [
                    selectedContractType.requiresProperty ? 'Inmueble' : null,
                    selectedContractType.requiresPaymentPlan ? 'Pagos' : null,
                    selectedContractType.requiresCommissionPlan ? 'Comisiones' : null,
                  ]
                    .filter(Boolean)
                    .join(', ') || 'Sin requisitos duros'
                : 'Pendiente'
            }
          />
        </label>
        <label className="wide-field">
          Notas legales u operativas
          <textarea
            value={data.contract.legalNotes}
            onChange={(event) =>
              updateData({
                contract: {
                  ...data.contract,
                  legalNotes: event.target.value,
                },
              })
            }
          />
        </label>
      </div>

      <div className="clause-grid">
        {clauseOptions.map((clause) => {
          const isSelected = data.contract.clauses.some(
            (item) => item.clauseType === clause.type,
          );

          return (
            <button
              className={`clause-toggle${isSelected ? ' active' : ''}`}
              key={clause.type}
              onClick={() => toggleClause(clause.type)}
              type="button"
            >
              <span>{isSelected ? <Check size={18} /> : <Plus size={18} />}</span>
              <strong>{clause.label}</strong>
              <small>{clause.detail}</small>
            </button>
          );
        })}
      </div>
    </SectionPanel>
  );
}

function FinancialStep({
  data,
  onSyncTotals,
  updateFinancial,
}: {
  data: BusinessWizardData;
  onSyncTotals: (source: keyof BusinessWizardData['financial']) => void;
  updateFinancial: (key: keyof BusinessWizardData['financial'], value: string) => void;
}) {
  return (
    <SectionPanel
      title="Monto y base financiera"
      description="Todos los montos se guardan en centavos. El total pagable alimenta el plan de pagos y la base de comision."
      actions={
        <button
          className="button secondary"
          onClick={() => onSyncTotals('basePriceCents')}
          type="button"
        >
          <RefreshCcw size={17} />
          Usar precio base
        </button>
      }
    >
      <div className="business-form-grid">
        <MoneyField
          label="Precio base"
          value={data.financial.basePriceCents}
          onChange={(value) => updateFinancial('basePriceCents', value)}
        />
        <MoneyField
          label="Precio negociado"
          value={data.financial.negotiatedPriceCents}
          onChange={(value) => updateFinancial('negotiatedPriceCents', value)}
        />
        <MoneyField
          label="Total contractual"
          value={data.financial.totalContractAmountCents}
          onChange={(value) => updateFinancial('totalContractAmountCents', value)}
        />
        <MoneyField
          label="Total pagable"
          value={data.financial.payableAmountCents}
          onChange={(value) => updateFinancial('payableAmountCents', value)}
        />
        <MoneyField
          label="Base de comision"
          value={data.financial.commissionBaseAmountCents}
          onChange={(value) => updateFinancial('commissionBaseAmountCents', value)}
        />
      </div>

      <div className="financial-breakdown">
        <span>
          Precio base
          <strong>{formatMoney(data.financial.basePriceCents, data.currency)}</strong>
        </span>
        <span>
          Total contractual
          <strong>
            {formatMoney(data.financial.totalContractAmountCents, data.currency)}
          </strong>
        </span>
        <span>
          Programar en pagos
          <strong>{formatMoney(data.financial.payableAmountCents, data.currency)}</strong>
        </span>
        <span>
          Comision sobre
          <strong>
            {formatMoney(data.financial.commissionBaseAmountCents, data.currency)}
          </strong>
        </span>
      </div>
    </SectionPanel>
  );
}

function PaymentPlanStep({
  calculation,
  data,
  isCalculating,
  onAddSpecialLine,
  onRemoveSpecialLine,
  onSpecialLineChange,
  updatePaymentPlan,
}: {
  calculation: PaymentPlanCalculation;
  data: BusinessWizardData;
  isCalculating: boolean;
  onAddSpecialLine: () => void;
  onRemoveSpecialLine: (index: number) => void;
  onSpecialLineChange: (index: number, patch: Partial<PaymentSpecialLineDraft>) => void;
  updatePaymentPlan: (
    key: keyof PaymentPlanDraft,
    value: PaymentPlanDraft[keyof PaymentPlanDraft],
  ) => void;
}) {
  return (
    <SectionPanel
      title="Estructura de pagos"
      description="El backend recalcula el calendario y bloquea la confirmacion si la suma no cuadra."
      actions={
        <span className="save-indicator">
          {isCalculating ? (
            <>
              <Loader2 size={15} /> Recalculando
            </>
          ) : (
            <>Diferencia {formatMoney(calculation.differenceCents, data.currency)}</>
          )}
        </span>
      }
    >
      <div className="business-form-grid">
        <label>
          Preset
          <select
            value={data.paymentPlan.preset}
            onChange={(event) => updatePaymentPlan('preset', event.target.value)}
          >
            {Object.entries(presetLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <MoneyField
          label="Monto a programar"
          value={data.paymentPlan.totalAmountCents}
          onChange={(value) => updatePaymentPlan('totalAmountCents', moneyToCents(value))}
        />
        <MoneyField
          label="Reserva"
          value={data.paymentPlan.reservationAmountCents}
          onChange={(value) =>
            updatePaymentPlan('reservationAmountCents', moneyToCents(value))
          }
        />
        <MoneyField
          label="Pago a la firma"
          value={data.paymentPlan.signatureAmountCents}
          onChange={(value) =>
            updatePaymentPlan('signatureAmountCents', moneyToCents(value))
          }
        />
        <label>
          Numero de cuotas
          <input
            min={1}
            type="number"
            value={data.paymentPlan.installmentCount}
            onChange={(event) =>
              updatePaymentPlan('installmentCount', Number(event.target.value))
            }
          />
        </label>
        <label>
          Frecuencia
          <select
            value={data.paymentPlan.frequency}
            onChange={(event) => updatePaymentPlan('frequency', event.target.value)}
          >
            <option value="MONTHLY">Mensual</option>
            <option value="QUARTERLY">Trimestral</option>
            <option value="SEMIANNUAL">Semestral</option>
            <option value="ANNUAL">Anual</option>
            <option value="WEEKLY">Semanal</option>
            <option value="BIWEEKLY">Quincenal</option>
          </select>
        </label>
        <label>
          Inicio de cuotas
          <input
            type="date"
            value={data.paymentPlan.startDate}
            onChange={(event) => updatePaymentPlan('startDate', event.target.value)}
          />
        </label>
        <label>
          Dia de vencimiento
          <input
            min={1}
            max={31}
            type="number"
            value={data.paymentPlan.dueDay}
            onChange={(event) => updatePaymentPlan('dueDay', Number(event.target.value))}
          />
        </label>
      </div>

      <div className="business-inline-actions">
        <button className="button secondary" onClick={onAddSpecialLine} type="button">
          <Plus size={17} />
          Pago especial
        </button>
      </div>

      {data.paymentPlan.specialLines.length > 0 ? (
        <div className="business-list">
          {data.paymentPlan.specialLines.map((line, index) => (
            <div className="special-line-row" key={`${line.label}-${index}`}>
              <input
                value={line.label}
                onChange={(event) =>
                  onSpecialLineChange(index, { label: event.target.value })
                }
              />
              <select
                value={line.lineType}
                onChange={(event) =>
                  onSpecialLineChange(index, { lineType: event.target.value })
                }
              >
                <option value="SPECIAL_INSTALLMENT">Especial</option>
                <option value="CLOSING">Pago final</option>
                <option value="HANDOVER">Entrega</option>
                <option value="ASSIGNMENT_FEE">Cesion</option>
                <option value="MATERIAL_ADJUSTMENT">Materiales</option>
              </select>
              <input
                value={centsToInput(line.amountCents)}
                onChange={(event) =>
                  onSpecialLineChange(index, {
                    amountCents: moneyToCents(event.target.value),
                  })
                }
              />
              <input
                type="date"
                value={line.dueDate}
                onChange={(event) =>
                  onSpecialLineChange(index, { dueDate: event.target.value })
                }
              />
              <button
                aria-label="Quitar pago especial"
                className="icon-button"
                onClick={() => onRemoveSpecialLine(index)}
                type="button"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <CalculationMessages calculation={calculation} />
      <PaymentPlanTable calculation={calculation} currency={data.currency} />
    </SectionPanel>
  );
}

function CommissionStep({
  agents,
  calculation,
  commParticipantId,
  data,
  newAgentId,
  onAddAdvancedRule,
  onAddCommissionParticipant,
  onPrimaryAgentChange,
  onRemoveRule,
  onRuleChange,
  primaryAgent,
  setCommParticipantId,
  updateCommissionPlan,
  updateData,
}: {
  agents: BusinessContextAgent[];
  calculation: CommissionPlanCalculation;
  commParticipantId: string;
  data: BusinessWizardData;
  newAgentId: string;
  onAddAdvancedRule: () => void;
  onAddCommissionParticipant: (agentId: string, role: BusinessParticipantRole) => void;
  onPrimaryAgentChange: (agentId: string) => void;
  onRemoveRule: (index: number) => void;
  onRuleChange: (index: number, patch: Partial<CommissionRuleDraft>) => void;
  primaryAgent: BusinessParticipantDraft | undefined;
  setCommParticipantId: (value: string) => void;
  updateCommissionPlan: (
    key: keyof BusinessWizardData['commissionPlan'],
    value: BusinessWizardData['commissionPlan'][keyof BusinessWizardData['commissionPlan']],
  ) => void;
  updateData: (patch: Partial<BusinessWizardData>) => void;
}) {
  const commissionParticipants = data.participants.filter((participant) =>
    ['PRIMARY_AGENT', 'CO_AGENT', 'REFERRER', 'BROKER'].includes(participant.role),
  );

  return (
    <SectionPanel
      title="Comisiones"
      description="El modo simple calcula un porcentaje directo. El modo avanzado permite reglas por participante."
    >
      <div className="business-form-grid">
        <label>
          Agente principal
          <select
            value={newAgentId || primaryAgent?.realEstateAgentId || ''}
            onChange={(event) => onPrimaryAgentChange(event.target.value)}
          >
            <option value="">Seleccionar agente</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.displayName} · {agent.category}
              </option>
            ))}
          </select>
        </label>
        <label>
          Porcentaje simple
          <input
            value={basisPointsToPercent(data.commissionPlan.simpleCommissionBasisPoints)}
            onChange={(event) =>
              updateCommissionPlan(
                'simpleCommissionBasisPoints',
                percentToBasisPoints(event.target.value),
              )
            }
          />
        </label>
        <label>
          Trigger de pago
          <select
            value={data.commissionPlan.releaseTrigger}
            onChange={(event) =>
              updateCommissionPlan('releaseTrigger', event.target.value)
            }
          >
            {Object.entries(releaseTriggerLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Base de calculo
          <select
            value={data.commissionPlan.commissionBase}
            onChange={(event) =>
              updateCommissionPlan('commissionBase', event.target.value)
            }
          >
            <option value="SALE_PRICE">Precio venta</option>
            <option value="NEGOTIATED_PRICE">Precio negociado</option>
            <option value="COLLECTED_AMOUNT">Monto cobrado</option>
            <option value="NET_AMOUNT">Neto</option>
            <option value="CUSTOM_AMOUNT">Monto custom</option>
          </select>
        </label>
      </div>

      {data.mode === 'ADVANCED' ? (
        <>
          <div className="business-inline-actions">
            <select
              value={commParticipantId}
              onChange={(event) => setCommParticipantId(event.target.value)}
            >
              <option value="">Agregar co-agente / referido</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.displayName} · {agent.category}
                </option>
              ))}
            </select>
            <button
              className="button secondary"
              disabled={!commParticipantId}
              onClick={() => {
                onAddCommissionParticipant(commParticipantId, 'CO_AGENT');
                setCommParticipantId('');
              }}
              type="button"
            >
              <Plus size={17} />
              Co-agente
            </button>
            <button
              className="button secondary"
              disabled={!commParticipantId}
              onClick={() => {
                onAddCommissionParticipant(commParticipantId, 'REFERRER');
                setCommParticipantId('');
              }}
              type="button"
            >
              <Plus size={17} />
              Referido
            </button>
            <button className="button secondary" onClick={onAddAdvancedRule} type="button">
              <HandCoins size={17} />
              Regla base
            </button>
          </div>

          <div className="business-list">
            {data.commissionPlan.rules.map((rule, index) => (
              <div className="commission-rule-row" key={`${rule.participantKey}-${index}`}>
                <select
                  value={rule.participantKey}
                  onChange={(event) =>
                    onRuleChange(index, { participantKey: event.target.value })
                  }
                >
                  {commissionParticipants.map((participant) => (
                    <option
                      key={participant.participantKey}
                      value={participant.participantKey}
                    >
                      {participant.displayName} · {participant.role}
                    </option>
                  ))}
                </select>
                <select
                  value={rule.calculationType}
                  onChange={(event) =>
                    onRuleChange(index, { calculationType: event.target.value })
                  }
                >
                  <option value="PERCENTAGE_OF_SALE">% venta</option>
                  <option value="PERCENTAGE_OF_COMMISSION">% comision</option>
                  <option value="FIXED_AMOUNT">Monto fijo</option>
                  <option value="CAPPED">Con tope</option>
                </select>
                <input
                  value={
                    rule.calculationType === 'FIXED_AMOUNT'
                      ? centsToInput(rule.fixedAmountCents ?? '0')
                      : basisPointsToPercent(rule.percentageBasisPoints ?? 0)
                  }
                  onChange={(event) =>
                    rule.calculationType === 'FIXED_AMOUNT'
                      ? onRuleChange(index, {
                          fixedAmountCents: moneyToCents(event.target.value),
                        })
                      : onRuleChange(index, {
                          percentageBasisPoints: percentToBasisPoints(
                            event.target.value,
                          ),
                        })
                  }
                />
                <select
                  value={rule.releaseTrigger}
                  onChange={(event) =>
                    onRuleChange(index, { releaseTrigger: event.target.value })
                  }
                >
                  {Object.entries(releaseTriggerLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  aria-label="Quitar regla"
                  className="icon-button"
                  onClick={() => onRemoveRule(index)}
                  type="button"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="business-note">
          La comision simple se calcula contra la base definida y se asigna al agente principal.
        </div>
      )}

      <CalculationMessages calculation={calculation} />
      <CommissionBreakdown calculation={calculation} currency={data.currency} />

      <div className="business-inline-actions">
        <button
          className="button ghost"
          onClick={() =>
            updateData({ mode: data.mode === 'SIMPLE' ? 'ADVANCED' : 'SIMPLE' })
          }
          type="button"
        >
          Cambiar a modo {data.mode === 'SIMPLE' ? 'avanzado' : 'simple'}
        </button>
      </div>
    </SectionPanel>
  );
}

function AutomationStep({
  data,
  updateData,
}: {
  data: BusinessWizardData;
  updateData: (patch: Partial<BusinessWizardData>) => void;
}) {
  function updateAutomation(key: keyof BusinessWizardData['automations'], value: boolean) {
    updateData({
      automations: {
        ...data.automations,
        [key]: value,
      },
    });
  }

  return (
    <SectionPanel
      title="Automatizaciones y relaciones"
      description="Estas acciones quedan como datos programados para que luego las consuma el modulo de tareas o jobs."
    >
      <div className="automation-grid">
        <label>
          <input
            checked={data.automations.paymentReminders}
            type="checkbox"
            onChange={(event) =>
              updateAutomation('paymentReminders', event.target.checked)
            }
          />
          Recordatorios de pago
        </label>
        <label>
          <input
            checked={data.automations.signatureTask}
            type="checkbox"
            onChange={(event) =>
              updateAutomation('signatureTask', event.target.checked)
            }
          />
          Tarea de firma
        </label>
        <label>
          <input
            checked={data.automations.reviewTask}
            type="checkbox"
            onChange={(event) => updateAutomation('reviewTask', event.target.checked)}
          />
          Revision interna
        </label>
        <label>
          <input
            checked={data.automations.commissionReminders}
            type="checkbox"
            onChange={(event) =>
              updateAutomation('commissionReminders', event.target.checked)
            }
          />
          Recordatorios de comision
        </label>
      </div>
      <div className="business-note">
        Impactara cobranza futura, ventas por agente, comisiones pendientes y contratos por estado.
      </div>
    </SectionPanel>
  );
}

function ReviewStep({
  canCommit,
  commissionCalculation,
  data,
  isCommitting,
  isPreviewing,
  onCommit,
  onRefreshPreview,
  paymentCalculation,
  preview,
  validation,
}: {
  canCommit: boolean;
  commissionCalculation: CommissionPlanCalculation;
  data: BusinessWizardData;
  isCommitting: boolean;
  isPreviewing: boolean;
  onCommit: () => void;
  onRefreshPreview: () => void;
  paymentCalculation: PaymentPlanCalculation;
  preview: BusinessPreview | null;
  validation: BusinessValidationItem[];
}) {
  const blockingErrors = validation.filter((item) => item.level === 'ERROR');

  return (
    <SectionPanel
      title="Revision final"
      description="Dry run antes de crear registros definitivos. Si hay errores bloqueantes, el backend no confirmara."
      actions={
        <button
          className="button secondary"
          disabled={isPreviewing}
          onClick={onRefreshPreview}
          type="button"
        >
          {isPreviewing ? <Loader2 size={17} /> : <RefreshCcw size={17} />}
          Actualizar preview
        </button>
      }
    >
      <div className="review-grid">
        <ReviewBlock label="Operacion" value={operationLabels[data.operationType]} />
        <ReviewBlock label="Modo" value={data.mode === 'SIMPLE' ? 'Simple' : 'Avanzado'} />
        <ReviewBlock
          label="Total contrato"
          value={formatMoney(data.financial.totalContractAmountCents, data.currency)}
        />
        <ReviewBlock
          label="Total programado"
          value={formatMoney(paymentCalculation.generatedTotalCents, data.currency)}
        />
        <ReviewBlock
          label="Diferencia"
          value={formatMoney(paymentCalculation.differenceCents, data.currency)}
        />
        <ReviewBlock
          label="Comision estimada"
          value={formatMoney(
            commissionCalculation.totalCommissionAmountCents,
            data.currency,
          )}
        />
      </div>

      <ValidationList validation={validation} />

      {preview ? (
        <div className="entity-preview-grid">
          {preview.entitiesToCreate.map((item) => (
            <span key={item.entity}>
              <strong>{item.count}</strong>
              {item.entity}
            </span>
          ))}
        </div>
      ) : (
        <div className="business-empty-row">
          <ClipboardCheck size={18} />
          Genera el preview para ver entidades, relaciones y snapshots.
        </div>
      )}

      <PaymentPlanTable calculation={paymentCalculation} currency={data.currency} />
      <CommissionBreakdown
        calculation={commissionCalculation}
        currency={data.currency}
      />

      <div className="business-confirm-bar">
        <span>
          {blockingErrors.length > 0
            ? `${blockingErrors.length} errores bloqueantes`
            : 'Listo para confirmar si los datos son correctos'}
        </span>
        <button
          className="button primary"
          disabled={!canCommit || blockingErrors.length > 0 || isCommitting}
          onClick={onCommit}
          type="button"
        >
          {isCommitting ? <Loader2 size={17} /> : <ShieldCheck size={17} />}
          Confirmar y crear negocio
        </button>
      </div>
    </SectionPanel>
  );
}

function BusinessSummary({
  activeMembership,
  commissionCalculation,
  data,
  draft,
  paymentCalculation,
  selectedContractType,
  selectedProperty,
  validationCounts,
}: {
  activeMembership: AuthMembership | null;
  commissionCalculation: CommissionPlanCalculation;
  data: BusinessWizardData;
  draft: BusinessRecord;
  paymentCalculation: PaymentPlanCalculation;
  selectedContractType: BusinessContextResponse['contractTypes'][number] | null;
  selectedProperty: BusinessContextProperty | null;
  validationCounts: { errors: number; warnings: number };
}) {
  const primaryClient = data.participants.find((participant) =>
    ['BUYER', 'TENANT'].includes(participant.role),
  );

  return (
    <aside className="business-summary">
      <div className="summary-header">
        <span className="eyebrow">Resumen</span>
        <strong>{draft.code ?? 'Borrador'}</strong>
        <StatusBadge tone={draft.status === 'DRAFT' ? 'warning' : 'success'}>
          {draft.status}
        </StatusBadge>
      </div>
      <dl className="summary-list">
        <div>
          <dt>Operacion</dt>
          <dd>{operationLabels[data.operationType]}</dd>
        </div>
        <div>
          <dt>Cliente principal</dt>
          <dd>{primaryClient?.displayName ?? 'Pendiente'}</dd>
        </div>
        <div>
          <dt>Inmueble</dt>
          <dd>{selectedProperty?.title ?? 'Sin inmueble'}</dd>
        </div>
        <div>
          <dt>Contrato</dt>
          <dd>{selectedContractType?.name ?? 'Pendiente'}</dd>
        </div>
        <div>
          <dt>Total pagable</dt>
          <dd>{formatMoney(data.financial.payableAmountCents, data.currency)}</dd>
        </div>
        <div>
          <dt>Total programado</dt>
          <dd>{formatMoney(paymentCalculation.generatedTotalCents, data.currency)}</dd>
        </div>
        <div>
          <dt>Diferencia</dt>
          <dd>{formatMoney(paymentCalculation.differenceCents, data.currency)}</dd>
        </div>
        <div>
          <dt>Comision estimada</dt>
          <dd>
            {formatMoney(
              commissionCalculation.totalCommissionAmountCents,
              data.currency,
            )}
          </dd>
        </div>
      </dl>
      <div className="summary-alerts">
        <span className={validationCounts.errors > 0 ? 'danger' : 'success'}>
          {validationCounts.errors} errores
        </span>
        <span>{validationCounts.warnings} warnings</span>
      </div>
      <div className="business-note">
        Rol activo: {activeMembership?.role ?? 'sin rol'} · Version {draft.version}
      </div>
    </aside>
  );
}

function MoneyField({
  label,
  onChange,
  value,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      {label}
      <input
        inputMode="decimal"
        value={centsToInput(value)}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function CalculationMessages({
  calculation,
}: {
  calculation: { errors: string[]; warnings: string[] };
}) {
  if (calculation.errors.length === 0 && calculation.warnings.length === 0) {
    return (
      <div className="success-banner">
        <Check size={18} />
        Calculo sin errores bloqueantes.
      </div>
    );
  }

  return (
    <div className="validation-stack">
      {calculation.errors.map((message) => (
        <div className="validation-item error" key={message}>
          <AlertTriangle size={16} />
          {message}
        </div>
      ))}
      {calculation.warnings.map((message) => (
        <div className="validation-item warning" key={message}>
          <AlertTriangle size={16} />
          {message}
        </div>
      ))}
    </div>
  );
}

function ValidationList({ validation }: { validation: BusinessValidationItem[] }) {
  if (validation.length === 0) {
    return (
      <div className="business-empty-row">
        <ShieldCheck size={18} />
        Ejecuta el preview para ver validaciones.
      </div>
    );
  }

  return (
    <div className="validation-stack">
      {validation.map((item, index) => (
        <div
          className={`validation-item ${item.level.toLowerCase()}`}
          key={`${item.code}-${index}`}
        >
          {item.level === 'INFO' ? <Check size={16} /> : <AlertTriangle size={16} />}
          <span>
            <strong>{item.level}</strong>
            {item.message}
          </span>
        </div>
      ))}
    </div>
  );
}

function PaymentPlanTable({
  calculation,
  currency,
}: {
  calculation: PaymentPlanCalculation;
  currency: string;
}) {
  if (calculation.lines.length === 0) {
    return null;
  }

  return (
    <div className="table-shell compact-table">
      <table className="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Linea</th>
            <th>Tipo</th>
            <th>Vence</th>
            <th>Monto</th>
          </tr>
        </thead>
        <tbody>
          {calculation.lines.map((line) => (
            <tr key={`${line.sequence}-${line.label}`}>
              <td>{line.sequence}</td>
              <td>{line.label}</td>
              <td>{line.lineType}</td>
              <td>{line.dueDate ?? line.dueEvent ?? 'Sin fecha'}</td>
              <td>{formatMoney(line.amountCents, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CommissionBreakdown({
  calculation,
  currency,
}: {
  calculation: CommissionPlanCalculation;
  currency: string;
}) {
  if (calculation.allocations.length === 0) {
    return (
      <div className="business-empty-row">
        <HandCoins size={18} />
        Sin allocations de comision todavia.
      </div>
    );
  }

  return (
    <div className="table-shell compact-table">
      <table className="data-table">
        <thead>
          <tr>
            <th>Participante</th>
            <th>Tipo</th>
            <th>Trigger</th>
            <th>Monto</th>
          </tr>
        </thead>
        <tbody>
          {calculation.allocations.map((allocation) => (
            <tr key={`${allocation.participantKey}-${allocation.label}`}>
              <td>{allocation.label}</td>
              <td>{allocation.calculationType}</td>
              <td>{releaseTriggerLabels[allocation.releaseTrigger] ?? allocation.releaseTrigger}</td>
              <td>{formatMoney(allocation.payableAmountCents, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReviewBlock({ label, value }: { label: string; value: string }) {
  return (
    <span>
      {label}
      <strong>{value}</strong>
    </span>
  );
}

function activeMemberships(user: AuthUser | null) {
  return (
    user?.memberships.filter(
      (membership) =>
        membership.status === 'ACTIVE' &&
        membership.organizationStatus === 'ACTIVE',
    ) ?? []
  );
}

function mergeWizardData(
  base: BusinessWizardData,
  patch: unknown,
): BusinessWizardData {
  const safePatch =
    patch && typeof patch === 'object' && !Array.isArray(patch)
      ? (patch as Partial<BusinessWizardData>)
      : {};
  const merged: BusinessWizardData = {
    ...base,
    ...safePatch,
    automations: {
      ...base.automations,
      ...(safePatch.automations ?? {}),
    },
    commissionPlan: {
      ...base.commissionPlan,
      ...(safePatch.commissionPlan ?? {}),
    },
    contract: {
      ...base.contract,
      ...(safePatch.contract ?? {}),
    },
    financial: {
      ...base.financial,
      ...(safePatch.financial ?? {}),
    },
    paymentPlan: {
      ...base.paymentPlan,
      ...(safePatch.paymentPlan ?? {}),
    },
  };

  return normalizeDerivedData(merged);
}

function normalizeDerivedData(data: BusinessWizardData): BusinessWizardData {
  return {
    ...data,
    commissionPlan: {
      ...data.commissionPlan,
      baseAmountCents:
        data.commissionPlan.baseAmountCents === '0'
          ? data.financial.commissionBaseAmountCents
          : data.commissionPlan.baseAmountCents,
    },
    paymentPlan: {
      ...data.paymentPlan,
      totalAmountCents:
        data.paymentPlan.totalAmountCents === '0'
          ? data.financial.payableAmountCents
          : data.paymentPlan.totalAmountCents,
    },
  };
}

function defaultClientRole(operationType: BusinessOperationType): BusinessParticipantRole {
  if (operationType === 'RENT') {
    return 'TENANT';
  }

  if (operationType === 'ASSIGNMENT') {
    return 'BUYER';
  }

  return 'BUYER';
}

function defaultClause(clauseType: string): ClauseDraft {
  if (clauseType === 'MATERIAL_ESCALATION') {
    return {
      appliesTo: 'BUYER',
      calculationType: 'MANUAL',
      clauseType,
      createsReceivable: false,
      description: 'Ajuste sujeto a evento y aprobacion.',
      requiresApproval: true,
      title: 'Incremento por materiales',
      triggerEvent: 'ON_MATERIAL_INCREASE',
    };
  }

  if (clauseType === 'ASSIGNMENT_FEE') {
    return {
      appliesTo: 'BUYER',
      calculationType: 'PERCENTAGE',
      clauseType,
      createsReceivable: false,
      description: 'Cargo condicionado a solicitud de cesion.',
      percentageBps: 100,
      requiresApproval: false,
      title: 'Costo de cesion',
      triggerEvent: 'ON_ASSIGNMENT_REQUEST',
    };
  }

  if (clauseType === 'LATE_FEE') {
    return {
      appliesTo: 'BUYER',
      calculationType: 'PERCENTAGE',
      clauseType,
      createsReceivable: true,
      description: 'Penalidad aplicable a cuotas en mora.',
      percentageBps: 100,
      requiresApproval: false,
      title: 'Penalidad por mora',
      triggerEvent: 'ON_LATE_PAYMENT',
    };
  }

  return {
    appliesTo: 'BUYER',
    calculationType: 'NONE',
    clauseType,
    createsReceivable: false,
    requiresApproval: true,
    title: 'Condicion especial',
    triggerEvent: 'MANUAL',
  };
}

function agentParticipant(
  agent: BusinessContextAgent,
  role: BusinessParticipantRole,
  participantKey = agent.id,
): BusinessParticipantDraft {
  return {
    commissionEligible: true,
    displayName: agent.displayName,
    email: agent.email,
    participantKey,
    phone: agent.phone,
    realEstateAgentId: agent.id,
    role,
    isPrimary: role === 'PRIMARY_AGENT',
  };
}

function allMoneyZero(values: string[]) {
  return values.every((value) => parseCents(value) === 0n);
}

function moneyToCents(value: string) {
  const clean = value.replace(/[^\d.-]/g, '').trim();

  if (!clean || clean === '-' || clean === '.') {
    return '0';
  }

  const sign = clean.startsWith('-') ? '-' : '';
  const unsigned = sign ? clean.slice(1) : clean;
  const [dollars = '0', cents = ''] = unsigned.split('.');
  const normalizedCents = `${cents}00`.slice(0, 2);
  const asBigInt = BigInt(dollars || '0') * 100n + BigInt(normalizedCents || '0');

  return `${sign}${asBigInt.toString()}`;
}

function centsToInput(value: string) {
  const cents = parseCents(value);
  const sign = cents < 0n ? '-' : '';
  const absolute = cents < 0n ? cents * -1n : cents;
  const dollars = absolute / 100n;
  const remainder = absolute % 100n;

  return `${sign}${dollars.toString()}.${remainder.toString().padStart(2, '0')}`;
}

function parseCents(value: string | undefined | null) {
  if (!value || !/^-?\d+$/.test(value)) {
    return 0n;
  }

  return BigInt(value);
}

function formatMoney(value: string, currency: string) {
  const cents = parseCents(value);
  const sign = cents < 0n ? '-' : '';
  const absolute = cents < 0n ? cents * -1n : cents;
  const dollars = (absolute / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const remainder = (absolute % 100n).toString().padStart(2, '0');

  return `${sign}${currency} ${dollars}.${remainder}`;
}

function percentToBasisPoints(value: string) {
  const clean = value.replace(/[^\d.]/g, '');
  const [whole = '0', decimals = ''] = clean.split('.');
  const normalizedDecimals = `${decimals}00`.slice(0, 2);

  return Number.parseInt(whole || '0', 10) * 100 + Number.parseInt(normalizedDecimals, 10);
}

function basisPointsToPercent(value: number) {
  const whole = Math.trunc(value / 100);
  const decimal = value % 100;

  return decimal === 0 ? String(whole) : `${whole}.${String(decimal).padStart(2, '0')}`;
}

function cleanText(value: string) {
  const normalized = value.trim();

  return normalized ? normalized : null;
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function relativeTime(date: Date) {
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));

  if (seconds < 5) {
    return 'ahora';
  }

  if (seconds < 60) {
    return `hace ${seconds}s`;
  }

  return `hace ${Math.round(seconds / 60)}m`;
}
