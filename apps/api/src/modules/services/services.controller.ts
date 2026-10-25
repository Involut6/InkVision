import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import type { ServiceDto, ServiceSummaryDto } from '@inkvision/shared-types';

import { CurrentUser, Public, RequirePermissions } from '../../common/decorators/index.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

import { UpdateServiceDto } from './dto/update-service.dto.js';
import { ServicesService } from './services.service.js';

@ApiTags('Services')
@Controller('services')
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List the published service categories.' })
  async list(): Promise<ServiceSummaryDto[]> {
    return this.services.listPublic();
  }

  @Public()
  @Get(':slug')
  @ApiParam({ name: 'slug', example: 'executive-visibility' })
  @ApiOperation({ summary: 'A published service, with components, process and FAQs.' })
  @ApiResponse({ status: 404, description: 'No published service with that slug.' })
  async findOne(@Param('slug') slug: string): Promise<ServiceDto> {
    return this.services.findPublicBySlug(slug);
  }
}

@ApiTags('Admin · Services')
@Controller('admin/services')
export class AdminServicesController {
  constructor(private readonly services: ServicesService) {}

  @Get()
  @RequirePermissions('service:read')
  @ApiOperation({ summary: 'List every service, including unpublished ones.' })
  async list() {
    return this.services.listForAdmin();
  }

  @Get(':id')
  @RequirePermissions('service:read')
  async findOne(@Param('id') id: string) {
    return this.services.findForAdmin(id);
  }

  @Patch(':id')
  @RequirePermissions('service:write')
  @ApiOperation({ summary: 'Update service copy, components, process and FAQs.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.services.update(id, dto, user);
  }
}
