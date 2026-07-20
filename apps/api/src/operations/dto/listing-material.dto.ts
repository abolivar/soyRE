import { ListingMaterialType } from '@soyre/database';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateListingMaterialDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsEnum(ListingMaterialType)
  type!: ListingMaterialType;

  @IsString()
  @MinLength(8)
  @MaxLength(120)
  idempotencyKey!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(240)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  altText?: string;

  @ValidateIf((value: CreateListingMaterialDto) => Boolean(value.externalUrl))
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2000)
  externalUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason?: string;
}

export enum ListingMaterialChange {
  ARCHIVE = 'ARCHIVE',
  REORDER = 'REORDER',
  REPLACE = 'REPLACE',
}

export class ChangeListingMaterialDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsEnum(ListingMaterialChange)
  change!: ListingMaterialChange;

  @IsString()
  @MinLength(8)
  @MaxLength(120)
  idempotencyKey!: string;

  @IsOptional()
  @IsEnum(ListingMaterialType)
  type?: ListingMaterialType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  altText?: string;

  @ValidateIf((value: ChangeListingMaterialDto) => Boolean(value.externalUrl))
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2000)
  externalUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason?: string;
}
