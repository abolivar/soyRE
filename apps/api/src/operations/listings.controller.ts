import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateListingDto } from './dto/create-operational.dto.js';
import { ListListingsQueryDto } from './dto/list-operational-query.dto.js';
import { OperationsService } from './operations.service.js';

@Controller('listings')
@UseGuards(JwtAuthGuard)
export class ListingsController {
  constructor(
    @Inject(OperationsService)
    private readonly operationsService: OperationsService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListListingsQueryDto,
  ) {
    return this.operationsService.listListings(user, query);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateListingDto,
  ) {
    return this.operationsService.createListing(user, dto);
  }
}
