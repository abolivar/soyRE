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
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { CreateMandateDto } from './dto/create-operational.dto.js';
import { ListMandatesQueryDto } from './dto/list-operational-query.dto.js';
import {
  MandateOrganizationQueryDto,
  RenewMandateDto,
  TransitionMandateDto,
  UpdateMandateDto,
} from './dto/mandate.dto.js';
import { MandatesService } from './mandates.service.js';

@Controller('mandates')
export class MandatesController {
  constructor(
    @Inject(MandatesService)
    private readonly mandatesService: MandatesService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListMandatesQueryDto,
  ) {
    return this.mandatesService.list(user, query);
  }

  @Get(':mandateId')
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('mandateId') mandateId: string,
    @Query() query: MandateOrganizationQueryDto,
  ) {
    return this.mandatesService.get(user, mandateId, query.organizationId);
  }

  @Get(':mandateId/history')
  history(
    @CurrentUser() user: AuthenticatedUser,
    @Param('mandateId') mandateId: string,
    @Query() query: MandateOrganizationQueryDto,
  ) {
    return this.mandatesService.history(user, mandateId, query.organizationId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMandateDto,
  ) {
    return this.mandatesService.create(user, dto);
  }

  @Patch(':mandateId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('mandateId') mandateId: string,
    @Body() dto: UpdateMandateDto,
  ) {
    return this.mandatesService.update(user, mandateId, dto);
  }

  @Post(':mandateId/transitions')
  transition(
    @CurrentUser() user: AuthenticatedUser,
    @Param('mandateId') mandateId: string,
    @Body() dto: TransitionMandateDto,
  ) {
    return this.mandatesService.transition(user, mandateId, dto);
  }

  @Post(':mandateId/renewals')
  renew(
    @CurrentUser() user: AuthenticatedUser,
    @Param('mandateId') mandateId: string,
    @Body() dto: RenewMandateDto,
  ) {
    return this.mandatesService.renew(user, mandateId, dto);
  }
}
