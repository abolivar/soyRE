import { IsOptional, IsUUID } from 'class-validator';

export class ListUsersQueryDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
