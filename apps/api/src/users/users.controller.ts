import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { ListUsersQueryDto } from './dto/list-users-query.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { UsersService } from './users.service.js';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListUsersQueryDto,
  ) {
    return this.usersService.list(user, query.organizationId);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateUserDto) {
    return this.usersService.create(user, dto);
  }

  @Patch(':membershipId/validate')
  validate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('membershipId') membershipId: string,
  ) {
    return this.usersService.validate(user, membershipId);
  }

  @Patch(':membershipId/suspend')
  suspend(
    @CurrentUser() user: AuthenticatedUser,
    @Param('membershipId') membershipId: string,
  ) {
    return this.usersService.suspend(user, membershipId);
  }

  @Patch(':membershipId/role')
  updateRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('membershipId') membershipId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.usersService.updateRole(user, membershipId, dto.role);
  }
}
