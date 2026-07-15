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
import { MembershipRole } from '@soyre/database';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { RequireRoles } from '../auth/roles.decorator.js';
import { DocumentChecklistTemplatesService } from './document-checklist-templates.service.js';
import {
  CreateDocumentChecklistTemplateDto,
  DocumentChecklistTemplateQueryDto,
  UpdateDocumentChecklistTemplateDto,
} from './dto/document-checklist-template.dto.js';

@Controller('document-checklist-templates')
@RequireRoles(MembershipRole.OWNER, MembershipRole.ADMIN)
export class DocumentChecklistTemplatesController {
  constructor(
    @Inject(DocumentChecklistTemplatesService)
    private readonly templatesService: DocumentChecklistTemplatesService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DocumentChecklistTemplateQueryDto,
  ) {
    return this.templatesService.list(user, query);
  }

  @Get(':templateId')
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('templateId') templateId: string,
    @Query() query: DocumentChecklistTemplateQueryDto,
  ) {
    return this.templatesService.get(user, templateId, query.organizationId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDocumentChecklistTemplateDto,
  ) {
    return this.templatesService.create(user, dto);
  }

  @Patch(':templateId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('templateId') templateId: string,
    @Body() dto: UpdateDocumentChecklistTemplateDto,
  ) {
    return this.templatesService.update(user, templateId, dto);
  }

  @Post(':templateId/activate')
  activate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('templateId') templateId: string,
    @Body() query: DocumentChecklistTemplateQueryDto,
  ) {
    return this.templatesService.setActive(
      user,
      templateId,
      query.organizationId,
      true,
    );
  }

  @Post(':templateId/deactivate')
  deactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('templateId') templateId: string,
    @Body() query: DocumentChecklistTemplateQueryDto,
  ) {
    return this.templatesService.setActive(
      user,
      templateId,
      query.organizationId,
      false,
    );
  }
}
