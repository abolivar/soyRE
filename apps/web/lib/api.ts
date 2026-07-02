import type { BusinessDraftProgress } from '@soyre/shared';

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ??
  'http://localhost:4000';

export type AuthMembership = {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  organizationStatus: OrganizationStatus;
  role: MembershipRole;
  status: MembershipStatus;
};

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  status: string;
  memberships: AuthMembership[];
};

export type OrganizationStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';

export type MembershipRole =
  | 'OWNER'
  | 'ADMIN'
  | 'BROKER'
  | 'AGENT'
  | 'OPERATIONS'
  | 'FINANCE'
  | 'EXTERNAL_AGENT'
  | 'READONLY';

export type MembershipStatus = 'INVITED' | 'ACTIVE' | 'SUSPENDED';

export type OrganizationUser = {
  membershipId: string;
  organizationId: string;
  role: string;
  membershipStatus: string;
  createdAt: string;
  updatedAt: string;
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  userStatus: string;
  lastLoginAt: string | null;
};

export type UsersResponse = {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  users: OrganizationUser[];
};

export type UserDetailResponse = {
  user: OrganizationUser;
};

export type CreateUserPayload = {
  organizationId?: string;
  firstName: string;
  lastName?: string;
  email: string;
  password: string;
  role: MembershipRole;
  startActive?: boolean;
};

export type RealEstateAgentCategory = 'BROKER' | 'EXTERNAL_BROKER' | 'REFERRER';

