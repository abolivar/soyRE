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
import { CreateMandateDto } from './dto/create-operational.dto.js';
import { ListMandatesQueryDto } from './dto/list-operational-query.dto.js';
import { OperationsService } from './operations.service.js';

@Controller('mandates')
@UseGuards(JwtAuthGuard)
export class MandatesController {
  constructor(
    @Inject(OperationsService)
    private readonly operationsService: OperationsService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListMandatesQueryDto,
  ) {
    return this.operationsService.listMandates(user, query);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMandateDto,
  ) {
    return this.operationsService.createMandate(user, dto);
  }
}
