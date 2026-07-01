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
import { CreateOfferDto } from './dto/create-operational.dto.js';
import { ListOffersQueryDto } from './dto/list-operational-query.dto.js';
import { OperationsService } from './operations.service.js';

@Controller('offers')
@UseGuards(JwtAuthGuard)
export class OffersController {
  constructor(
    @Inject(OperationsService)
    private readonly operationsService: OperationsService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListOffersQueryDto,
  ) {
    return this.operationsService.listOffers(user, query);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateOfferDto) {
    return this.operationsService.createOffer(user, dto);
  }
}
