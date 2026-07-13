import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CreatePlatformOrganizationDto } from './dto/create-platform-organization.dto.js';
import { CreatePlatformUserDto } from './dto/create-platform-user.dto.js';
import { UpdatePlatformMembershipRoleDto } from './dto/update-platform-membership-role.dto.js';
import { UpdatePlatformMembershipStatusDto } from './dto/update-platform-membership-status.dto.js';
import { PlatformAdminGuard } from './platform-admin.guard.js';
import { PlatformService } from './platform.service.js';

@Controller('platform')
@UseGuards(PlatformAdminGuard)
export class PlatformController {
  constructor(
    @Inject(PlatformService)
    private readonly platformService: PlatformService,
  ) {}

  @Get('access')
  access(@CurrentUser() user: AuthenticatedUser) {
    return this.platformService.access(user);
  }

  @Get('organizations')
  listOrganizations(@CurrentUser() user: AuthenticatedUser) {
    return this.platformService.listOrganizations(user);
  }

  @Post('organizations')
  createOrganization(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePlatformOrganizationDto,
  ) {
    return this.platformService.createOrganization(user, dto);
  }

  @Get('organizations/:organizationId/users')
  listUsers(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
  ) {
    return this.platformService.listUsers(user, organizationId);
  }

  @Post('organizations/:organizationId/users')
  createUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Body() dto: CreatePlatformUserDto,
  ) {
    return this.platformService.createUser(user, organizationId, dto);
  }

  @Patch('memberships/:membershipId/status')
  updateMembershipStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('membershipId') membershipId: string,
    @Body() dto: UpdatePlatformMembershipStatusDto,
  ) {
    return this.platformService.updateMembershipStatus(
      user,
      membershipId,
      dto.status,
    );
  }

  @Patch('memberships/:membershipId/role')
  updateMembershipRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('membershipId') membershipId: string,
    @Body() dto: UpdatePlatformMembershipRoleDto,
  ) {
    return this.platformService.updateMembershipRole(user, membershipId, dto.role);
  }
}
