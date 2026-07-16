import {
  BusinessOperationType,
  DocumentEntityType,
  DocumentStatus,
  ListingStatus,
  MandateStatus,
  MandateType,
  OfferStatus,
  ShowingStatus,
  WorkflowStageScope,
} from '@soyre/database';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateDocumentDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsEnum(DocumentEntityType)
  entityType!: DocumentEntityType;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsOptional()
  @IsUUID()
  businessId?: string;

  @IsOptional()
  @IsUUID()
  businessContractId?: string;

  @IsOptional()
  @IsUUID()
  mandateId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(180)
  name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  documentType!: string;

  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  fileName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  mimeType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50_000_000)
  fileSize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  storagePath?: string;

  @IsOptional()
  @IsISO8601()
  requiredBy?: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateMandateDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsUUID()
  propertyId!: string;

  @IsOptional()
  @IsUUID()
  ownerClientId?: string;

  @IsOptional()
  @IsUUID()
  assignedUserId?: string;

  @IsEnum(MandateType)
  type!: MandateType;

  @IsOptional()
  @IsEnum(MandateStatus)
  status?: MandateStatus;

  @IsOptional()
  @IsBoolean()
  exclusive?: boolean;

  @IsOptional()
  @IsString()
  authorizedPriceCents?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  commissionBps?: number;

  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @IsOptional()
  @IsISO8601()
  endsAt?: string;

  @IsOptional()
  @IsISO8601()
  signedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateListingDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsUUID()
  propertyId!: string;

  @IsOptional()
  @IsUUID()
  mandateId?: string;

  @IsOptional()
  @IsEnum(BusinessOperationType)
  operationType?: BusinessOperationType;

  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;

  @IsString()
  @MinLength(2)
  @MaxLength(180)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  publicCopy?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  channels?: string[];

  @IsOptional()
  @IsObject()
  readiness?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class CreateShowingDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsUUID()
  propertyId!: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsUUID()
  businessId?: string;

  @IsOptional()
  @IsUUID()
  assignedUserId?: string;

  @IsOptional()
  @IsUUID()
  realEstateAgentId?: string;

  @IsOptional()
  @IsEnum(ShowingStatus)
  status?: ShowingStatus;

  @IsISO8601()
  scheduledFor!: string;

  @IsOptional()
  @IsISO8601()
  completedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  outcome?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedback?: string;

  @IsOptional()
  @IsISO8601()
  nextActionAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateOfferDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsUUID()
  clientId!: string;

  @IsOptional()
  @IsUUID()
  businessId?: string;

  @IsOptional()
  @IsUUID()
  assignedUserId?: string;

  @IsEnum(BusinessOperationType)
  operationType!: BusinessOperationType;

  @IsOptional()
  @IsEnum(OfferStatus)
  status?: OfferStatus;

  @IsString()
  amountCents!: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  terms?: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateWorkflowStageDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsEnum(WorkflowStageScope)
  scope!: WorkflowStageScope;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsInt()
  @Min(0)
  @Max(1000)
  position!: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  tone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  appliesTo?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
