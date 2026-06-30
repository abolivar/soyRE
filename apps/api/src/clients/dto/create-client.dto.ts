import {
  ClientIdentityDocumentType,
  ClientInterestType,
  ClientRole,
  ClientStatus,
  ClientTemperature,
  ClientTimeline,
  ClientType,
  ContactMethod,
  FinancingStatus,
} from '@soyre/database';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsISO8601,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateClientIdentityDocumentDto {
  @IsEnum(ClientIdentityDocumentType)
  type!: ClientIdentityDocumentType;

  @IsString()
  @MaxLength(180)
  fileName!: string;

  @IsString()
  @MaxLength(80)
  mimeType!: string;

  @IsInt()
  @Min(1)
  @Max(5242880)
  fileSize!: number;

  @IsString()
  @MaxLength(7000000)
  fileBase64!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  documentNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  issuingCountry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsISO8601()
  birthDate?: string;

  @IsOptional()
  @IsISO8601()
  expirationDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  ocrText?: string;

  @IsOptional()
  @IsObject()
  extractedData?: Record<string, unknown>;
}

export class CreateClientDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsUUID()
  assignedUserId?: string;

  @IsOptional()
  @IsEnum(ClientType)
  type?: ClientType;

  @IsArray()
  @ArrayMaxSize(8)
  @IsEnum(ClientRole, { each: true })
  roles!: ClientRole[];

  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;

  @IsOptional()
  @IsEnum(ClientTemperature)
  temperature?: ClientTemperature;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  legalId?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(180)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  alternatePhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  whatsapp?: string;

  @IsOptional()
  @IsEnum(ContactMethod)
  preferredContactMethod?: ContactMethod;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  zone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;

  @IsOptional()
  @IsEnum(ClientInterestType)
  interestType?: ClientInterestType;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999999999)
  budgetMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999999999)
  budgetMax?: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  preferredZones?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  propertyTypes?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  bedroomsMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  bathroomsMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  parkingMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  areaMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  areaMax?: number;

  @IsOptional()
  @IsEnum(ClientTimeline)
  timeline?: ClientTimeline;

  @IsOptional()
  @IsEnum(FinancingStatus)
  financingStatus?: FinancingStatus;

  @IsOptional()
  @IsISO8601()
  lastContactAt?: string;

  @IsOptional()
  @IsISO8601()
  nextFollowUpAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  marketingConsent?: boolean;

  @IsOptional()
  @IsBoolean()
  dataConsent?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateClientIdentityDocumentDto)
  identityDocument?: CreateClientIdentityDocumentDto;
}
