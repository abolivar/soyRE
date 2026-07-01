import { ScheduledActionStatus } from '@soyre/database';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateTaskStatusDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsEnum(ScheduledActionStatus)
  status!: ScheduledActionStatus;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  note?: string;
}
