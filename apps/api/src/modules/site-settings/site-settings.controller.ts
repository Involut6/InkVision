import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import type { PublicSiteSettingsDto } from '@inkvision/shared-types';

import { CurrentUser, Public, RequirePermissions } from '../../common/decorators/index.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

import { UpdateSiteSettingsDto } from './dto/update-site-settings.dto.js';
import { SiteSettingsService } from './site-settings.service.js';

@ApiTags('Site settings')
@Controller('site-settings')
export class SiteSettingsController {
  constructor(private readonly settings: SiteSettingsService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Public site configuration.',
    description:
      'Drives the header, footer, SEO defaults and newsletter copy. Commerce and scheduling flags come from server configuration, not the CMS.',
  })
  async get(): Promise<PublicSiteSettingsDto> {
    return this.settings.getPublic();
  }
}

@ApiTags('Admin · Site settings')
@Controller('admin/site-settings')
export class AdminSiteSettingsController {
  constructor(private readonly settings: SiteSettingsService) {}

  @Get()
  @RequirePermissions('settings:read')
  @ApiOperation({ summary: 'Editable settings plus the deployment’s runtime capabilities.' })
  async get() {
    return this.settings.getForAdmin();
  }

  @Patch()
  @RequirePermissions('settings:write')
  async update(@Body() dto: UpdateSiteSettingsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.update(dto, user);
  }
}
