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
  IdCard,
  Keyboard,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  ShieldCheck,
  Sparkles,
  UserRoundPlus,
  Users,
  Upload,
  Workflow,
  X,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  calculateBusinessDraftProgress,
  calculateNegotiationAdjustments,
  type BusinessDraftProgress,
} from '@soyre/shared';
import {
  apiFetch,
  AuthMembership,
  AuthUser,
  BusinessContextAgent,
  BusinessContextClient,
  BusinessContextProperty,
  BusinessContextResponse,
  BusinessContextUser,
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
  NegotiationAdjustmentCalculation,
  PaymentPlanCalculation,
} from '../lib/api';
import {
  fileToIdentityDocumentPayload,
  IdentityDocumentPayload,
  isSupportedIdentityFile,
} from '../lib/identity-document-file';
import {
  NationalIdCountry,
  nationalIdCountries,
  parseNationalIdOcr,
} from '../lib/national-id-ocr';
import { extractPassportMrz, parsePassportMrz } from '../lib/passport-mrz';
import {
  Button,
  ErrorState,
  LoadingState,
  PageHeader,
  ProgressMeter,
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
  userId?: string;
  realEstateAgentId?: string;
  displayName: string;
  email?: string | null;
  phone?: string | null;
  documentId?: string | null;
  role: BusinessParticipantRole;
  roles?: BusinessParticipantRole[];
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

type NegotiationAdjustmentDraft = {
  id: string;
  category: 'MATERIALS' | 'IMPROVEMENTS' | 'ASSIGNMENT' | 'OTHER';
  label: string;
  amountCents: string;
  direction: 'INCREASE' | 'DECREASE';
  appliesTo: string;
  notes: string;
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
  negotiationAdjustments: NegotiationAdjustmentDraft[];
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

type InlineIdentityMode = 'manual' | 'passport' | 'national_id';
type InlineIdentityStatus = 'idle' | 'reading' | 'ready' | 'error';

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
  { id: 'review', label: 'Revisión', icon: ClipboardCheck },
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
  ASSIGNMENT: 'Cesión',
  OTHER: 'Otro',
  PRE_SALE: 'Preventa',
  RENT: 'Alquiler',
  RESERVATION: 'Reserva',
  SALE: 'Venta',
  SEPARATION: 'Separación',
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
  MANUAL_APPROVAL: 'Aprobación manual',
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
  negotiationAdjustments: [],
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
  const searchParams = useSearchParams();
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
  const [isContextRefreshing, setIsContextRefreshing] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [newClient, setNewClient] = useState<NewClientForm>({
    email: '',
    firstName: '',
    lastName: '',
    legalId: '',
    phone: '',
  });
  const [clientIdentityMode, setClientIdentityMode] =
    useState<InlineIdentityMode>('manual');
  const [clientIdentityCountry, setClientIdentityCountry] =
    useState<NationalIdCountry>('CO');
  const [clientIdentityPayload, setClientIdentityPayload] =
    useState<IdentityDocumentPayload | null>(null);
  const [clientIdentityStatus, setClientIdentityStatus] =
    useState<InlineIdentityStatus>('idle');
  const [clientIdentityError, setClientIdentityError] = useState<string | null>(null);
  const [clientIdentityFileName, setClientIdentityFileName] = useState<string | null>(
    null,
  );
  const [clientPassportMrz, setClientPassportMrz] = useState('');
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
        const draftId = searchParams.get('draftId');

        if (!membership) {
          throw new Error('No tienes una organización activa.');
        }

        const draftResponse = draftId
          ? await apiFetch<BusinessDraftResponse>(`/businesses/${draftId}`)
          : await apiFetch<BusinessDraftResponse>('/business-drafts', {
              body: JSON.stringify({
                currency: defaultWizardData.currency,
                mode: defaultWizardData.mode,
                operationType: defaultWizardData.operationType,
                organizationId: membership.organizationId,
                title: 'Nuevo negocio',
              }),
              method: 'POST',
            });

        if (draftResponse.business.status !== 'DRAFT') {
          throw new Error('Este negocio ya no es un borrador editable.');
        }

        const organizationId = draftResponse.business.organizationId;
        const query = new URLSearchParams({ organizationId });
        const contextResponse = await apiFetch<BusinessContextResponse>(
          `/businesses/new/context?${query.toString()}`,
        );
        const merged = mergeWizardData(
          defaultWizardData,
          draftResponse.business.draftData,
        );

        if (!isMounted) {
          return;
        }

        setUser(auth.user);
        setActiveOrganizationId(organizationId);
        setContext(contextResponse);
        setDraft(draftResponse.business);
        setData(merged);
        setIsDirty(false);
        setLastSavedAt(new Date(draftResponse.business.updatedAt));
      } catch (caught) {
        if (isMounted) {
          setError(
        caught instanceof Error ? caught.message : 'No se pudo iniciar el borrador.',
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
  }, [searchParams]);

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
  const draftProgress = useMemo(
    () => calculateBusinessDraftProgress(data),
    [data],
  );
  const localNegotiationCalculation = useMemo(
    () =>
      calculateNegotiationAdjustments({
        adjustments: data.negotiationAdjustments,
        currency: data.currency,
      }),
    [data.currency, data.negotiationAdjustments],
  );
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
  const visibleNegotiationCalculation =
    preview?.negotiationAdjustments ?? localNegotiationCalculation;

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

  function addNegotiationAdjustment() {
    updateData({
      negotiationAdjustments: [
        ...data.negotiationAdjustments,
        {
          amountCents: '0',
          appliesTo: 'BUYER',
          category: 'MATERIALS',
          direction: 'INCREASE',
          id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`,
          label: '',
          notes: '',
        },
      ],
    });
  }

  function updateNegotiationAdjustment(
    index: number,
    patch: Partial<NegotiationAdjustmentDraft>,
  ) {
    updateData({
      negotiationAdjustments: data.negotiationAdjustments.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    });
  }

  function removeNegotiationAdjustment(index: number) {
    updateData({
      negotiationAdjustments: data.negotiationAdjustments.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
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

  async function refreshContext() {
    if (!activeOrganizationId) {
      return;
    }

    setIsContextRefreshing(true);
    setFormError(null);

    try {
      const query = new URLSearchParams({ organizationId: activeOrganizationId });
      const contextResponse = await apiFetch<BusinessContextResponse>(
        `/businesses/new/context?${query.toString()}`,
      );

      setContext(contextResponse);
      setSuccessMessage('Clientes, inmuebles y agentes actualizados.');
    } catch (caught) {
      setFormError(
        caught instanceof Error
          ? caught.message
          : 'No se pudieron actualizar clientes, inmuebles y agentes.',
      );
    } finally {
      setIsContextRefreshing(false);
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
        caught instanceof Error ? caught.message : 'No se pudo generar la vista previa.',
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
      setClientError('Ese cliente ya está agregado al negocio.');
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
          roles: [role],
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
      if (clientIdentityStatus === 'reading') {
        throw new Error('Espera a que termine la lectura del documento.');
      }

      if (clientIdentityMode !== 'manual' && !clientIdentityPayload) {
        throw new Error('Carga el documento de identidad antes de crear el cliente.');
      }

      const clientRole: ClientRole = data.operationType === 'RENT' ? 'LESSEE' : 'BUYER';
      const correctedIdentityDocument = clientIdentityPayload
        ? {
            ...clientIdentityPayload,
            documentNumber:
              cleanText(newClient.legalId) ?? clientIdentityPayload.documentNumber,
            firstName:
              nameCase(newClient.firstName) ?? clientIdentityPayload.firstName,
            lastName: nameCase(newClient.lastName) ?? clientIdentityPayload.lastName,
          }
        : null;
      const payload: CreateClientPayload = {
        dataConsent: true,
        email: cleanText(newClient.email) ?? undefined,
        firstName: cleanText(newClient.firstName) ?? undefined,
        lastName: cleanText(newClient.lastName) ?? undefined,
        legalId: cleanText(newClient.legalId) ?? undefined,
        organizationId: activeOrganizationId,
        phone: cleanText(newClient.phone) ?? undefined,
        roles: [clientRole],
        status: 'ACTIVE',
        type: 'PERSON',
        ...(correctedIdentityDocument
          ? { identityDocument: correctedIdentityDocument }
          : {}),
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
            role: defaultClientRole(data.operationType),
          },
        ],
      });
      setNewClient({
        email: '',
        firstName: '',
        lastName: '',
        legalId: '',
        phone: '',
      });
      resetInlineIdentity();
    } catch (caught) {
      setClientError(
        caught instanceof Error ? caught.message : 'No se pudo crear el cliente.',
      );
    }
  }

  function resetInlineIdentity(mode: InlineIdentityMode = 'manual') {
    setClientIdentityMode(mode);
    setClientIdentityCountry('CO');
    setClientIdentityPayload(null);
    setClientIdentityStatus('idle');
    setClientIdentityError(null);
    setClientIdentityFileName(null);
    setClientPassportMrz('');
  }

  function changeInlineIdentityMode(mode: InlineIdentityMode) {
    resetInlineIdentity(mode);
  }

  function changeInlineIdentityCountry(country: NationalIdCountry) {
    setClientIdentityCountry(country);
    setClientIdentityPayload(null);
    setClientIdentityStatus('idle');
    setClientIdentityError(null);
    setClientIdentityFileName(null);
  }

  async function processInlineIdentityFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';

    if (!file) {
      return;
    }

    if (!isSupportedIdentityFile(file)) {
      setClientIdentityStatus('error');
      setClientIdentityError('El documento debe ser una imagen JPEG, PNG o WebP.');
      return;
    }

    const documentType =
      clientIdentityMode === 'passport' ? 'PASSPORT' : 'NATIONAL_ID';
    setClientIdentityStatus('reading');
    setClientIdentityError(null);
    setClientIdentityFileName(file.name);

    try {
      const basePayload = await fileToIdentityDocumentPayload(file, documentType);
      setClientIdentityPayload(basePayload);
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');

      try {
        if (documentType === 'PASSPORT') {
          await worker.setParameters({
            preserve_interword_spaces: '1',
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<',
          });
        }

        const {
          data: { text },
        } = await worker.recognize(file, { rotateAuto: true });

        if (documentType === 'PASSPORT') {
          const mrz = extractPassportMrz(text);
          setClientIdentityPayload({ ...basePayload, ocrText: text });

          if (!mrz) {
            throw new Error(
              'No se detectó la MRZ. Puedes pegarla o corregirla manualmente.',
            );
          }

          setClientPassportMrz(mrz);
          applyInlinePassportMrz(mrz, { ...basePayload, ocrText: text });
        } else {
          const parsed = parseNationalIdOcr(text, clientIdentityCountry);
          const country = nationalIdCountries.find(
            (item) => item.value === clientIdentityCountry,
          );
          setClientIdentityPayload({
            ...basePayload,
            documentNumber: parsed.documentNumber ?? undefined,
            issuingCountry: country?.issuingCountry,
            firstName: nameCase(parsed.firstName),
            lastName: nameCase(parsed.lastName),
            ocrText: parsed.rawText,
            extractedData: {
              country: clientIdentityCountry,
              parser: `national-id-ocr-${clientIdentityCountry.toLocaleLowerCase()}`,
            },
          });
          setNewClient((current) => ({
            ...current,
            firstName: nameCase(parsed.firstName) ?? current.firstName,
            lastName: nameCase(parsed.lastName) ?? current.lastName,
            legalId: parsed.documentNumber ?? current.legalId,
          }));
          setClientIdentityStatus('ready');
        }
      } finally {
        await worker.terminate();
      }
    } catch (caught) {
      setClientIdentityStatus('error');
      setClientIdentityError(
        caught instanceof Error ? caught.message : 'No se pudo leer el documento.',
      );
    }
  }

  function applyInlinePassportMrz(
    mrz = clientPassportMrz,
    basePayload = clientIdentityPayload,
  ) {
    try {
      const parsed = parsePassportMrz(mrz);

      if (basePayload) {
        setClientIdentityPayload({
          ...basePayload,
          type: 'PASSPORT',
          documentNumber: parsed.documentNumber,
          issuingCountry: parsed.issuingCountry,
          firstName: nameCase(parsed.firstName),
          lastName: nameCase(parsed.lastName),
          birthDate: parsed.birthDate ?? undefined,
          expirationDate: parsed.expirationDate ?? undefined,
          extractedData: {
            mrz: parsed.mrz,
            parser: 'td3-mrz',
            sex: parsed.sex,
          },
        });
      }

      setNewClient((current) => ({
        ...current,
        firstName: nameCase(parsed.firstName) ?? current.firstName,
        lastName: nameCase(parsed.lastName) ?? current.lastName,
        legalId: parsed.documentNumber,
      }));
      setClientIdentityError(null);
      setClientIdentityStatus('ready');
    } catch (caught) {
      setClientIdentityStatus('error');
      setClientIdentityError(
        caught instanceof Error ? caught.message : 'La MRZ no pudo interpretarse.',
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
          ? {
              ...participant,
              role,
              roles: Array.from(
                new Set([
                  role,
                  ...(participant.roles ?? []).filter(
                    (item) =>
                      item !== participant.role ||
                      ['PRIMARY_AGENT', 'CO_AGENT', 'REFERRER', 'BROKER'].includes(
                        item,
                      ),
                  ),
                ]),
              ),
            }
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

    const selected = data.participants.find(
      (participant) =>
        participant.realEstateAgentId === agent.id ||
        samePersonEmail(participant.email, agent.email),
    );
    const nextParticipants = data.participants
      .filter((participant) => participant.participantKey !== selected?.participantKey)
      .map<BusinessParticipantDraft>((participant) => {
        if (participant.role !== 'PRIMARY_AGENT') {
          return participant;
        }

        const roles = (participant.roles ?? [participant.role]).filter(
          (role) => role !== 'PRIMARY_AGENT',
        );

        return {
          ...participant,
          isPrimary: false,
          role: roles[0] ?? 'CO_AGENT',
          roles: roles.length > 0 ? roles : ['CO_AGENT' as const],
        };
      });
    const primaryParticipant = selected
      ? {
          ...selected,
          commissionEligible: true,
          email: selected.email ?? agent.email,
          isPrimary: true,
          phone: selected.phone ?? agent.phone,
          realEstateAgentId: agent.id,
          role: 'PRIMARY_AGENT' as const,
          roles: Array.from(
            new Set(['PRIMARY_AGENT' as const, ...(selected.roles ?? [selected.role])]),
          ),
        }
      : agentParticipant(agent, 'PRIMARY_AGENT');

    updateData({
      participants: [...nextParticipants, primaryParticipant],
    });
    setNewAgentId(agentId);
  }

  function addCommissionRecipient(candidateKey: string) {
    const [kind, id] = candidateKey.split(':');
    const client = kind === 'CLIENT' ? context?.clients.find((item) => item.id === id) : null;
    const user = kind === 'USER' ? context?.users.find((item) => item.id === id) : null;
    const agent = kind === 'AGENT' ? context?.agents.find((item) => item.id === id) : null;
    const candidateEmail = client?.email ?? user?.email ?? agent?.email;
    const existing = data.participants.find((participant) =>
      kind === 'CLIENT'
        ? participant.clientId === id || samePersonEmail(participant.email, candidateEmail)
        : kind === 'USER'
          ? participant.userId === id || samePersonEmail(participant.email, candidateEmail)
          : participant.realEstateAgentId === id ||
            samePersonEmail(participant.email, candidateEmail),
    );

    if (!existing && !client && !user && !agent) {
      setFormError('Selecciona una persona registrada como receptor.');
      return;
    }

    const participant: BusinessParticipantDraft = existing
      ? {
          ...existing,
          clientId: existing.clientId ?? client?.id,
          commissionEligible: true,
          realEstateAgentId: existing.realEstateAgentId ?? agent?.id,
          roles: Array.from(new Set([...(existing.roles ?? [existing.role]), 'REFERRER'])),
          userId: existing.userId ?? user?.id,
        }
      : client
        ? {
            clientId: client.id,
            commissionEligible: true,
            displayName: client.displayName,
            documentId: client.legalId,
            email: client.email,
            participantKey: client.id,
            phone: client.phone,
            role: 'REFERRER',
            roles: ['REFERRER'],
          }
        : user
          ? {
              commissionEligible: true,
              displayName: [user.firstName, user.lastName].filter(Boolean).join(' '),
              email: user.email,
              participantKey: `USER:${user.id}`,
              role: 'REFERRER',
              roles: ['REFERRER'],
              userId: user.id,
            }
          : agentParticipant(agent as BusinessContextAgent, 'REFERRER');
    const participants = existing
      ? data.participants.map((item) =>
          item.participantKey === existing.participantKey ? participant : item,
        )
      : [...data.participants, participant];
    const alreadyAssigned = data.commissionPlan.rules.some(
      (rule) =>
        rule.participantKey === participant.participantKey &&
        rule.recipientType === 'REFERRER',
    );

    updateData({
      participants,
      commissionPlan: {
        ...data.commissionPlan,
        rules: alreadyAssigned
          ? data.commissionPlan.rules
          : [
              ...data.commissionPlan.rules,
              {
                calculationType: 'PERCENTAGE_OF_COMMISSION',
                label: participant.displayName,
                participantKey: participant.participantKey,
                percentageBasisPoints: 0,
                recipientType: 'REFERRER',
                releaseTrigger: data.commissionPlan.releaseTrigger,
              },
            ],
      },
    });
    setCommParticipantId('');
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
        title="Preparando creación de negocio"
        description="Cargando contexto de organización, clientes, inmuebles y contratos."
      />
    );
  }

  if (error || !context || !draft) {
    return (
      <ErrorState
        title="No se pudo abrir el borrador"
        description={error ?? 'Falta contexto para crear negocios.'}
      />
    );
  }

  return (
    <div className="business-wizard-page">
      <PageHeader
        eyebrow="Negocios"
        title={draft.code ? `Continuar ${draft.code}` : 'Crear negocio'}
        description="Flujo transaccional con borrador, cálculos, validación y vista previa antes de confirmar."
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
            <Button variant="secondary" onClick={() => void saveDraft()} icon={Save}>
              Guardar
            </Button>
            <Button
              variant="secondary"
              disabled={isContextRefreshing}
              icon={RefreshCcw}
              loading={isContextRefreshing}
              onClick={() => void refreshContext()}
            >
              Actualizar datos
            </Button>
            <Button
              disabled={isPreviewing}
              icon={ClipboardCheck}
              loading={isPreviewing}
              onClick={() => {
                setActiveStep('review');
                void refreshPreview();
              }}
            >
              Vista previa
            </Button>
          </>
        }
      />

      <div className="business-progress-card">
        <ProgressMeter
          detail={
            draftProgress.nextStepLabel
              ? `Siguiente bloque: ${draftProgress.nextStepLabel}.`
              : 'Borrador listo para revisión.'
          }
          label="Avance del borrador"
          value={draftProgress.percent}
        />
      </div>

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
              clientIdentityCountry={clientIdentityCountry}
              clientIdentityError={clientIdentityError}
              clientIdentityFileName={clientIdentityFileName}
              clientIdentityMode={clientIdentityMode}
              clientIdentityPayload={clientIdentityPayload}
              clientIdentityStatus={clientIdentityStatus}
              clientPassportMrz={clientPassportMrz}
              clientError={clientError}
              clients={context.clients}
              data={data}
              newClient={newClient}
              onAddExistingClient={addExistingClient}
              onApplyPassportMrz={() => applyInlinePassportMrz()}
              onIdentityCountryChange={changeInlineIdentityCountry}
              onIdentityFileChange={(event) => void processInlineIdentityFile(event)}
              onIdentityModeChange={changeInlineIdentityMode}
              onPassportMrzChange={setClientPassportMrz}
              onCreateClient={(event) => void createInlineClient(event)}
              onNewClientChange={setNewClient}
              onRefreshContext={() => void refreshContext()}
              onRemoveParticipant={removeParticipant}
              onRoleChange={setParticipantRole}
              isContextRefreshing={isContextRefreshing}
            />
          ) : null}
          {activeStep === 'property' ? (
            <PropertyStep
              data={data}
              isContextRefreshing={isContextRefreshing}
              onSelectProperty={selectProperty}
              onRefreshContext={() => void refreshContext()}
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
              calculation={visibleNegotiationCalculation}
              data={data}
              onAddAdjustment={addNegotiationAdjustment}
              onAdjustmentChange={updateNegotiationAdjustment}
              onRemoveAdjustment={removeNegotiationAdjustment}
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
              clients={context.clients}
              calculation={visibleCommissionCalculation}
              commParticipantId={commParticipantId}
              data={data}
              newAgentId={newAgentId}
              onAddAdvancedRule={addSimpleRuleToAdvanced}
              onAddCommissionRecipient={addCommissionRecipient}
              onPrimaryAgentChange={addPrimaryAgent}
              onRefreshContext={() => void refreshContext()}
              onRemoveRule={removeCommissionRule}
              onRuleChange={updateCommissionRule}
              primaryAgent={primaryAgent}
              setCommParticipantId={setCommParticipantId}
              updateCommissionPlan={updateCommissionPlan}
              updateData={updateData}
              users={context.users}
              isContextRefreshing={isContextRefreshing}
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
              negotiationCalculation={visibleNegotiationCalculation}
              onCommit={() => void commitBusiness()}
              onRefreshPreview={() => void refreshPreview()}
              paymentCalculation={visiblePaymentCalculation}
              preview={preview}
              validation={validation}
            />
          ) : null}

          <div className="wizard-navigation">
            <Button
              variant="secondary"
              disabled={currentStepIndex === 0}
              icon={ChevronLeft}
              onClick={() => goToStep(-1)}
            >
              Volver
            </Button>
            <Button
              disabled={currentStepIndex === steps.length - 1}
              onClick={() => goToStep(1)}
            >
              Continuar
              <ChevronRight size={17} />
            </Button>
          </div>
        </section>

        <BusinessSummary
          activeMembership={activeMembership}
          commissionCalculation={visibleCommissionCalculation}
          data={data}
          draft={draft}
          negotiationCalculation={visibleNegotiationCalculation}
          paymentCalculation={visiblePaymentCalculation}
          selectedContractType={selectedContractType}
          selectedProperty={selectedProperty}
          validationCounts={validationCounts}
          draftProgress={draftProgress}
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
      description="Primero definimos la operación, moneda y fechas base. El modo avanzado abre estructuras múltiples sin cambiar el flujo."
    >
      <div className="business-form-grid">
        <label>
          Operación
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
            <small>Un cliente, un agente, comisión directa y pagos básicos.</small>
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
            <small>Participantes, hitos, referidos, cargos y reglas múltiples.</small>
          </span>
        </button>
      </div>
    </SectionPanel>
  );
}

function ClientsStep({
  clientIdentityCountry,
  clientIdentityError,
  clientIdentityFileName,
  clientIdentityMode,
  clientIdentityPayload,
  clientIdentityStatus,
  clientPassportMrz,
  clientError,
  clients,
  data,
  isContextRefreshing,
  newClient,
  onAddExistingClient,
  onApplyPassportMrz,
  onIdentityCountryChange,
  onIdentityFileChange,
  onIdentityModeChange,
  onPassportMrzChange,
  onCreateClient,
  onNewClientChange,
  onRefreshContext,
  onRemoveParticipant,
  onRoleChange,
}: {
  clientIdentityCountry: NationalIdCountry;
  clientIdentityError: string | null;
  clientIdentityFileName: string | null;
  clientIdentityMode: InlineIdentityMode;
  clientIdentityPayload: IdentityDocumentPayload | null;
  clientIdentityStatus: InlineIdentityStatus;
  clientPassportMrz: string;
  clientError: string | null;
  clients: BusinessContextClient[];
  data: BusinessWizardData;
  isContextRefreshing: boolean;
  newClient: NewClientForm;
  onAddExistingClient: (clientId: string) => void;
  onApplyPassportMrz: () => void;
  onIdentityCountryChange: (country: NationalIdCountry) => void;
  onIdentityFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onIdentityModeChange: (mode: InlineIdentityMode) => void;
  onPassportMrzChange: (value: string) => void;
  onCreateClient: (event: FormEvent<HTMLFormElement>) => void;
  onNewClientChange: (value: NewClientForm) => void;
  onRefreshContext: () => void;
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
      description="Puedes buscar un cliente existente o crearlo sin salir del flujo."
      actions={
        <Button
          variant="secondary"
          icon={RefreshCcw}
          loading={isContextRefreshing}
          disabled={isContextRefreshing}
          onClick={onRefreshContext}
        >
          Actualizar clientes
        </Button>
      }
    >
      {clientError ? <div className="form-error">{clientError}</div> : null}
      {clients.length === 0 ? (
        <div className="business-note">
          No hay clientes cargados en este borrador. Actualiza la lista o crea un
          cliente rapido.
        </div>
      ) : null}
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
            Aún no hay clientes en el negocio.
          </div>
        ) : (
          clientParticipants.map((participant) => (
            <div className="business-row-card" key={participant.participantKey}>
              <span className="avatar">{initials(participant.displayName)}</span>
              <div>
                <strong>{participant.displayName}</strong>
                <span className="meta-row">
                  {participant.email ?? 'Sin email'} · {participant.phone ?? 'Sin teléfono'}
                </span>
                <span className="meta-row">
                  Roles: {participantRoleLabels(participant).join(', ')}
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
        <strong>Crear cliente rápido</strong>
        <div className="intake-mode-toggle" aria-label="Método de alta rápida">
          <button
            className={clientIdentityMode === 'manual' ? 'mode-button active' : 'mode-button'}
            onClick={() => onIdentityModeChange('manual')}
            type="button"
          >
            <Keyboard size={17} /> Manual
          </button>
          <button
            className={clientIdentityMode === 'passport' ? 'mode-button active' : 'mode-button'}
            onClick={() => onIdentityModeChange('passport')}
            type="button"
          >
            <FileText size={17} /> Pasaporte
          </button>
          <button
            className={clientIdentityMode === 'national_id' ? 'mode-button active' : 'mode-button'}
            onClick={() => onIdentityModeChange('national_id')}
            type="button"
          >
            <IdCard size={17} /> Cédula
          </button>
        </div>

        {clientIdentityMode !== 'manual' ? (
          <div className="inline-identity-intake">
            {clientIdentityMode === 'national_id' ? (
              <label>
                País de la cédula
                <select
                  onChange={(event) =>
                    onIdentityCountryChange(event.target.value as NationalIdCountry)
                  }
                  value={clientIdentityCountry}
                >
                  {nationalIdCountries.map((country) => (
                    <option key={country.value} value={country.value}>
                      {country.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="passport-upload">
              <Upload size={18} />
              <span>
                <strong>Seleccionar imagen</strong>
                <small>{clientIdentityFileName ?? 'JPG, PNG o WebP'}</small>
              </span>
              <input
                accept="image/jpeg,image/png,image/webp"
                disabled={clientIdentityStatus === 'reading'}
                onChange={onIdentityFileChange}
                type="file"
              />
            </label>
            {clientIdentityMode === 'passport' ? (
              <label>
                MRZ detectada
                <textarea
                  className="mrz-textarea"
                  onChange={(event) => onPassportMrzChange(event.target.value)}
                  placeholder="P&lt;COLAPELLIDO&lt;&lt;NOMBRES..."
                  value={clientPassportMrz}
                />
                <Button
                  variant="secondary"
                  disabled={!clientPassportMrz.trim() || clientIdentityStatus === 'reading'}
                  onClick={onApplyPassportMrz}
                  type="button"
                >
                  Aplicar datos
                </Button>
              </label>
            ) : null}
            <div className="passport-status" aria-live="polite">
              {clientIdentityStatus === 'reading'
                ? 'Leyendo documento...'
                : clientIdentityPayload
                  ? `Documento listo: ${clientIdentityPayload.documentNumber ?? 'revisar número'}`
                  : 'La imagen se procesa localmente y no constituye KYC.'}
            </div>
            {clientIdentityError ? (
              <p className="form-error">{clientIdentityError}</p>
            ) : null}
          </div>
        ) : null}
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
            Teléfono
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
          <Button variant="secondary" type="submit" icon={UserRoundPlus}>
            Crear y agregar
          </Button>
        </div>
      </form>
    </SectionPanel>
  );
}

function PropertyStep({
  data,
  isContextRefreshing,
  onSelectProperty,
  onRefreshContext,
  properties,
  selectedProperty,
}: {
  data: BusinessWizardData;
  isContextRefreshing: boolean;
  onSelectProperty: (propertyId: string) => void;
  onRefreshContext: () => void;
  properties: BusinessContextProperty[];
  selectedProperty: BusinessContextProperty | null;
}) {
  return (
    <SectionPanel
      title="Inmueble, proyecto o unidad"
      description="El negocio puede quedar como borrador sin inmueble, pero algunos contratos lo requerirán para confirmar."
      actions={
        <Button
          variant="secondary"
          icon={RefreshCcw}
          loading={isContextRefreshing}
          disabled={isContextRefreshing}
          onClick={onRefreshContext}
        >
          Actualizar inmuebles
        </Button>
      }
    >
      {properties.length === 0 ? (
        <div className="business-note">
          No hay inmuebles cargados en este borrador. Actualiza la lista si
          creaste propiedades en otro modulo.
        </div>
      ) : null}
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
          El borrador seguirá sin inmueble. La confirmación puede bloquearse si el contrato lo exige.
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
      detail: 'Condición manual con aprobación antes de crear cargos.',
    },
    {
      type: 'ASSIGNMENT_FEE',
      label: 'Costo de cesión',
      detail: 'Queda condicionado a solicitud de cesión.',
    },
    {
      type: 'LATE_FEE',
      label: 'Penalidad por mora',
      detail: 'Puede generar cargos futuros por pagos vencidos.',
    },
    {
      type: 'FINANCING_CONDITION',
      label: 'Condición de financiamiento',
      detail: 'Marca revisión operativa o legal.',
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
  calculation,
  data,
  onAddAdjustment,
  onAdjustmentChange,
  onRemoveAdjustment,
  onSyncTotals,
  updateFinancial,
}: {
  calculation: NegotiationAdjustmentCalculation;
  data: BusinessWizardData;
  onAddAdjustment: () => void;
  onAdjustmentChange: (
    index: number,
    patch: Partial<NegotiationAdjustmentDraft>,
  ) => void;
  onRemoveAdjustment: (index: number) => void;
  onSyncTotals: (source: keyof BusinessWizardData['financial']) => void;
  updateFinancial: (key: keyof BusinessWizardData['financial'], value: string) => void;
}) {
  return (
    <SectionPanel
      title="Monto y base financiera"
      description="Todos los montos se guardan en centavos. El total pagable alimenta el plan de pagos y la base de comisión."
      actions={
        <Button
          variant="secondary"
          icon={RefreshCcw}
          onClick={() => onSyncTotals('basePriceCents')}
        >
          Usar precio base
        </Button>
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
          label="Base de comisión"
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
          Comisión sobre
          <strong>
            {formatMoney(data.financial.commissionBaseAmountCents, data.currency)}
          </strong>
        </span>
      </div>

      <div className="negotiation-adjustments-header">
        <div>
          <strong>Ajustes referenciales de negociación</strong>
          <p>
            Registra diferencias de materiales, mejoras, cesiones u otros acuerdos.
            No cambian automáticamente el contrato ni el plan de pagos.
          </p>
        </div>
        <Button variant="secondary" icon={Plus} onClick={onAddAdjustment}>
          Agregar ajuste
        </Button>
      </div>

      {data.negotiationAdjustments.length > 0 ? (
        <div className="business-list">
          {data.negotiationAdjustments.map((adjustment, index) => (
            <div className="negotiation-adjustment-row" key={adjustment.id}>
              <div className="business-form-grid">
                <label>
                  Categoría
                  <select
                    value={adjustment.category}
                    onChange={(event) =>
                      onAdjustmentChange(index, {
                        category: event.target
                          .value as NegotiationAdjustmentDraft['category'],
                      })
                    }
                  >
                    <option value="MATERIALS">Materiales</option>
                    <option value="IMPROVEMENTS">Mejoras</option>
                    <option value="ASSIGNMENT">Cesión</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </label>
                <label>
                  Concepto
                  <input
                    value={adjustment.label}
                    onChange={(event) =>
                      onAdjustmentChange(index, { label: event.target.value })
                    }
                  />
                </label>
                <label>
                  Sentido
                  <select
                    value={adjustment.direction}
                    onChange={(event) =>
                      onAdjustmentChange(index, {
                        direction: event.target
                          .value as NegotiationAdjustmentDraft['direction'],
                      })
                    }
                  >
                    <option value="INCREASE">Incremento referencial</option>
                    <option value="DECREASE">Descuento referencial</option>
                  </select>
                </label>
                <MoneyField
                  label="Monto referencial"
                  value={adjustment.amountCents}
                  onChange={(value) =>
                    onAdjustmentChange(index, { amountCents: moneyToCents(value) })
                  }
                />
                <label>
                  Aplica a
                  <select
                    value={adjustment.appliesTo}
                    onChange={(event) =>
                      onAdjustmentChange(index, { appliesTo: event.target.value })
                    }
                  >
                    <option value="BUYER">Comprador</option>
                    <option value="SELLER">Vendedor</option>
                    <option value="TENANT">Arrendatario</option>
                    <option value="LANDLORD">Arrendador</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </label>
                <label>
                  Notas
                  <input
                    value={adjustment.notes}
                    onChange={(event) =>
                      onAdjustmentChange(index, { notes: event.target.value })
                    }
                  />
                </label>
              </div>
              <Button
                variant="ghost"
                icon={X}
                onClick={() => onRemoveAdjustment(index)}
              >
                Quitar
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="business-empty-row">
          <Banknote size={18} />
          No hay diferencias referenciales registradas.
        </div>
      )}

      <div className="financial-breakdown">
        <span>
          Incrementos referenciales
          <strong>{formatMoney(calculation.increaseTotalCents, data.currency)}</strong>
        </span>
        <span>
          Descuentos referenciales
          <strong>{formatMoney(calculation.decreaseTotalCents, data.currency)}</strong>
        </span>
        <span>
          Neto referencial
          <strong>{formatMoney(calculation.netReferenceCents, data.currency)}</strong>
        </span>
        <span>
          Efecto automático
          <strong>Ninguno</strong>
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
      description="El sistema recalcula el calendario y bloquea la confirmación si la suma no cuadra."
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
          Día de vencimiento
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
        <Button variant="secondary" icon={Plus} onClick={onAddSpecialLine}>
          Pago especial
        </Button>
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
                <option value="ASSIGNMENT_FEE">Cesión</option>
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
  clients,
  commParticipantId,
  data,
  isContextRefreshing,
  newAgentId,
  onAddAdvancedRule,
  onAddCommissionRecipient,
  onPrimaryAgentChange,
  onRefreshContext,
  onRemoveRule,
  onRuleChange,
  primaryAgent,
  setCommParticipantId,
  updateCommissionPlan,
  updateData,
  users,
}: {
  agents: BusinessContextAgent[];
  calculation: CommissionPlanCalculation;
  clients: BusinessContextClient[];
  commParticipantId: string;
  data: BusinessWizardData;
  isContextRefreshing: boolean;
  newAgentId: string;
  onAddAdvancedRule: () => void;
  onAddCommissionRecipient: (candidateKey: string) => void;
  onPrimaryAgentChange: (agentId: string) => void;
  onRefreshContext: () => void;
  onRemoveRule: (index: number) => void;
  onRuleChange: (index: number, patch: Partial<CommissionRuleDraft>) => void;
  primaryAgent: BusinessParticipantDraft | undefined;
  setCommParticipantId: (value: string) => void;
  updateCommissionPlan: (
    key: keyof BusinessWizardData['commissionPlan'],
    value: BusinessWizardData['commissionPlan'][keyof BusinessWizardData['commissionPlan']],
  ) => void;
  updateData: (patch: Partial<BusinessWizardData>) => void;
  users: BusinessContextUser[];
}) {
  const commissionParticipants = data.participants;
  const registeredCandidates = [
    ...clients.map((client) => ({
      key: `CLIENT:${client.id}`,
      label: `${client.displayName} · Cliente`,
    })),
    ...agents.map((agent) => ({
      key: `AGENT:${agent.id}`,
      label: `${agent.displayName} · Agente`,
    })),
    ...users.map((user) => ({
      key: `USER:${user.id}`,
      label: `${[user.firstName, user.lastName].filter(Boolean).join(' ')} · Usuario`,
    })),
  ];

  return (
    <SectionPanel
      title="Comisiones"
      description="Cada fila debe enlazarse a una persona registrada. Una misma persona conserva todos sus roles dentro del negocio."
      actions={
        <Button
          variant="secondary"
          icon={RefreshCcw}
          loading={isContextRefreshing}
          disabled={isContextRefreshing}
          onClick={onRefreshContext}
        >
          Actualizar agentes
        </Button>
      }
    >
      {agents.length === 0 ? (
        <div className="business-note">
          No hay agentes cargados en este borrador. Actualiza la lista si creaste
          agentes en otro modulo antes de continuar.
        </div>
      ) : null}
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
              <option value="">Seleccionar receptor registrado</option>
              {registeredCandidates.map((candidate) => (
                <option key={candidate.key} value={candidate.key}>
                  {candidate.label}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              disabled={!commParticipantId}
              icon={Plus}
              onClick={() => onAddCommissionRecipient(commParticipantId)}
            >
              Agregar receptor
            </Button>
            <Button variant="secondary" icon={HandCoins} onClick={onAddAdvancedRule}>
              Regla base
            </Button>
          </div>

          <div className="business-list">
            {data.commissionPlan.rules.map((rule, index) => (
              <div className="commission-rule-row" key={`${rule.participantKey}-${index}`}>
                <select
                  value={rule.participantKey}
                  onChange={(event) => {
                    const participant = commissionParticipants.find(
                      (item) => item.participantKey === event.target.value,
                    );
                    onRuleChange(index, {
                      label: participant?.displayName ?? rule.label,
                      participantKey: event.target.value,
                    });
                  }}
                >
                  {commissionParticipants.map((participant) => (
                    <option
                      key={participant.participantKey}
                      value={participant.participantKey}
                    >
                      {participant.displayName} ·{' '}
                      {participantRoleLabels(participant).join(', ')}
                    </option>
                  ))}
                </select>
                <select
                  value={rule.recipientType}
                  onChange={(event) =>
                    onRuleChange(index, { recipientType: event.target.value })
                  }
                >
                  <option value="AGENT">Agente</option>
                  <option value="CO_AGENT">Co-agente</option>
                  <option value="REFERRER">Referido</option>
                  <option value="BROKER">Broker</option>
                  <option value="COMPANY">Empresa</option>
                  <option value="OTHER">Otro</option>
                </select>
                <select
                  value={rule.calculationType}
                  onChange={(event) =>
                    onRuleChange(index, { calculationType: event.target.value })
                  }
                >
                  <option value="PERCENTAGE_OF_SALE">% venta</option>
                  <option value="PERCENTAGE_OF_COMMISSION">% comisión</option>
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
          La comisión simple se calcula contra la base definida y se asigna al agente principal.
        </div>
      )}

      <CalculationMessages calculation={calculation} />
      <CommissionBreakdown
        calculation={calculation}
        currency={data.currency}
        participants={data.participants}
      />

      <div className="business-inline-actions">
        <Button
          variant="ghost"
          onClick={() =>
            updateData({ mode: data.mode === 'SIMPLE' ? 'ADVANCED' : 'SIMPLE' })
          }
        >
          Cambiar a modo {data.mode === 'SIMPLE' ? 'avanzado' : 'simple'}
        </Button>
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
      description="Estas acciones quedan programadas para alimentar tareas y recordatorios."
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
          Revisión interna
        </label>
        <label>
          <input
            checked={data.automations.commissionReminders}
            type="checkbox"
            onChange={(event) =>
              updateAutomation('commissionReminders', event.target.checked)
            }
          />
          Recordatorios de comisión
        </label>
      </div>
      <div className="business-note">
        Impactará cobranza futura, ventas por agente, comisiones pendientes y contratos por estado.
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
  negotiationCalculation,
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
  negotiationCalculation: NegotiationAdjustmentCalculation;
  onCommit: () => void;
  onRefreshPreview: () => void;
  paymentCalculation: PaymentPlanCalculation;
  preview: BusinessPreview | null;
  validation: BusinessValidationItem[];
}) {
  const blockingErrors = validation.filter((item) => item.level === 'ERROR');

  return (
    <SectionPanel
      title="Revisión final"
      description="Vista previa antes de crear registros definitivos. Si hay errores bloqueantes, el sistema no confirmará."
      actions={
        <Button
          variant="secondary"
          disabled={isPreviewing}
          icon={RefreshCcw}
          loading={isPreviewing}
          onClick={onRefreshPreview}
        >
          Actualizar vista previa
        </Button>
      }
    >
      <div className="review-grid">
        <ReviewBlock label="Operación" value={operationLabels[data.operationType]} />
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
          label="Comisión estimada"
          value={formatMoney(
            commissionCalculation.totalCommissionAmountCents,
            data.currency,
          )}
        />
        <ReviewBlock
          label="Neto referencial"
          value={formatMoney(
            negotiationCalculation.netReferenceCents,
            data.currency,
          )}
        />
        <ReviewBlock
          label="Ajustes referenciales"
          value={`${negotiationCalculation.items.length}`}
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
          Genera la vista previa para ver entidades, relaciones y respaldos de cálculo.
        </div>
      )}

      <PaymentPlanTable calculation={paymentCalculation} currency={data.currency} />
      <CommissionBreakdown
        calculation={commissionCalculation}
        currency={data.currency}
        participants={data.participants}
      />

      <div className="business-confirm-bar">
        <span>
          {blockingErrors.length > 0
            ? `${blockingErrors.length} errores bloqueantes`
            : 'Listo para confirmar si los datos son correctos'}
        </span>
        <Button
          disabled={!canCommit || blockingErrors.length > 0 || isCommitting}
          icon={ShieldCheck}
          loading={isCommitting}
          onClick={onCommit}
        >
          Confirmar y crear negocio
        </Button>
      </div>
    </SectionPanel>
  );
}

function BusinessSummary({
  activeMembership,
  commissionCalculation,
  data,
  draft,
  draftProgress,
  negotiationCalculation,
  paymentCalculation,
  selectedContractType,
  selectedProperty,
  validationCounts,
}: {
  activeMembership: AuthMembership | null;
  commissionCalculation: CommissionPlanCalculation;
  data: BusinessWizardData;
  draft: BusinessRecord;
  draftProgress: BusinessDraftProgress;
  negotiationCalculation: NegotiationAdjustmentCalculation;
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
          <dt>Operación</dt>
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
          <dt>Comisión estimada</dt>
          <dd>
            {formatMoney(
              commissionCalculation.totalCommissionAmountCents,
              data.currency,
            )}
          </dd>
        </div>
        <div>
          <dt>Neto referencial</dt>
          <dd>
            {formatMoney(negotiationCalculation.netReferenceCents, data.currency)}
          </dd>
        </div>
      </dl>
      <ProgressMeter
        detail={
          draftProgress.nextStepLabel
            ? `Siguiente: ${draftProgress.nextStepLabel}`
            : 'Borrador completo'
        }
        label="Avance"
        size="sm"
        value={draftProgress.percent}
      />
      <div className="summary-alerts">
        <span className={validationCounts.errors > 0 ? 'danger' : 'success'}>
          {validationCounts.errors} errores
        </span>
        <span>{validationCounts.warnings} avisos</span>
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
        Ejecuta la vista previa para ver validaciones.
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
  participants,
}: {
  calculation: CommissionPlanCalculation;
  currency: string;
  participants: BusinessParticipantDraft[];
}) {
  if (calculation.allocations.length === 0) {
    return (
      <div className="business-empty-row">
        <HandCoins size={18} />
        Sin asignaciones de comisión todavía.
      </div>
    );
  }

  return (
    <div className="table-shell compact-table">
      <table className="data-table">
        <thead>
          <tr>
            <th>Receptor registrado</th>
            <th>Roles</th>
            <th>Base</th>
            <th>Cálculo</th>
            <th>Valor</th>
            <th>Monto</th>
            <th>Liberación</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {calculation.allocations.map((allocation) => {
            const participant = participants.find(
              (item) => item.participantKey === allocation.participantKey,
            );

            return (
              <tr key={`${allocation.participantKey}-${allocation.label}`}>
                <td>{allocation.label}</td>
                <td>
                  {participant
                    ? participantRoleLabels(participant).join(', ')
                    : 'No registrado'}
                </td>
                <td>{formatMoney(calculation.baseAmountCents, currency)}</td>
                <td>{commissionCalculationLabel(allocation.calculationType)}</td>
                <td>{commissionRuleValue(allocation, currency)}</td>
                <td>{formatMoney(allocation.payableAmountCents, currency)}</td>
                <td>
                  {releaseTriggerLabels[allocation.releaseTrigger] ??
                    allocation.releaseTrigger}
                </td>
                <td>{allocation.status === 'PENDING' ? 'Pendiente' : allocation.status}</td>
              </tr>
            );
          })}
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
      description: 'Ajuste sujeto a evento y aprobación.',
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
      description: 'Cargo condicionado a solicitud de cesión.',
      percentageBps: 100,
      requiresApproval: false,
      title: 'Costo de cesión',
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
    title: 'Condición especial',
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
    roles: [role],
    isPrimary: role === 'PRIMARY_AGENT',
  };
}

function participantRoleLabels(participant: BusinessParticipantDraft) {
  const labels: Record<BusinessParticipantRole, string> = {
    BANK: 'Banco',
    BROKER: 'Broker',
    BUYER: 'Comprador',
    CO_AGENT: 'Co-agente',
    DEVELOPER: 'Promotor',
    GUARANTOR: 'Garante',
    LANDLORD: 'Arrendador',
    LAWYER: 'Abogado',
    LEGAL_REPRESENTATIVE: 'Representante legal',
    NOTARY: 'Notario',
    OTHER: 'Otro',
    PRIMARY_AGENT: 'Agente principal',
    REFERRER: 'Referido',
    SELLER: 'Vendedor',
    TENANT: 'Arrendatario',
    WITNESS: 'Testigo',
  };

  return Array.from(new Set(participant.roles ?? [participant.role])).map(
    (role) => labels[role],
  );
}

function commissionCalculationLabel(calculationType: string) {
  return (
    {
      CAPPED: 'Con tope',
      CUSTOM: 'Personalizado',
      FIXED_AMOUNT: 'Monto fijo',
      PERCENTAGE_OF_COMMISSION: '% comisión',
      PERCENTAGE_OF_SALE: '% venta',
      SLIDING_SCALE: 'Escala móvil',
      TIERED: 'Por tramos',
    }[calculationType] ?? calculationType
  );
}

function commissionRuleValue(
  allocation: CommissionPlanCalculation['allocations'][number],
  currency: string,
) {
  if (allocation.fixedAmountCents !== undefined) {
    return formatMoney(allocation.fixedAmountCents, currency);
  }

  if (allocation.percentageBasisPoints !== undefined) {
    return `${basisPointsToPercent(allocation.percentageBasisPoints)}%`;
  }

  return '—';
}

function samePersonEmail(
  left: string | null | undefined,
  right: string | null | undefined,
) {
  return Boolean(
    left && right && left.trim().toLowerCase() === right.trim().toLowerCase(),
  );
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

function nameCase(value?: string | null) {
  const normalized = value?.trim();

  if (!normalized) {
    return undefined;
  }

  return normalized
    .toLocaleLowerCase('es-PA')
    .replace(/(^|[\s'-])(\p{L})/gu, (_match, prefix: string, letter: string) =>
      `${prefix}${letter.toLocaleUpperCase('es-PA')}`,
    );
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
