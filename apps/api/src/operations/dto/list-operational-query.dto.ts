import {
  BusinessOperationType,
  DocumentEntityType,
  DocumentStatus,
  ListingStatus,
  MandateStatus,
  MandateType,
  OfferStatus,
  ShowingStatus,
  WorkflowStageScope,
} from '@soyre/database';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class ListDocumentsQueryDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @IsOptional()
  @IsEnum(DocumentEntityType)
  entityType?: DocumentEntityType;
}

export class ListMandatesQueryDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(MandateStatus)
  status?: MandateStatus;

  @IsOptional()
  @IsEnum(MandateType)
  type?: MandateType;
}

export class ListListingsQueryDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;
}

export class ListShowingsQueryDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(ShowingStatus)
  status?: ShowingStatus;
}

export class ListOffersQueryDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(OfferStatus)
  status?: OfferStatus;

  @IsOptional()
  @IsEnum(BusinessOperationType)
  operationType?: BusinessOperationType;
}

export class ListWorkflowStagesQueryDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsEnum(WorkflowStageScope)
  scope?: WorkflowStageScope;
}
