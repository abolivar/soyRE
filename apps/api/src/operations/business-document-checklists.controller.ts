import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { BusinessDocumentChecklistsService } from './business-document-checklists.service.js';
import {
  BusinessDocumentChecklistQueryDto,
  CreateCustomDocumentRequirementDto,
  InstantiateBusinessDocumentChecklistDto,
} from './dto/business-document-checklist.dto.js';

@Controller('businesses/:businessId/document-checklists')
export class BusinessDocumentChecklistsController {
  constructor(
    @Inject(BusinessDocumentChecklistsService)
    private readonly checklistsService: BusinessDocumentChecklistsService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Query() query: BusinessDocumentChecklistQueryDto,
  ) {
    return this.checklistsService.list(user, businessId, query.organizationId);
  }

  @Post()
  instantiate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Body() dto: InstantiateBusinessDocumentChecklistDto,
  ) {
    return this.checklistsService.instantiate(user, businessId, dto);
  }

  @Post(':checklistId/requirements')
  addCustomRequirement(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Param('checklistId') checklistId: string,
    @Body() dto: CreateCustomDocumentRequirementDto,
  ) {
    return this.checklistsService.addCustomRequirement(
      user,
      businessId,
      checklistId,
      dto,
    );
  }
}
