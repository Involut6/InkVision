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
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import type {
  ArticleCategoryDto,
  ArticleDto,
  ArticleSummaryDto,
  Paginated,
  TagDto,
} from '@inkvision/shared-types';

import { CurrentUser, Public, RequirePermissions } from '../../common/decorators/index.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

import { ArticlesService } from './articles.service.js';
import { AdminArticleListQueryDto, ArticleListQueryDto } from './dto/article-query.dto.js';
import {
  CreateArticleCategoryDto,
  CreateArticleDto,
  PublishArticleDto,
  UpdateArticleDto,
} from './dto/article-write.dto.js';

@ApiTags('Insights')
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articles: ArticlesService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'List published articles.',
    description:
      'Drafts, archived pieces and articles scheduled for the future are never returned by this endpoint.',
  })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'tag', required: false })
  @ApiQuery({ name: 'search', required: false })
  async list(@Query() query: ArticleListQueryDto): Promise<Paginated<ArticleSummaryDto>> {
    return this.articles.listPublic(query);
  }

  // Declared before `:slug` so the literal segment is not captured as a slug.
  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'Article categories with published-article counts.' })
  async categories(): Promise<ArticleCategoryDto[]> {
    return this.articles.listCategories();
  }

  @Public()
  @Get('tags')
  @ApiOperation({ summary: 'Tags that are in use by at least one published article.' })
  async tags(): Promise<TagDto[]> {
    return this.articles.listTags();
  }

  @Public()
  @Get(':slug')
  @ApiParam({ name: 'slug' })
  @ApiResponse({ status: 404, description: 'No published article with that slug.' })
  async findOne(@Param('slug') slug: string): Promise<ArticleDto> {
    return this.articles.findPublicBySlug(slug);
  }
}

@ApiTags('Admin · Insights')
@Controller('admin/articles')
export class AdminArticlesController {
  constructor(private readonly articles: ArticlesService) {}

  @Get()
  @RequirePermissions('article:read')
  @ApiOperation({ summary: 'List every article, in any state.' })
  async list(@Query() query: AdminArticleListQueryDto) {
    return this.articles.listForAdmin(query);
  }

  @Post('categories')
  @RequirePermissions('article:write')
  @ApiOperation({ summary: 'Create an article category.' })
  async createCategory(
    @Body() dto: CreateArticleCategoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.articles.createCategory(dto.name, dto.description, user);
  }

  @Get(':id')
  @RequirePermissions('article:read')
  @ApiOperation({
    summary: 'Full article including body.',
    description: 'This is the source for admin preview, so it returns drafts.',
  })
  async findOne(@Param('id') id: string) {
    return this.articles.findForAdmin(id);
  }

  @Post()
  @RequirePermissions('article:write')
  @ApiOperation({ summary: 'Create a draft article.' })
  async create(@Body() dto: CreateArticleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.articles.create(dto, user);
  }

  @Patch(':id')
  @RequirePermissions('article:write')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateArticleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.articles.update(id, dto, user);
  }

  @Post(':id/publish')
  @RequirePermissions('article:publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Publish, or schedule for a future moment.',
    description: 'Requires a summary and a non-empty body.',
  })
  async publish(
    @Param('id') id: string,
    @Body() dto: PublishArticleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.articles.publish(id, dto.publishAt, user);
  }

  @Post(':id/unpublish')
  @RequirePermissions('article:publish')
  @HttpCode(HttpStatus.OK)
  async unpublish(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.articles.unpublish(id, user);
  }

  @Post(':id/archive')
  @RequirePermissions('article:publish')
  @HttpCode(HttpStatus.OK)
  async archive(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.articles.archive(id, user);
  }
}
