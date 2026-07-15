import {
  DisbursementMode,
  PayoutMethodType,
} from '@soyre/database';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class FinanceOrganizationDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}

export class CreatePayoutProfileDto extends FinanceOrganizationDto {
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
  @MinLength(2)
  @MaxLength(160)
  displayName!: string;

  @IsOptional()
  @Matches(/^[A-Z]{2}$/)
  taxCountry?: string;

  @IsOptional()
  @Matches(/^[A-Za-z0-9]{4}$/)
  taxIdLast4?: string;

}

export class CreatePayoutMethodDto extends FinanceOrganizationDto {
  @IsEnum(PayoutMethodType)
  type!: PayoutMethodType;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  label!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  bankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  accountHolderName?: string;

  @IsOptional()
  @Matches(/^[0-9]{4}$/)
  accountLast4?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  providerReference?: string;

  @IsOptional()
  @Matches(/^[A-Z]{3}$/)
  currency?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class CreateDisbursementDto extends FinanceOrganizationDto {
  @IsUUID()
  sourceBusinessId!: string;

  @IsUUID()
  recipientProfileId!: string;

  @IsOptional()
  @IsUUID()
  payoutMethodId?: string;

  @IsOptional()
  @IsUUID()
  commissionAllocationId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(180)
  concept!: string;

  @IsEnum(DisbursementMode)
  mode!: DisbursementMode;

  @Matches(/^[1-9][0-9]*$/)
  originalAmountCents!: string;

  @Matches(/^[A-Z]{3}$/)
  currency!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(160)
  idempotencyKey!: string;
}

export class ApplyCompensationDto extends FinanceOrganizationDto {
  @IsUUID()
  destinationBusinessId!: string;

  @Matches(/^[1-9][0-9]*$/)
  amountCents!: string;

  @Matches(/^[A-Z]{3}$/)
  currency!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(160)
  idempotencyKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  reason?: string;
}

export class TransitionDisbursementDto extends FinanceOrganizationDto {}

export class ReverseCompensationDto extends FinanceOrganizationDto {
  @IsOptional()
  @IsString()
  @MaxLength(240)
  reason?: string;
}
