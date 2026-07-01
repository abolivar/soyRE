import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import {
  BusinessCalculationRequestDto,
  BusinessCommitDto,
  CreateBusinessDraftDto,
  UpdateBusinessDraftDto,
} from './dto/business-draft.dto.js';
import { ListBusinessesQueryDto } from './dto/list-businesses-query.dto.js';
import { BusinessesService } from './businesses.service.js';

@Controller()
export class BusinessesController {
  constructor(
    @Inject(BusinessesService)
    private readonly businessesService: BusinessesService,
  ) {}

  @Get('businesses/new/context')
  context(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.businessesService.context(user, organizationId);
  }

  @Get('businesses')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListBusinessesQueryDto,
  ) {
    return this.businessesService.list(user, query);
  }

  @Get('businesses/:businessId')
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.businessesService.get(user, businessId, organizationId);
  }

  @Post('business-drafts')
  createDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBusinessDraftDto,
  ) {
    return this.businessesService.createDraft(user, dto);
  }

  @Patch('business-drafts/:businessId')
  updateDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Body() dto: UpdateBusinessDraftDto,
  ) {
    return this.businessesService.updateDraft(user, businessId, dto);
  }

  @Post('business-drafts/:businessId/calculate/payment-plan')
  calculatePaymentPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Body() dto: BusinessCalculationRequestDto,
  ) {
    return this.businessesService.calculatePaymentPlan(user, businessId, dto);
  }

  @Post('business-drafts/:businessId/calculate/commissions')
  calculateCommissions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Body() dto: BusinessCalculationRequestDto,
  ) {
    return this.businessesService.calculateCommissions(user, businessId, dto);
  }

  @Post('business-drafts/:businessId/validate')
  validate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Body() dto: BusinessCalculationRequestDto,
  ) {
    return this.businessesService.validateDraft(user, businessId, dto);
  }

  @Post('business-drafts/:businessId/preview')
  preview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Body() dto: BusinessCalculationRequestDto,
  ) {
    return this.businessesService.preview(user, businessId, dto);
  }

  @Post('business-drafts/:businessId/commit')
  commit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Body() dto: BusinessCommitDto,
  ) {
    return this.businessesService.commit(user, businessId, dto);
  }
}
