import { Transform, Type } from 'class-transformer';
import {
  BusinessOperationType,
  BusinessParticipantRole,
  BusinessStatus,
  MembershipRole,
} from '@soyre/database';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const FAMILY_KEY_PATTERN = /^[a-z0-9][a-z0-9-]{1,63}$/;

export class DocumentChecklistTemplateItemDto {
  @IsString()
  @Matches(FAMILY_KEY_PATTERN)
  key!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(180)
  name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  category!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresReview?: boolean;

  @IsOptional()
  @IsBoolean()
  allowsMultipleFiles?: boolean;

  @IsOptional()
  @IsBoolean()
  blocksTransition?: boolean;

  @IsOptional()
  @IsEnum(BusinessStatus)
  requiredAtStatus?: BusinessStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3650)
  dueDaysAfterInstantiation?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3650)
  expiresAfterDays?: number;

  @IsOptional()
  @IsEnum(BusinessParticipantRole)
  participantRole?: BusinessParticipantRole;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsEnum(MembershipRole, { each: true })
  readRoles?: MembershipRole[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsEnum(MembershipRole, { each: true })
  uploadRoles?: MembershipRole[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsEnum(MembershipRole, { each: true })
  reviewRoles?: MembershipRole[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  sortOrder?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateDocumentChecklistTemplateDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsString()
  @Matches(FAMILY_KEY_PATTERN)
  familyKey!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(180)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsEnum(BusinessOperationType, { each: true })
  operationTypes?: BusinessOperationType[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(2, { each: true })
  countries?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  propertyTypes?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsUUID('4', { each: true })
  contractTypeIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9)
  @IsEnum(BusinessStatus, { each: true })
  businessStatuses?: BusinessStatus[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => DocumentChecklistTemplateItemDto)
  items!: DocumentChecklistTemplateItemDto[];
}

export class UpdateDocumentChecklistTemplateDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsEnum(BusinessOperationType, { each: true })
  operationTypes?: BusinessOperationType[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(2, { each: true })
  countries?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  propertyTypes?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsUUID('4', { each: true })
  contractTypeIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9)
  @IsEnum(BusinessStatus, { each: true })
  businessStatuses?: BusinessStatus[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => DocumentChecklistTemplateItemDto)
  items?: DocumentChecklistTemplateItemDto[];
}

export class DocumentChecklistTemplateQueryDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  includeInactive?: boolean;
}
