import {
  BusinessMode,
  BusinessOperationType,
  CommissionBase,
  CommissionCalculationType,
  CommissionRecipientType,
  CommissionReleaseTrigger,
  PaymentFrequency,
  PaymentScheduleLineType,
  RoundingStrategy,
} from '@soyre/database';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBusinessDraftDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsEnum(BusinessOperationType)
  operationType!: BusinessOperationType;

  @IsOptional()
  @IsEnum(BusinessMode)
  mode?: BusinessMode;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;
}

export class UpdateBusinessDraftDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;

  @IsObject()
  data!: Record<string, unknown>;
}

export class BusinessCalculationRequestDto {
  @IsObject()
  data!: Record<string, unknown>;
}

export class BusinessCommitDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  idempotencyKey?: string;
}

export class BusinessParticipantDraftDto {
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  realEstateAgentId?: string;

  @IsString()
  @MaxLength(160)
  displayName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsString()
  @MaxLength(40)
  role!: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsBoolean()
  commissionEligible?: boolean;
}

export class PaymentSpecialLineDto {
  @IsString()
  @MaxLength(120)
  label!: string;

  @IsEnum(PaymentScheduleLineType)
  lineType!: PaymentScheduleLineType;

  @IsOptional()
  @IsString()
  amountCents?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  percentageBasisPoints?: number;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  dueEvent?: string;
}

export class PaymentPlanDraftDto {
  @IsString()
  @MaxLength(40)
  preset!: string;

  @IsString()
  totalAmountCents!: string;

  @IsOptional()
  @IsString()
  reservationAmountCents?: string;

  @IsOptional()
  @IsString()
  signatureAmountCents?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(600)
  installmentCount?: number;

  @IsOptional()
  @IsEnum(PaymentFrequency)
  frequency?: PaymentFrequency;

  @IsOptional()
  @IsEnum(RoundingStrategy)
  roundingStrategy?: RoundingStrategy;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  signatureDate?: string;

  @IsOptional()
  @IsString()
  closingDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dueDay?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(120)
  @ValidateNested({ each: true })
  @Type(() => PaymentSpecialLineDto)
  specialLines?: PaymentSpecialLineDto[];
}

export class CommissionRuleDraftDto {
  @IsString()
  @MaxLength(120)
  participantKey!: string;

  @IsEnum(CommissionRecipientType)
  recipientType!: CommissionRecipientType;

  @IsString()
  @MaxLength(120)
  label!: string;

  @IsEnum(CommissionCalculationType)
  calculationType!: CommissionCalculationType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  percentageBasisPoints?: number;

  @IsOptional()
  @IsString()
  fixedAmountCents?: string;

  @IsOptional()
  @IsString()
  capAmountCents?: string;

  @IsOptional()
  @IsBoolean()
  appliesAfterDeductions?: boolean;

  @IsOptional()
  @IsEnum(CommissionReleaseTrigger)
  releaseTrigger?: CommissionReleaseTrigger;
}

export class CommissionPlanDraftDto {
  @IsString()
  baseAmountCents!: string;

  @IsEnum(CommissionBase)
  commissionBase!: CommissionBase;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  simpleCommissionBasisPoints?: number;

  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => CommissionRuleDraftDto)
  rules!: CommissionRuleDraftDto[];
}
