import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import type { ProductDto, ProductSummaryDto } from '@inkvision/shared-types';

import { CurrentUser, Public, RequirePermissions } from '../../common/decorators/index.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

import {
  CreateProductDto,
  SetProductStatusDto,
  UpdateProductDto,
} from './dto/product-write.dto.js';
import { ProductsService } from './products.service.js';

@ApiTags('Resources')
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'List available and upcoming digital resources.',
    description:
      'Each product carries a server-computed `purchasable` flag. It is true only when commerce is enabled, the product is active and priced, and a deliverable file is attached.',
  })
  async list(): Promise<ProductSummaryDto[]> {
    return this.products.listPublic();
  }

  @Public()
  @Get(':slug')
  @ApiParam({ name: 'slug', example: 'personal-branding-blueprint-for-corporate-professionals' })
  @ApiResponse({ status: 404, description: 'No publicly visible product with that slug.' })
  async findOne(@Param('slug') slug: string): Promise<ProductDto> {
    return this.products.findPublicBySlug(slug);
  }
}

@ApiTags('Admin · Resources')
@Controller('admin/products')
export class AdminProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @RequirePermissions('product:read')
  @ApiOperation({
    summary: 'List every product with the reason it is not purchasable, if any.',
  })
  async list() {
    return this.products.listForAdmin();
  }

  @Get(':id')
  @RequirePermissions('product:read')
  async findOne(@Param('id') id: string) {
    return this.products.findForAdmin(id);
  }

  @Post()
  @RequirePermissions('product:write')
  @ApiOperation({ summary: 'Create a product. New products always start as drafts.' })
  async create(@Body() dto: CreateProductDto, @CurrentUser() user: AuthenticatedUser) {
    return this.products.create(dto, user);
  }

  @Patch(':id')
  @RequirePermissions('product:write')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.products.update(id, dto, user);
  }

  @Post(':id/status')
  @RequirePermissions('product:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change a product lifecycle state.' })
  @ApiResponse({
    status: 400,
    description: 'Activation blocked: price, currency, refund terms or deliverable file missing.',
  })
  async setStatus(
    @Param('id') id: string,
    @Body() dto: SetProductStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.products.setStatus(id, dto.status, user);
  }
}
