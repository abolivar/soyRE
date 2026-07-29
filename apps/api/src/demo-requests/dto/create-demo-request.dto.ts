import { DemoRequestTeamSize } from '@soyre/database';
import { Transform } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateDemoRequestDto {
  @Transform(trimString)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @Transform(trimString)
  @IsEmail()
  @MaxLength(180)
  email!: string;

  @Transform(trimString)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  company!: string;

  @Transform(trimString)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  country!: string;

  @IsEnum(DemoRequestTeamSize)
  teamSize!: DemoRequestTeamSize;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  challenge?: string;

  @IsBoolean()
  @Equals(true)
  consent!: boolean;

  @Transform(trimString)
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  pageUrl?: string;

  @Transform(trimString)
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  referrer?: string;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  utmSource?: string;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  utmMedium?: string;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  utmCampaign?: string;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  utmTerm?: string;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  utmContent?: string;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}

function trimString({ value }: { value: unknown }) {
  return typeof value === 'string' ? value.trim() : value;
}
