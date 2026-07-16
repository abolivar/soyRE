import { MandateType } from '@soyre/database';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export enum MandateTransitionCommand {
  SUBMIT_FOR_SIGNATURE = 'SUBMIT_FOR_SIGNATURE',
  RETURN_TO_DRAFT = 'RETURN_TO_DRAFT',
  REGISTER_SIGNATURE = 'REGISTER_SIGNATURE',
  ACTIVATE = 'ACTIVATE',
  EXPIRE = 'EXPIRE',
  CANCEL = 'CANCEL',
  ARCHIVE = 'ARCHIVE',
}

export class MandateOrganizationQueryDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}

export class UpdateMandateDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(120)
  idempotencyKey!: string;

  @IsOptional()
  @IsUUID()
  ownerClientId?: string;

  @IsOptional()
  @IsUUID()
  assignedUserId?: string;

  @IsOptional()
  @IsEnum(MandateType)
  type?: MandateType;

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
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class TransitionMandateDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsEnum(MandateTransitionCommand)
  action!: MandateTransitionCommand;

  @IsString()
  @MinLength(8)
  @MaxLength(120)
  idempotencyKey!: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason?: string;

  @IsOptional()
  @IsISO8601()
  signedAt?: string;

  @IsOptional()
  @IsISO8601()
  effectiveAt?: string;

  @IsOptional()
  @IsUUID()
  documentId?: string;
}

export class RenewMandateDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(120)
  idempotencyKey!: string;
}
