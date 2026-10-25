import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import type { FaqGroupDto, LegalPageDto, TestimonialDto } from '@inkvision/shared-types';

import { CurrentUser, Public, RequirePermissions } from '../../common/decorators/index.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

import { LEGAL_PAGE_SLUGS, UpdateLegalPageDto } from './dto/legal-page.dto.js';
import { PagesService } from './pages.service.js';

@ApiTags('Pages')
@Controller()
export class PagesController {
  constructor(private readonly pages: PagesService) {}

  @Public()
  @Get('approach')
  @ApiOperation({ summary: 'The five-stage approach, with the client’s role at each stage.' })
  async approach() {
    return this.pages.getApproachStages();
  }

  @Public()
  @Get('faqs')
  @ApiOperation({ summary: 'Grouped, published FAQ entries.' })
  async faqs(): Promise<FaqGroupDto[]> {
    return this.pages.getFaqGroups();
  }

  @Public()
  @Get('testimonials')
  @ApiOperation({
    summary: 'Approved, published testimonials.',
    description:
      'Returns only entries that are both marked approved for publication and published. Expect an empty array until the business authorises specific quotes.',
  })
  async testimonials(): Promise<TestimonialDto[]> {
    return this.pages.getTestimonials();
  }

  @Public()
  @Get('legal/:slug')
  @ApiParam({ name: 'slug', enum: LEGAL_PAGE_SLUGS })
  @ApiOperation({
    summary: 'A legal page.',
    description:
      '`awaitingReview` is true while the page still carries unreviewed template copy; the website renders a visible notice in that case.',
  })
  async legalPage(@Param('slug') slug: (typeof LEGAL_PAGE_SLUGS)[number]): Promise<LegalPageDto> {
    return this.pages.getLegalPage(slug);
  }
}

@ApiTags('Admin · Pages')
@Controller('admin/legal')
export class AdminPagesController {
  constructor(private readonly pages: PagesService) {}

  @Get()
  @RequirePermissions('settings:read')
  async list(): Promise<LegalPageDto[]> {
    return this.pages.listLegalPages();
  }

  @Patch(':slug')
  @RequirePermissions('settings:write')
  @ApiParam({ name: 'slug', enum: LEGAL_PAGE_SLUGS })
  async update(
    @Param('slug') slug: (typeof LEGAL_PAGE_SLUGS)[number],
    @Body() dto: UpdateLegalPageDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LegalPageDto> {
    return this.pages.updateLegalPage(slug, dto, user);
  }
}
