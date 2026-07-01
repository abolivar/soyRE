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
  CreatePropertyDto,
  WithdrawPropertyDto,
} from './dto/create-property.dto.js';
import { ListPropertiesQueryDto } from './dto/list-properties-query.dto.js';
import { PropertiesService } from './properties.service.js';

@Controller('properties')
export class PropertiesController {
  constructor(
    @Inject(PropertiesService)
    private readonly propertiesService: PropertiesService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListPropertiesQueryDto,
  ) {
    return this.propertiesService.list(user, query);
  }

  @Get(':propertyId')
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('propertyId') propertyId: string,
    @Query() query: ListPropertiesQueryDto,
  ) {
    return this.propertiesService.get(user, propertyId, query.organizationId);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePropertyDto) {
    return this.propertiesService.create(user, dto);
  }

  @Patch(':propertyId/withdraw')
  withdraw(
    @CurrentUser() user: AuthenticatedUser,
    @Param('propertyId') propertyId: string,
    @Body() dto: WithdrawPropertyDto,
  ) {
    return this.propertiesService.withdraw(user, propertyId, dto);
  }
}
