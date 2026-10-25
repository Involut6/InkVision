import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import type {
  CaseStudyDto,
  CaseStudySummaryDto,
  Paginated,
  PortfolioCategoryDto,
} from '@inkvision/shared-types';

import { CurrentUser, Public, RequirePermissions } from '../../common/decorators/index.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

import { CaseStudiesService } from './case-studies.service.js';
import { AdminCaseStudyListQueryDto, CaseStudyListQueryDto } from './dto/case-study-query.dto.js';
import { CreateCaseStudyDto, UpdateCaseStudyDto } from './dto/case-study-write.dto.js';

@ApiTags('Selected work')
@Controller('case-studies')
export class CaseStudiesController {
  constructor(private readonly caseStudies: CaseStudiesService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'List published case studies and samples.',
    description:
      'Each entry carries a `kind` so the site can label illustrative work distinctly from commissioned client work.',
  })
  async list(@Query() query: CaseStudyListQueryDto): Promise<Paginated<CaseStudySummaryDto>> {
    return this.caseStudies.listPublic(query);
  }

  @Public()
  @Get('categories')
  async categories(): Promise<PortfolioCategoryDto[]> {
    return this.caseStudies.listCategories();
  }

  @Public()
  @Get(':slug')
  @ApiParam({ name: 'slug' })
  @ApiResponse({ status: 404, description: 'No published case study with that slug.' })
  async findOne(@Param('slug') slug: string): Promise<CaseStudyDto> {
    return this.caseStudies.findPublicBySlug(slug);
  }
}

@ApiTags('Admin · Selected work')
@Controller('admin/case-studies')
export class AdminCaseStudiesController {
  constructor(private readonly caseStudies: CaseStudiesService) {}

  @Get()
  @RequirePermissions('case_study:read')
  async list(@Query() query: AdminCaseStudyListQueryDto) {
    return this.caseStudies.listForAdmin(query);
  }

  @Get(':id')
  @RequirePermissions('case_study:read')
  async findOne(@Param('id') id: string) {
    return this.caseStudies.findForAdmin(id);
  }

  @Post()
  @RequirePermissions('case_study:write')
  @ApiOperation({ summary: 'Create a draft case study.' })
  async create(@Body() dto: CreateCaseStudyDto, @CurrentUser() user: AuthenticatedUser) {
    return this.caseStudies.create(dto, user);
  }

  @Patch(':id')
  @RequirePermissions('case_study:write')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCaseStudyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.caseStudies.update(id, dto, user);
  }

  @Post(':id/publish')
  @RequirePermissions('case_study:publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Publish a case study.',
    description:
      'Refused for commissioned client work without recorded client approval, and for unverified outcomes.',
  })
  @ApiResponse({ status: 400, description: 'Client approval or outcome verification is missing.' })
  async publish(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.caseStudies.publish(id, user);
  }

  @Post(':id/unpublish')
  @RequirePermissions('case_study:publish')
  @HttpCode(HttpStatus.OK)
  async unpublish(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.caseStudies.unpublish(id, user);
  }
}
