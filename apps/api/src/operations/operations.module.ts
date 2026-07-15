import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DocumentChecklistTemplatesController } from './document-checklist-templates.controller.js';
import { DocumentChecklistTemplatesService } from './document-checklist-templates.service.js';
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
    DocumentChecklistTemplatesController,
    DocumentsController,
    MandatesController,
    ListingsController,
    ShowingsController,
    OffersController,
    WorkflowStagesController,
  ],
  providers: [OperationsService, DocumentChecklistTemplatesService],
})
export class OperationsModule {}