export type OrganizationRealEstateAgent = {
  id: string;
  organizationId: string;
  category: RealEstateAgentCategory;
  firstName: string;
  lastName: string;
  displayName: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  licenseNumber: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RealEstateAgentsResponse = {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  agents: OrganizationRealEstateAgent[];
};

export type RealEstateAgentDetailResponse = {
  agent: OrganizationRealEstateAgent;
};

export type CreateRealEstateAgentPayload = {
  organizationId?: string;
  category: RealEstateAgentCategory;
  firstName: string;
  lastName: string;
  companyName?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  licenseNumber?: string;
  notes?: string;
};

export type ClientType = 'PERSON' | 'COMPANY';

export type ClientRole =
  | 'BUYER'
  | 'SELLER'
  | 'LESSOR'
  | 'LESSEE'
  | 'INVESTOR'
  | 'LEAD'
  | 'REFERRER'
  | 'RELATED_CONTACT';

export type ClientStatus =
  'NEW' | 'ACTIVE' | 'NURTURING' | 'INACTIVE' | 'ARCHIVED';

export type ClientTemperature = 'COLD' | 'WARM' | 'HOT';

export type ContactMethod =
  'EMAIL' | 'PHONE' | 'WHATSAPP' | 'SMS' | 'IN_PERSON';

export type ClientInterestType =
  'BUY' | 'RENT' | 'SELL' | 'LEASE' | 'INVEST' | 'MANAGE' | 'REFER';

export type ClientTimeline =
  | 'IMMEDIATE'
  | 'ONE_TO_THREE_MONTHS'
  | 'THREE_TO_SIX_MONTHS'
  | 'SIX_PLUS_MONTHS'
  | 'EXPLORING';

export type FinancingStatus =
  'CASH' | 'PRE_APPROVED' | 'NEEDS_FINANCING' | 'UNKNOWN';

export type ClientIdentityDocumentType = 'PASSPORT' | 'NATIONAL_ID';

export type ClientIdentityDocumentSummary = {
  id: string;
  type: ClientIdentityDocumentType;
  documentNumber: string | null;
  fileName: string;
  validatedAt: string;
};

export type ClientIdentityDocumentDetail = ClientIdentityDocumentSummary & {
  issuingCountry: string | null;
  firstName: string | null;
  lastName: string | null;
  birthDate: string | null;
  expirationDate: string | null;
  mimeType: string;
  fileSize: number;
  ocrText: string | null;
  extractedData: Record<string, unknown> | null;
  createdByUser: {
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
  } | null;
};

export type OrganizationClient = {
  id: string;
  organizationId: string;
  assignedUserId: string | null;
  assignedUser: {
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
  } | null;
  type: ClientType;
  roles: ClientRole[];
  status: ClientStatus;
  temperature: ClientTemperature;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  displayName: string;
  legalId: string | null;
  email: string | null;
  phone: string | null;
  alternatePhone: string | null;
  whatsapp: string | null;
  preferredContactMethod: ContactMethod | null;
  country: string | null;
  city: string | null;
  zone: string | null;
  address: string | null;
  source: string | null;
  interestType: ClientInterestType | null;
  budgetMin: number | null;
  budgetMax: number | null;
  currency: string;
  preferredZones: string[];
  propertyTypes: string[];
  bedroomsMin: number | null;
  bathroomsMin: number | null;
  parkingMin: number | null;
  areaMin: number | null;
  areaMax: number | null;
  timeline: ClientTimeline | null;
  financingStatus: FinancingStatus | null;
  lastContactAt: string | null;
  nextFollowUpAt: string | null;
  notes: string | null;
  tags: string[];
  marketingConsent: boolean;
  dataConsent: boolean;
  identityDocument: ClientIdentityDocumentSummary | null;
  identityDocumentValidated: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationClientDetail = Omit<
  OrganizationClient,
  'identityDocuments'
> & {
  identityDocuments: ClientIdentityDocumentDetail[];
};

export type ClientsResponse = {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  clients: OrganizationClient[];
};

export type ClientDetailResponse = {
  client: OrganizationClientDetail;
};

export type PropertyStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'PUBLISHED'
  | 'RESERVED'
  | 'UNDER_CONTRACT'
  | 'CLOSED'
  | 'WITHDRAWN'
  | 'ARCHIVED';

export type PropertyOperation = 'SALE' | 'RENT';

export type OrganizationProperty = {
  id: string;
  organizationId: string;
  assignedUserId: string | null;
  assignedUser: {
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
  } | null;
  ownerClientId: string | null;
  ownerClient: {
    id: string;
    displayName: string;
    email: string | null;
    phone: string | null;
    roles: ClientRole[];
  } | null;
  title: string;
  internalCode: string | null;
  type: string;
  operations: PropertyOperation[];
  status: PropertyStatus;
  country: string;
  city: string;
  zone: string;
  address: string | null;
  buildingName: string | null;
  unitNumber: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parkingSpaces: number | null;
  builtArea: number | null;
  lotArea: number | null;
  floor: number | null;
  yearBuilt: number | null;
  salePrice: number | null;
  rentPrice: number | null;
  currency: string;
  maintenanceFee: number | null;
  rentalDeposit: number | null;
  availableFrom: string | null;
  source: string | null;
  publicDescription: string | null;
  privateNotes: string | null;
  listingConditions: string | null;
  amenities: string[];
  tags: string[];
  withdrawnAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PropertiesResponse = {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  properties: OrganizationProperty[];
};

export type PropertyDetailResponse = {
  property: OrganizationProperty;
};

export type CreatePropertyPayload = {
  organizationId?: string;
  assignedUserId?: string;
  ownerClientId?: string;
  title: string;
  internalCode?: string;
  type: string;
  operations: PropertyOperation[];
  status?: PropertyStatus;
  country: string;
  city: string;
  zone: string;
  address?: string;
  buildingName?: string;
  unitNumber?: string;
  bedrooms?: number;
  bathrooms?: number;
  parkingSpaces?: number;
  builtArea?: number;
  lotArea?: number;
  floor?: number;
  yearBuilt?: number;
  salePrice?: number;
  rentPrice?: number;
  currency?: string;
  maintenanceFee?: number;
  rentalDeposit?: number;
  availableFrom?: string;
  source?: string;
  publicDescription?: string;
  privateNotes?: string;
  listingConditions?: string;
  amenities?: string[];
  tags?: string[];
};

export type WithdrawPropertyPayload = {
  organizationId?: string;
  reason?: string;
};

export type CreateClientPayload = {
  organizationId?: string;
  assignedUserId?: string;
  type?: ClientType;
  roles: ClientRole[];
  status?: ClientStatus;
  temperature?: ClientTemperature;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  legalId?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  whatsapp?: string;
  preferredContactMethod?: ContactMethod;
  country?: string;
  city?: string;
  zone?: string;
  address?: string;
  source?: string;
  interestType?: ClientInterestType;
  budgetMin?: number;
  budgetMax?: number;
  currency?: string;
  preferredZones?: string[];
  propertyTypes?: string[];
  bedroomsMin?: number;
  bathroomsMin?: number;
  parkingMin?: number;
  areaMin?: number;
  areaMax?: number;
  timeline?: ClientTimeline;
  financingStatus?: FinancingStatus;
  lastContactAt?: string;
  nextFollowUpAt?: string;
  notes?: string;
  tags?: string[];
  marketingConsent?: boolean;
  dataConsent?: boolean;
  identityDocument?: {
    type: ClientIdentityDocumentType;
    fileName: string;
    mimeType: string;
    fileSize: number;
    fileBase64: string;
    documentNumber?: string;
    issuingCountry?: string;
    firstName?: string;
    lastName?: string;
    birthDate?: string;
    expirationDate?: string;
    ocrText?: string;
    extractedData?: Record<string, unknown>;
  };
};

export type BusinessStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'CONTRACT_GENERATED'
  | 'PENDING_SIGNATURE'
  | 'ACTIVE'
  | 'CLOSED'
  | 'CANCELLED'
  | 'REJECTED';

export type BusinessMode = 'SIMPLE' | 'ADVANCED';

export type BusinessOperationType =
  | 'SALE'
  | 'RENT'
  | 'RESERVATION'
  | 'ASSIGNMENT'
  | 'PRE_SALE'
  | 'SEPARATION'
  | 'OTHER';

export type BusinessParticipantRole =
  | 'BUYER'
  | 'SELLER'
  | 'TENANT'
  | 'LANDLORD'
  | 'PRIMARY_AGENT'
  | 'CO_AGENT'
  | 'REFERRER'
  | 'BROKER'
  | 'DEVELOPER'
  | 'LEGAL_REPRESENTATIVE'
  | 'LAWYER'
  | 'NOTARY'
  | 'BANK'
  | 'GUARANTOR'
  | 'WITNESS'
  | 'OTHER';

export type ContractTypeSummary = {
  id: string;
  organizationId: string | null;
  name: string;
  operationType: BusinessOperationType;
  description: string | null;
  isActive: boolean;
  requiresProperty: boolean;
  requiresPaymentPlan: boolean;
  requiresCommissionPlan: boolean;
  defaultTemplateId: string | null;
};

export type BusinessContextClient = {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  roles: ClientRole[];
  legalId: string | null;
  identityDocumentValidated: boolean;
};

export type BusinessContextProperty = {
  id: string;
  title: string;
  internalCode: string | null;
  status: PropertyStatus;
  city: string;
  zone: string;
  salePrice: number | null;
  rentPrice: number | null;
  currency: string;
  suggestedPriceCents: string | null;
};

export type BusinessContextAgent = {
  id: string;
  category: RealEstateAgentCategory;
  displayName: string;
  email: string | null;
  phone: string | null;
};

export type BusinessContextUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  role: MembershipRole;
};

export type BusinessContextResponse = {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  operationTypes: BusinessOperationType[];
  modes: BusinessMode[];
  currencies: string[];
  participantRoles: BusinessParticipantRole[];
  contractTypes: ContractTypeSummary[];
  clients: BusinessContextClient[];
  properties: BusinessContextProperty[];
  agents: BusinessContextAgent[];
  users: BusinessContextUser[];
  paymentPresets: string[];
  commissionDefaults: {
    simpleBasisPoints: number;
    releaseTrigger: string;
    commissionBase: string;
  };
  permissionHints: {
    canViewCommissions: boolean;
    canCommit: boolean;
  };
};

export type BusinessRecord = {
  id: string;
  organizationId: string;
  code: string | null;
  title: string | null;
  status: BusinessStatus;
  mode: BusinessMode;
  operationType: BusinessOperationType;
  currency: string;
  version: number;
  draftData: Record<string, unknown> | null;
  lastPreview: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type BusinessDraftResponse = {
  business: BusinessRecord;
};

export type BusinessValidationItem = {
  level: 'ERROR' | 'WARNING' | 'INFO';
  code: string;
  message: string;
};

export type PaymentScheduleLineCalculation = {
  sequence: number;
  label: string;
  lineType: string;
  amountCents: string;
  percentageBasisPoints?: number;
  dueDate?: string;
  dueEvent?: string;
  isManual: boolean;
  source: string;
};

export type PaymentPlanCalculation = {
  currency: string;
  totalAmountCents: string;
  generatedTotalCents: string;
  differenceCents: string;
  roundingStrategy: string;
  lines: PaymentScheduleLineCalculation[];
  warnings: string[];
  errors: string[];
};

export type CommissionAllocationCalculation = {
  participantKey: string;
  recipientType: string;
  label: string;
  calculationType: string;
  payableAmountCents: string;
  releaseTrigger: string;
};

export type CommissionPlanCalculation = {
  currency: string;
  baseAmountCents: string;
  totalCommissionAmountCents: string;
  payableNowCents: string;
  allocations: CommissionAllocationCalculation[];
  warnings: string[];
  errors: string[];
};

export type BusinessPreview = {
  entitiesToCreate: Array<{ entity: string; count: number }>;
  impactReports: string[];
  paymentPlan: PaymentPlanCalculation;
  commissionPlan: CommissionPlanCalculation;
  validation: BusinessValidationItem[];
};

export type ApiOrganization = {
  id: string;
  name: string;
  slug: string;
};

export type PaymentScheduleLineStatus =
  'PENDING' | 'INVOICED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export type ScheduledActionType =
  | 'PAYMENT_DUE'
  | 'PAYMENT_OVERDUE'
  | 'COMMISSION_DUE'
  | 'CONTRACT_REVIEW_DUE'
  | 'SIGNATURE_DUE'
  | 'DOCUMENT_REQUIRED'
  | 'APPROVAL_REQUIRED'
  | 'CUSTOM';

export type ScheduledActionStatus =
  'PENDING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';

export type DashboardSummaryResponse = {
  organization: ApiOrganization;
  metrics: {
    activeProperties: number;
    activeClients: number;
    openBusinesses: number;
    pendingActions: number;
    overdueReceivables: {
      count: number;
      amountCents: string;
    };
    nextSevenDaysReceivables: {
      count: number;
      amountCents: string;
    };
    pendingCommissions: {
      count: number;
      amountCents: string;
    };
  };
  recentBusinesses: Array<{
    id: string;
    code: string;
    title: string;
    status: BusinessStatus;
    operationType: BusinessOperationType;
    currency: string;
    draftProgress: BusinessDraftProgress;
    totalContractAmountCents: string;
    expectedClosingDate: string | null;
    clientName: string | null;
    propertyTitle: string | null;
    propertyLocation: string | null;
    updatedAt: string;
  }>;
  draftBusinesses: Array<{
    id: string;
    code: string;
    title: string;
    status: BusinessStatus;
    operationType: BusinessOperationType;
    currency: string;
    draftProgress: BusinessDraftProgress;
    totalContractAmountCents: string;
    expectedClosingDate: string | null;
    clientName: string | null;
    propertyTitle: string | null;
    propertyLocation: string | null;
    updatedAt: string;
  }>;
  myActions: Array<{
    id: string;
    eventType: ScheduledActionType;
    scheduledFor: string;
    status: ScheduledActionStatus;
    businessId: string;
    businessCode: string;
    businessTitle: string;
    businessStatus: BusinessStatus;
    context: string;
  }>;
  activity: Array<{
    id: string;
    action: string;
    targetType: string;
    createdAt: string;
    actor: string;
  }>;
};

export type BusinessListItem = {
  id: string;
  organizationId: string;
  code: string;
  title: string;
  status: BusinessStatus;
  mode: BusinessMode;
  operationType: BusinessOperationType;
  currency: string;
  draftProgress: BusinessDraftProgress;
  totalContractAmountCents: string;
  expectedClosingDate: string | null;
  updatedAt: string;
  createdAt: string;
  clientName: string | null;
  propertyTitle: string | null;
  propertyLocation: string | null;
  primaryAgentName: string | null;
  nextPayment: {
    id: string;
    label: string;
    amountCents: string;
    dueDate: string | null;
    status: PaymentScheduleLineStatus;
  } | null;
  nextAction: {
    id: string;
    eventType: ScheduledActionType;
    scheduledFor: string;
    status: ScheduledActionStatus;
  } | null;
  permissionHints: {
    canViewCommissions: boolean;
  };
};

export type BusinessesResponse = {
  organization: ApiOrganization;
  businesses: BusinessListItem[];
  permissionHints: {
    canViewCommissions: boolean;
    canCommit: boolean;
  };
};

export type TaskListItem = {
  id: string;
  businessId: string;
  eventType: ScheduledActionType;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  scheduledFor: string;
  status: ScheduledActionStatus;
  assignedToUserId: string | null;
  assignedToUser: {
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
  } | null;
  metadata: Record<string, unknown> | null;
  business: {
    id: string;
    code: string;
    title: string;
    status: BusinessStatus;
    operationType: BusinessOperationType;
    clientName: string | null;
    propertyTitle: string | null;
    propertyLocation: string | null;
  };
  createdAt: string;
  updatedAt: string;
};

export type TaskListResponse = {
  organization: ApiOrganization;
  tasks: TaskListItem[];
};

export type TaskDetailResponse = {
  task: TaskListItem;
};

export type DocumentEntityType =
  | 'CLIENT'
  | 'PROPERTY'
  | 'BUSINESS'
  | 'CONTRACT'
  | 'MANDATE'
  | 'LISTING'
  | 'OFFER'
  | 'SHOWING'
  | 'OTHER';

export type DocumentStatus =
  | 'REQUIRED'
  | 'UPLOADED'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'ARCHIVED';

export type MandateStatus =
  | 'DRAFT'
  | 'PENDING_DOCUMENTS'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'ARCHIVED';

export type MandateType = 'SALE' | 'RENT' | 'BOTH';

export type ListingStatus =
  'DRAFT' | 'READY' | 'APPROVED' | 'PUBLISHED' | 'PAUSED' | 'ARCHIVED';

export type ShowingStatus =
  'REQUESTED' | 'CONFIRMED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';

export type OfferStatus =
  | 'DRAFT'
  | 'SENT'
  | 'COUNTERED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'WITHDRAWN';

export type WorkflowStageScope =
  'PROPERTY' | 'MANDATE' | 'LISTING' | 'SHOWING' | 'OFFER' | 'BUSINESS';

export type OperationalUserSummary = {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
};

export type OperationalClientSummary = {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
};

export type OperationalPropertySummary = {
  id: string;
  title: string;
  internalCode: string | null;
  status: PropertyStatus;
  city: string;
  zone: string;
};

export type OperationalBusinessSummary = {
  id: string;
  code: string | null;
  title: string | null;
  status: BusinessStatus;
};

export type OperationalDocument = {
  id: string;
  organizationId: string;
  entityType: DocumentEntityType;
  clientId: string | null;
  propertyId: string | null;
  businessId: string | null;
  businessContractId: string | null;
  name: string;
  documentType: string;
  status: DocumentStatus;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  storagePath: string | null;
  requiredBy: string | null;
  expiresAt: string | null;
  reviewedAt: string | null;
  uploadedByUserId: string | null;
  reviewedByUserId: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  client: OperationalClientSummary | null;
  property: OperationalPropertySummary | null;
  business: OperationalBusinessSummary | null;
  businessContract: {
    id: string;
    contractNumber: string | null;
    status: string;
  } | null;
  uploadedByUser: OperationalUserSummary | null;
  reviewedByUser: OperationalUserSummary | null;
  createdAt: string;
  updatedAt: string;
};

export type DocumentsResponse = {
  organization: ApiOrganization;
  documents: OperationalDocument[];
};

export type OperationalMandate = {
  id: string;
  organizationId: string;
  propertyId: string;
  ownerClientId: string | null;
  assignedUserId: string | null;
  type: MandateType;
  status: MandateStatus;
  exclusive: boolean;
  authorizedPriceCents: string | null;
  currency: string;
  commissionBps: number | null;
  startsAt: string | null;
  endsAt: string | null;
  signedAt: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  property: OperationalPropertySummary & { ownerClientId: string | null };
  ownerClient: OperationalClientSummary | null;
  assignedUser: OperationalUserSummary | null;
  createdAt: string;
  updatedAt: string;
};

export type MandatesResponse = {
  organization: ApiOrganization;
  mandates: OperationalMandate[];
};

export type OperationalListing = {
  id: string;
  organizationId: string;
  propertyId: string;
  mandateId: string | null;
  status: ListingStatus;
  title: string;
  publicCopy: string | null;
  channels: string[];
  readiness: Record<string, unknown> | null;
  approvedAt: string | null;
  publishedAt: string | null;
  pausedAt: string | null;
  archivedAt: string | null;
  notes: string | null;
  property: OperationalPropertySummary & {
    currency: string;
    salePrice: number | null;
    rentPrice: number | null;
  };
  mandate: {
    id: string;
    status: MandateStatus;
    type: MandateType;
    endsAt: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type ListingsResponse = {
  organization: ApiOrganization;
  listings: OperationalListing[];
};

export type OperationalShowing = {
  id: string;
  organizationId: string;
  propertyId: string;
  clientId: string | null;
  businessId: string | null;
  assignedUserId: string | null;
  realEstateAgentId: string | null;
  status: ShowingStatus;
  scheduledFor: string;
  completedAt: string | null;
  outcome: string | null;
  feedback: string | null;
  nextActionAt: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  property: OperationalPropertySummary;
  client: OperationalClientSummary | null;
  business: OperationalBusinessSummary | null;
  assignedUser: OperationalUserSummary | null;
  realEstateAgent: {
    id: string;
    displayName: string;
    category: RealEstateAgentCategory;
    email: string | null;
    phone: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type ShowingsResponse = {
  organization: ApiOrganization;
  showings: OperationalShowing[];
};

export type OperationalOffer = {
  id: string;
  organizationId: string;
  propertyId: string | null;
  clientId: string;
  businessId: string | null;
  assignedUserId: string | null;
  operationType: BusinessOperationType;
  status: OfferStatus;
  amountCents: string;
  currency: string;
  terms: string | null;
  expiresAt: string | null;
  sentAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  property: OperationalPropertySummary | null;
  client: OperationalClientSummary;
  business: OperationalBusinessSummary | null;
  assignedUser: OperationalUserSummary | null;
  createdAt: string;
  updatedAt: string;
};

export type OffersResponse = {
  organization: ApiOrganization;
  offers: OperationalOffer[];
};

export type WorkflowStage = {
  id: string;
  organizationId: string;
  scope: WorkflowStageScope;
  name: string;
  position: number;
  tone: string;
  isActive: boolean;
  appliesTo: string[];
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkflowStagesResponse = {
  organization: ApiOrganization;
  workflowStages: WorkflowStage[];
};

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}/api${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const rawMessage =
      typeof body?.message === 'string'
        ? body.message
        : Array.isArray(body?.message)
          ? body.message.join(', ')
          : 'Request failed.';

    throw new Error(toUserFacingApiError(rawMessage, response.status));
  }

  return response.json() as Promise<T>;
}

export async function downloadApiFile(path: string) {
  const response = await fetch(`${API_URL}/api${path}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const message = await response.text().catch(() => 'Request failed.');
    throw new Error(
      toUserFacingApiError(message || 'Request failed.', response.status),
    );
  }

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition');
  const fileName =
    disposition?.match(/filename="(?<fileName>[^"]+)"/)?.groups?.fileName ??
    'documento';

  return { blob, fileName };
}

function toUserFacingApiError(message: string, status: number) {
  const normalized = message.trim();
  const exactMessages: Record<string, string> = {
    'A user with this email already exists.':
      'Ya existe un usuario con ese correo.',
    'An organization with this slug already exists.':
      'Ya existe una organización con ese identificador.',
    'Authentication is required.': 'Inicia sesión para continuar.',
    'Business draft has changed. Reload before committing.':
      'El borrador cambió en otra sesión. Recarga antes de confirmar.',
    'Business draft has changed. Reload before saving.':
      'El borrador cambió en otra sesión. Recarga antes de guardar.',
    'Business draft was not found.': 'No encontramos ese borrador.',
    'Business was not found in this organization.':
      'No encontramos ese negocio en la organización activa.',
    'Client was not found in this organization.':
      'No encontramos ese cliente en la organización activa.',
    'Invalid authentication token.': 'La sesión venció. Inicia sesión nuevamente.',
    'Invalid email or password.': 'Correo o contraseña incorrectos.',
    'No active membership for this organization.':
      'No tienes acceso activo a esta organización.',
    'Only draft businesses can be committed.':
      'Solo se pueden confirmar negocios en borrador.',
    'Only draft businesses can be edited.':
      'Solo se pueden editar negocios en borrador.',
    'Property was not found in this organization.':
      'No encontramos ese inmueble en la organización activa.',
    'Request failed.': 'No se pudo completar la solicitud.',
    'Required role is missing.': 'Tu rol no permite realizar esta acción.',
    'User has no active memberships.':
      'Tu usuario no tiene una organización activa.',
    'User is not active.': 'Tu usuario no está activo.',
  };

  if (exactMessages[normalized]) {
    return exactMessages[normalized];
  }

  if (/is required\.?$/i.test(normalized)) {
    return 'Completa los campos requeridos.';
  }

  if (/permission is required\.?$/i.test(normalized)) {
    return 'Tu rol no permite realizar esta acción.';
  }

  if (/not found/i.test(normalized)) {
    return 'No encontramos el registro solicitado.';
  }

  if (status === 401) {
    return 'Inicia sesión para continuar.';
  }

  if (status === 403) {
    return 'Tu rol no permite realizar esta acción.';
  }

  if (status >= 500) {
    return 'El servicio no respondió correctamente. Intenta de nuevo.';
  }

  return normalized || 'No se pudo completar la solicitud.';
}
