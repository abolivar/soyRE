import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DocumentsController } from './documents.controller.js';
import { ListingsController } from './listings.controller.js';
import { MandatesController } from './mandates.controller.js';
import { OffersController } from './offers.controller.js';
import { OperationsService } from './operations.service.js';
import { ShowingsController } from './showings.controller.js';
import { WorkflowStagesController } from './workflow-stages.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [
    DocumentsController,
    MandatesController,
    ListingsController,
    ShowingsController,
    OffersController,
    WorkflowStagesController,
  ],
  providers: [OperationsService],
})
export class OperationsModule {}
