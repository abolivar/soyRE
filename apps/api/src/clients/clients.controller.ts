import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ClientsService } from './clients.service.js';
import { CreateClientDto } from './dto/create-client.dto.js';
import { ListClientsQueryDto } from './dto/list-clients-query.dto.js';

@Controller('clients')
@UseGuards(JwtAuthGuard)
export class ClientsController {
  constructor(
    @Inject(ClientsService) private readonly clientsService: ClientsService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListClientsQueryDto,
  ) {
    return this.clientsService.list(user, query);
  }

  @Get(':clientId')
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('clientId') clientId: string,
    @Query() query: ListClientsQueryDto,
  ) {
    return this.clientsService.get(user, clientId, query.organizationId);
  }

  @Get(':clientId/identity-documents/:documentId/download')
  async downloadIdentityDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('clientId') clientId: string,
    @Param('documentId') documentId: string,
    @Query() query: ListClientsQueryDto,
    @Res() response: Response,
  ) {
    const { document, content } =
      await this.clientsService.downloadIdentityDocument(
        user,
        clientId,
        documentId,
        query.organizationId,
      );

    response.setHeader('Content-Type', document.mimeType);
    response.setHeader('Content-Length', String(document.fileSize));
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${sanitizeDownloadFileName(document.fileName)}"`,
    );
    response.end(content);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateClientDto) {
    return this.clientsService.create(user, dto);
  }
}

function sanitizeDownloadFileName(value: string) {
  return value.replace(/[^\w.\- ]/g, '_').slice(0, 160);
}
