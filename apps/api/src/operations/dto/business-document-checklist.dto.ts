import { Type } from 'class-transformer';
import {
  BusinessParticipantRole,
  BusinessStatus,
  MembershipRole,
} from '@soyre/database';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class BusinessDocumentChecklistQueryDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}

export class InstantiateBusinessDocumentChecklistDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsUUID()
  templateId!: string;
}

export class CreateCustomDocumentRequirementDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(180)
  name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  category!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason!: string;

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
  @IsDateString({ strict: true })
  requiredBy?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  expiresAt?: string;

  @IsOptional()
  @IsEnum(BusinessParticipantRole)
  participantRole?: BusinessParticipantRole;

  @IsOptional()
  @IsUUID()
  participantId?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsOptional()
  @IsUUID()
  businessContractId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @IsEnum(MembershipRole, { each: true })
  readRoles?: MembershipRole[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @IsEnum(MembershipRole, { each: true })
  uploadRoles?: MembershipRole[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @IsEnum(MembershipRole, { each: true })
  reviewRoles?: MembershipRole[];

  @IsOptional()
  @IsObject()
  @Type(() => Object)
  metadata?: Record<string, unknown>;
}
