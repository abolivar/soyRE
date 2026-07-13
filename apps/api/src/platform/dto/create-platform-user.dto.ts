import { MembershipRole } from '@soyre/database';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePlatformUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  firstName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(160)
  password!: string;

  @IsEnum(MembershipRole)
  role!: MembershipRole;

  @IsOptional()
  @IsBoolean()
  startActive?: boolean;
}
