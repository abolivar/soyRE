import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { DashboardService } from './dashboard.service.js';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(
    @Inject(DashboardService)
    private readonly dashboardService: DashboardService,
  ) {}

  @Get('summary')
  summary(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.dashboardService.summary(user, organizationId);
  }
}
