import { PropertyOperation, PropertyStatus } from '@soyre/database';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePropertyDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsUUID()
  assignedUserId?: string;

  @IsOptional()
  @IsUUID()
  ownerClientId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(180)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  internalCode?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  type!: string;

  @IsArray()
  @ArrayMaxSize(2)
  @IsEnum(PropertyOperation, { each: true })
  operations!: PropertyOperation[];

  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  country!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  zone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  buildingName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  unitNumber?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(40)
  bedrooms?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(40)
  bathrooms?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(40)
  parkingSpaces?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(500000)
  builtArea?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5000000)
  lotArea?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(300)
  floor?: number;

  @IsOptional()
  @IsInt()
  @Min(1800)
  @Max(2200)
  yearBuilt?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999999999)
  salePrice?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999999999)
  rentPrice?: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999999999)
  maintenanceFee?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999999999)
  rentalDeposit?: number;

  @IsOptional()
  @IsISO8601()
  availableFrom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  publicDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  privateNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  listingConditions?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  amenities?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];
}

export class WithdrawPropertyDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
