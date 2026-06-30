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

export type ClientStatus = 'NEW' | 'ACTIVE' | 'NURTURING' | 'INACTIVE' | 'ARCHIVED';

export type ClientTemperature = 'COLD' | 'WARM' | 'HOT';

export type ContactMethod = 'EMAIL' | 'PHONE' | 'WHATSAPP' | 'SMS' | 'IN_PERSON';

export type ClientInterestType =
  | 'BUY'
  | 'RENT'
  | 'SELL'
  | 'LEASE'
  | 'INVEST'
  | 'MANAGE'
  | 'REFER';

export type ClientTimeline =
  | 'IMMEDIATE'
  | 'ONE_TO_THREE_MONTHS'
  | 'THREE_TO_SIX_MONTHS'
  | 'SIX_PLUS_MONTHS'
  | 'EXPLORING';

export type FinancingStatus =
  | 'CASH'
  | 'PRE_APPROVED'
  | 'NEEDS_FINANCING'
  | 'UNKNOWN';

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
    const message =
      typeof body?.message === 'string'
        ? body.message
        : Array.isArray(body?.message)
          ? body.message.join(', ')
          : 'Request failed.';

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function downloadApiFile(path: string) {
  const response = await fetch(`${API_URL}/api${path}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const message = await response.text().catch(() => 'Request failed.');
    throw new Error(message || 'Request failed.');
  }

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition');
  const fileName =
    disposition?.match(/filename="(?<fileName>[^"]+)"/)?.groups?.fileName ??
    'documento';

  return { blob, fileName };
}
