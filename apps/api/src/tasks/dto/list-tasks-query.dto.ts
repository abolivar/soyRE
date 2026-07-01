import { ScheduledActionStatus, ScheduledActionType } from '@soyre/database';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ListTasksQueryDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsEnum(ScheduledActionStatus)
  status?: ScheduledActionStatus;

  @IsOptional()
  @IsEnum(ScheduledActionType)
  eventType?: ScheduledActionType;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
