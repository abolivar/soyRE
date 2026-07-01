import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { AgentsService } from './agents.service.js';
import { CreateRealEstateAgentDto } from './dto/create-real-estate-agent.dto.js';
import { ListRealEstateAgentsQueryDto } from './dto/list-real-estate-agents-query.dto.js';

@Controller('agents')
export class AgentsController {
  constructor(
    @Inject(AgentsService)
    private readonly agentsService: AgentsService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListRealEstateAgentsQueryDto,
  ) {
    return this.agentsService.list(user, query);
  }

  @Get(':agentId')
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('agentId') agentId: string,
    @Query() query: ListRealEstateAgentsQueryDto,
  ) {
    return this.agentsService.get(user, agentId, query.organizationId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRealEstateAgentDto,
  ) {
    return this.agentsService.create(user, dto);
  }
}
