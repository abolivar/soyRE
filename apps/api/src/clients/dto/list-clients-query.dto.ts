import { ClientRole, ClientStatus } from '@soyre/database';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ListClientsQueryDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;

  @IsOptional()
  @IsEnum(ClientRole)
  role?: ClientRole;
}
