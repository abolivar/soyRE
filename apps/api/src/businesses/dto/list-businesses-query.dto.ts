import { BusinessOperationType, BusinessStatus } from '@soyre/database';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ListBusinessesQueryDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsEnum(BusinessStatus)
  status?: BusinessStatus;

  @IsOptional()
  @IsEnum(BusinessOperationType)
  operationType?: BusinessOperationType;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
