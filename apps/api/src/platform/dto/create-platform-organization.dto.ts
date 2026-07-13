import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePlatformOrganizationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  organizationName!: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  organizationSlug?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  ownerFirstName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  ownerLastName?: string;

  @IsEmail()
  ownerEmail!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(160)
  ownerPassword!: string;
}
