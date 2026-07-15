import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { BusinessDocumentChecklistsService } from './business-document-checklists.service.js';
import { BusinessDocumentLifecycleService } from './business-document-lifecycle.service.js';
import {
  BusinessDocumentFilesService,
  type UploadedBusinessDocumentFile,
} from './business-document-files.service.js';
import {
  BusinessDocumentChecklistQueryDto,
  BusinessDocumentFileScopeDto,
  CreateCustomDocumentRequirementDto,
  InstantiateBusinessDocumentChecklistDto,
  ReplaceBusinessDocumentFileDto,
  TransitionBusinessDocumentRequirementDto,
  ValidateBusinessDocumentTransitionDto,
} from './dto/business-document-checklist.dto.js';

@Controller('businesses/:businessId/document-checklists')
export class BusinessDocumentChecklistsController {
  constructor(
    @Inject(BusinessDocumentChecklistsService)
    private readonly checklistsService: BusinessDocumentChecklistsService,
    @Inject(BusinessDocumentFilesService)
    private readonly filesService: BusinessDocumentFilesService,
    @Inject(BusinessDocumentLifecycleService)
    private readonly lifecycleService: BusinessDocumentLifecycleService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Query() query: BusinessDocumentChecklistQueryDto,
  ) {
    return this.checklistsService.list(user, businessId, query.organizationId);
  }

  @Post('transition-validation')
  validateBusinessTransition(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Body() dto: ValidateBusinessDocumentTransitionDto,
  ) {
    return this.lifecycleService.assertBusinessTransition(
      user,
      businessId,
      dto,
    );
  }

  @Post(':checklistId/requirements/:requirementId/files')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 15 * 1024 * 1024, files: 1 },
    }),
  )
  uploadFile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Param('checklistId') checklistId: string,
    @Param('requirementId') requirementId: string,
    @Body() dto: BusinessDocumentFileScopeDto,
    @UploadedFile() file: UploadedBusinessDocumentFile | undefined,
  ) {
    return this.filesService.upload(
      user,
      businessId,
      checklistId,
      requirementId,
      dto.organizationId,
      file,
    );
  }

  @Get(':checklistId/requirements/:requirementId/files/:documentId/download')
  downloadFile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Param('checklistId') checklistId: string,
    @Param('requirementId') requirementId: string,
    @Param('documentId') documentId: string,
    @Query() query: BusinessDocumentFileScopeDto,
  ) {
    return this.filesService.download(
      user,
      businessId,
      checklistId,
      requirementId,
      documentId,
      query.organizationId,
    );
  }

  @Post(
    ':checklistId/requirements/:requirementId/files/:documentId/replacements',
  )
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 15 * 1024 * 1024, files: 1 },
    }),
  )
  replaceFile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Param('checklistId') checklistId: string,
    @Param('requirementId') requirementId: string,
    @Param('documentId') documentId: string,
    @Body() dto: ReplaceBusinessDocumentFileDto,
    @UploadedFile() file: UploadedBusinessDocumentFile | undefined,
  ) {
    return this.filesService.replace(
      user,
      businessId,
      checklistId,
      requirementId,
      documentId,
      dto.organizationId,
      dto.reason,
      file,
    );
  }

  @Post(':checklistId/requirements/:requirementId/transitions')
  transitionRequirement(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Param('checklistId') checklistId: string,
    @Param('requirementId') requirementId: string,
    @Body() dto: TransitionBusinessDocumentRequirementDto,
  ) {
    return this.lifecycleService.transition(
      user,
      businessId,
      checklistId,
      requirementId,
      dto,
    );
  }

  @Get(':checklistId/requirements/:requirementId/history')
  requirementHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Param('checklistId') checklistId: string,
    @Param('requirementId') requirementId: string,
    @Query() query: BusinessDocumentFileScopeDto,
  ) {
    return this.lifecycleService.history(
      user,
      businessId,
      checklistId,
      requirementId,
      query.organizationId,
    );
  }

  @Post()
  instantiate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Body() dto: InstantiateBusinessDocumentChecklistDto,
  ) {
    return this.checklistsService.instantiate(user, businessId, dto);
  }

  @Post(':checklistId/requirements')
  addCustomRequirement(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessId') businessId: string,
    @Param('checklistId') checklistId: string,
    @Body() dto: CreateCustomDocumentRequirementDto,
  ) {
    return this.checklistsService.addCustomRequirement(
      user,
      businessId,
      checklistId,
      dto,
    );
  }
}
