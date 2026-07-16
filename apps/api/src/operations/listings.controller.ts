import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { CreateListingDto } from './dto/create-operational.dto.js';
import { ListListingsQueryDto } from './dto/list-operational-query.dto.js';
import {
  ListingOrganizationQueryDto,
  TransitionListingDto,
  UpdateListingDto,
} from './dto/listing.dto.js';
import {
  ChangeListingMaterialDto,
  CreateListingMaterialDto,
} from './dto/listing-material.dto.js';
import type { CommercialMaterialFile } from './listing-materials.service.js';
import { ListingMaterialsService } from './listing-materials.service.js';
import { ListingsService } from './listings.service.js';

@Controller('listings')
export class ListingsController {
  constructor(
    @Inject(ListingsService)
    private readonly listingsService: ListingsService,
    @Inject(ListingMaterialsService)
    private readonly listingMaterialsService: ListingMaterialsService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListListingsQueryDto,
  ) {
    return this.listingsService.list(user, query);
  }

  @Get(':listingId')
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('listingId') listingId: string,
    @Query() query: ListingOrganizationQueryDto,
  ) {
    return this.listingsService.get(user, listingId, query.organizationId);
  }

  @Get(':listingId/history')
  history(
    @CurrentUser() user: AuthenticatedUser,
    @Param('listingId') listingId: string,
    @Query() query: ListingOrganizationQueryDto,
  ) {
    return this.listingsService.history(user, listingId, query.organizationId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateListingDto,
  ) {
    return this.listingsService.create(user, dto);
  }

  @Patch(':listingId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('listingId') listingId: string,
    @Body() dto: UpdateListingDto,
  ) {
    return this.listingsService.update(user, listingId, dto);
  }

  @Post(':listingId/transitions')
  transition(
    @CurrentUser() user: AuthenticatedUser,
    @Param('listingId') listingId: string,
    @Body() dto: TransitionListingDto,
  ) {
    return this.listingsService.transition(user, listingId, dto);
  }

  @Post(':listingId/materials')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 15 * 1024 * 1024, files: 1 },
    }),
  )
  createMaterial(
    @CurrentUser() user: AuthenticatedUser,
    @Param('listingId') listingId: string,
    @Body() dto: CreateListingMaterialDto,
    @UploadedFile() file?: CommercialMaterialFile,
  ) {
    return this.listingMaterialsService.create(user, listingId, dto, file);
  }

  @Patch(':listingId/materials/:materialId')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 15 * 1024 * 1024, files: 1 },
    }),
  )
  changeMaterial(
    @CurrentUser() user: AuthenticatedUser,
    @Param('listingId') listingId: string,
    @Param('materialId') materialId: string,
    @Body() dto: ChangeListingMaterialDto,
    @UploadedFile() file?: CommercialMaterialFile,
  ) {
    return this.listingMaterialsService.change(
      user,
      listingId,
      materialId,
      dto,
      file,
    );
  }

  @Get(':listingId/materials/:materialId/preview')
  previewMaterial(
    @CurrentUser() user: AuthenticatedUser,
    @Param('listingId') listingId: string,
    @Param('materialId') materialId: string,
    @Query() query: ListingOrganizationQueryDto,
  ) {
    return this.listingMaterialsService.preview(
      user,
      listingId,
      materialId,
      query.organizationId,
    );
  }
}
