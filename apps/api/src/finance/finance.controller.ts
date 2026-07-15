import { Body, Controller, Get, Inject, Param, Post, Query } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import {
  ApplyCompensationDto,
  CreateDisbursementDto,
  CreatePayoutMethodDto,
  CreatePayoutProfileDto,
  FinanceOrganizationDto,
  ReverseCompensationDto,
  TransitionDisbursementDto,
} from './dto/finance.dto.js';
import { FinanceService } from './finance.service.js';

@Controller('finance')
export class FinanceController {
  constructor(@Inject(FinanceService) private readonly financeService: FinanceService) {}

  @Get('payout-profiles')
  listProfiles(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: FinanceOrganizationDto,
  ) {
    return this.financeService.listProfiles(user, query.organizationId);
  }

  @Post('payout-profiles')
  createProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePayoutProfileDto,
  ) {
    return this.financeService.createProfile(user, dto);
  }

  @Post('payout-profiles/:profileId/methods')
  createMethod(
    @CurrentUser() user: AuthenticatedUser,
    @Param('profileId') profileId: string,
    @Body() dto: CreatePayoutMethodDto,
  ) {
    return this.financeService.createMethod(user, profileId, dto);
  }

  @Post('payout-profiles/:profileId/activate')
  activateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('profileId') profileId: string,
    @Body() dto: FinanceOrganizationDto,
  ) {
    return this.financeService.activateProfile(user, profileId, dto);
  }

  @Get('disbursements')
  listDisbursements(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: FinanceOrganizationDto,
  ) {
    return this.financeService.listDisbursements(user, query.organizationId);
  }

  @Post('disbursements')
  createDisbursement(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDisbursementDto,
  ) {
    return this.financeService.createDisbursement(user, dto);
  }

  @Post('disbursements/:disbursementId/approve')
  approveDisbursement(
    @CurrentUser() user: AuthenticatedUser,
    @Param('disbursementId') disbursementId: string,
    @Body() dto: TransitionDisbursementDto,
  ) {
    return this.financeService.approveDisbursement(user, disbursementId, dto);
  }

  @Post('disbursements/:disbursementId/mark-paid')
  markPaid(
    @CurrentUser() user: AuthenticatedUser,
    @Param('disbursementId') disbursementId: string,
    @Body() dto: TransitionDisbursementDto,
  ) {
    return this.financeService.markPaid(user, disbursementId, dto);
  }

  @Post('disbursements/:disbursementId/applications')
  applyCompensation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('disbursementId') disbursementId: string,
    @Body() dto: ApplyCompensationDto,
  ) {
    return this.financeService.applyCompensation(user, disbursementId, dto);
  }

  @Post('compensation-applications/:applicationId/reverse')
  reverseCompensation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('applicationId') applicationId: string,
    @Body() dto: ReverseCompensationDto,
  ) {
    return this.financeService.reverseCompensation(user, applicationId, dto);
  }
}
