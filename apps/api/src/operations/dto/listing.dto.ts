import { BusinessOperationType } from '@soyre/database';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ListingTransitionCommand } from '../listing-domain.js';

export class ListingOrganizationQueryDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}

export class UpdateListingDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

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
  @IsUUID()
  mandateId?: string;

  @IsOptional()
  @IsUUID()
  assignedUserId?: string;

  @IsOptional()
  @IsEnum(BusinessOperationType)
  operationType?: BusinessOperationType;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(180)
  title?: string;

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
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class TransitionListingDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsEnum(ListingTransitionCommand)
  action!: ListingTransitionCommand;

  @IsString()
  @MinLength(8)
  @MaxLength(120)
  idempotencyKey!: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason?: string;
}
