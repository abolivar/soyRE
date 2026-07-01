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
import { CreateWorkflowStageDto } from './dto/create-operational.dto.js';
import { ListWorkflowStagesQueryDto } from './dto/list-operational-query.dto.js';
import { OperationsService } from './operations.service.js';

@Controller('workflow-stages')
@UseGuards(JwtAuthGuard)
export class WorkflowStagesController {
  constructor(
    @Inject(OperationsService)
    private readonly operationsService: OperationsService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListWorkflowStagesQueryDto,
  ) {
    return this.operationsService.listWorkflowStages(user, query);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWorkflowStageDto,
  ) {
    return this.operationsService.createWorkflowStage(user, dto);
  }
}
