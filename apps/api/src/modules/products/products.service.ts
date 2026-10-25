import { Injectable } from '@nestjs/common';

import type { ProductDto, ProductSummaryDto } from '@inkvision/shared-types';

import { AppConfigService } from '../../config/configuration.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  ResourceNotFoundException,
  ValidationFailedException,
} from '../../common/errors/app.errors.js';
import { prepareRichText } from '../../common/utils/rich-text.js';
import { toMoney } from '../../common/utils/money.js';
import { slugify, uniqueSlug } from '../../common/utils/slug.js';
import { AuditService } from '../audit/audit.service.js';
import { toImageRef } from '../content/mappers/media.mapper.js';
import type { Prisma } from '../../generated/prisma/client.js';

import type { CreateProductDto, UpdateProductDto } from './dto/product-write.dto.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

const ASSETS_INCLUDE = {
  assets: { include: { asset: true }, orderBy: [{ kind: 'asc' }, { position: 'asc' }] },
} satisfies Prisma.ProductInclude;

/**
 * The row shape is derived from the query rather than restated, so the include
 * above and the type below can never drift apart.
 */
type ProductRow = Prisma.ProductGetPayload<{ include: typeof ASSETS_INCLUDE }>;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Public catalogue. ACTIVE and COMING_SOON products are listed so the
   * storefront can show what is on the way; DRAFT and ARCHIVED never appear.
   */
  async listPublic(): Promise<ProductSummaryDto[]> {
    const rows = await this.prisma.product.findMany({
      where: { status: { in: ['ACTIVE', 'COMING_SOON'] } },
      include: ASSETS_INCLUDE,
      orderBy: [{ featured: 'desc' }, { position: 'asc' }, { title: 'asc' }],
    });

    return rows.map((row) => this.toSummary(row));
  }

  async findPublicBySlug(slug: string): Promise<ProductDto> {
    const row = await this.prisma.product.findFirst({
      where: { slug, status: { in: ['ACTIVE', 'COMING_SOON'] } },
      include: ASSETS_INCLUDE,
    });

    if (!row) throw new ResourceNotFoundException('Product', slug);
    return this.toDetail(row);
  }

  /**
   * The authority on whether a product can be bought. Four conditions, all
   * server-side:
   *   1. commerce is switched on for this deployment,
   *   2. the product is ACTIVE,
   *   3. it has a price and currency,
   *   4. a current deliverable file is attached.
   *
   * Nothing the browser sends can influence this.
   */
  isPurchasable(
    row: Pick<ProductRow, 'status' | 'priceAmountMinor' | 'currency' | 'assets'>,
  ): boolean {
    if (!this.config.commerce.enabled) return false;
    if (row.status !== 'ACTIVE') return false;
    if (row.priceAmountMinor === null || row.priceAmountMinor <= 0) return false;
    if (!row.currency) return false;
    return row.assets.some((link) => link.kind === 'DELIVERABLE' && link.isCurrent);
  }

  /** Loads a product for checkout, with the reason it cannot be sold, if any. */
  async findForPurchase(slug: string): Promise<{
    product: ProductRow;
    purchasable: boolean;
    reason: string | null;
  }> {
    const row = await this.prisma.product.findUnique({
      where: { slug },
      include: ASSETS_INCLUDE,
    });

    if (!row) throw new ResourceNotFoundException('Product', slug);

    const purchasable = this.isPurchasable(row);

    return { product: row, purchasable, reason: purchasable ? null : this.unavailableReason(row) };
  }

  private unavailableReason(row: ProductRow): string {
    if (!this.config.commerce.enabled) {
      return 'Purchasing is not enabled on this site yet.';
    }
    if (row.status === 'COMING_SOON') return `"${row.title}" is not available for purchase yet.`;
    if (row.status !== 'ACTIVE') return `"${row.title}" is not currently available.`;
    if (row.priceAmountMinor === null || !row.currency) {
      return `"${row.title}" does not have a published price yet.`;
    }
    return `"${row.title}" has no deliverable file attached, so it cannot be delivered.`;
  }

  // ---------------------------------------------------------------------------
  // Admin
  // ---------------------------------------------------------------------------

  async listForAdmin() {
    const rows = await this.prisma.product.findMany({
      include: ASSETS_INCLUDE,
      orderBy: [{ position: 'asc' }, { title: 'asc' }],
    });

    return rows.map((row) => ({
      ...this.toSummary(row),
      status: row.status,
      hasDeliverable: row.assets.some((link) => link.kind === 'DELIVERABLE' && link.isCurrent),
      blockedReason: this.isPurchasable(row) ? null : this.unavailableReason(row),
    }));
  }

  async findForAdmin(id: string) {
    const row = await this.prisma.product.findUnique({ where: { id }, include: ASSETS_INCLUDE });
    if (!row) throw new ResourceNotFoundException('Product', id);
    return { ...this.toDetail(row), rawStatus: row.status };
  }

  async create(dto: CreateProductDto, actor: AuthenticatedUser) {
    this.assertPriceCoherent(dto.priceAmountMinor, dto.currency);

    const slug = await this.resolveSlug(dto.slug ?? dto.title);
    const description = prepareRichText(dto.descriptionHtml);

    const created = await this.prisma.product.create({
      data: {
        slug,
        title: dto.title,
        subtitle: dto.subtitle ?? null,
        summary: dto.summary,
        descriptionHtml: description.html,
        descriptionText: description.text,
        intendedAudience: dto.intendedAudience,
        benefits: dto.benefits ?? [],
        contents: dto.contents ?? [],
        priceAmountMinor: dto.priceAmountMinor ?? null,
        currency: dto.currency ?? null,
        fileFormat: dto.fileFormat ?? null,
        fileSizeBytes: dto.fileSizeBytes ?? null,
        pageCount: dto.pageCount ?? null,
        ...(dto.deliveryMethod ? { deliveryMethod: dto.deliveryMethod } : {}),
        refundTerms: dto.refundTerms ?? null,
        updatePolicy: dto.updatePolicy ?? null,
        seoTitle: dto.seoTitle ?? null,
        seoDescription: dto.seoDescription ?? null,
        // New products always start as drafts: nothing becomes buyable by
        // accident on creation.
        status: 'DRAFT',
      },
    });

    await this.audit.record({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'product.created',
      entityType: 'Product',
      entityId: created.id,
      summary: `Created product "${created.title}" as a draft`,
    });

    return this.findForAdmin(created.id);
  }

  async update(id: string, dto: UpdateProductDto, actor: AuthenticatedUser) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new ResourceNotFoundException('Product', id);

    const nextPrice = dto.priceAmountMinor ?? existing.priceAmountMinor;
    const nextCurrency = dto.currency ?? existing.currency;
    this.assertPriceCoherent(nextPrice, nextCurrency);

    const description = dto.descriptionHtml ? prepareRichText(dto.descriptionHtml) : null;
    const slug =
      dto.slug && dto.slug !== existing.slug ? await this.resolveSlug(dto.slug, id) : undefined;

    await this.prisma.product.update({
      where: { id },
      data: {
        ...(slug ? { slug } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.subtitle !== undefined ? { subtitle: dto.subtitle } : {}),
        ...(dto.summary !== undefined ? { summary: dto.summary } : {}),
        ...(description
          ? { descriptionHtml: description.html, descriptionText: description.text }
          : {}),
        ...(dto.intendedAudience !== undefined ? { intendedAudience: dto.intendedAudience } : {}),
        ...(dto.benefits !== undefined ? { benefits: dto.benefits } : {}),
        ...(dto.contents !== undefined ? { contents: dto.contents } : {}),
        ...(dto.priceAmountMinor !== undefined ? { priceAmountMinor: dto.priceAmountMinor } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
        ...(dto.fileFormat !== undefined ? { fileFormat: dto.fileFormat } : {}),
        ...(dto.fileSizeBytes !== undefined ? { fileSizeBytes: dto.fileSizeBytes } : {}),
        ...(dto.pageCount !== undefined ? { pageCount: dto.pageCount } : {}),
        ...(dto.deliveryMethod !== undefined ? { deliveryMethod: dto.deliveryMethod } : {}),
        ...(dto.refundTerms !== undefined ? { refundTerms: dto.refundTerms } : {}),
        ...(dto.updatePolicy !== undefined ? { updatePolicy: dto.updatePolicy } : {}),
        ...(dto.seoTitle !== undefined ? { seoTitle: dto.seoTitle } : {}),
        ...(dto.seoDescription !== undefined ? { seoDescription: dto.seoDescription } : {}),
        ...(dto.featured !== undefined ? { featured: dto.featured } : {}),
        ...(dto.position !== undefined ? { position: dto.position } : {}),
      },
    });

    await this.audit.record({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'product.updated',
      entityType: 'Product',
      entityId: id,
      summary: `Updated product "${dto.title ?? existing.title}"`,
      metadata: { changedFields: Object.keys(dto) },
    });

    return this.findForAdmin(id);
  }

  /**
   * Moves a product between lifecycle states.
   *
   * Promoting to ACTIVE is refused unless everything needed to actually sell
   * and deliver it is present. An ACTIVE product with nothing to deliver is the
   * failure mode this guards against.
   */
  async setStatus(id: string, status: ProductSummaryDto['status'], actor: AuthenticatedUser) {
    const row = await this.prisma.product.findUnique({ where: { id }, include: ASSETS_INCLUDE });
    if (!row) throw new ResourceNotFoundException('Product', id);

    if (status === 'ACTIVE') {
      const problems: Record<string, string[]> = {};
      const typed = row;

      if (typed.priceAmountMinor === null || typed.priceAmountMinor <= 0) {
        problems.priceAmountMinor = ['Set a price before making a product available.'];
      }
      if (!typed.currency) {
        problems.currency = ['Set a currency before making a product available.'];
      }
      if (!typed.assets.some((link) => link.kind === 'DELIVERABLE' && link.isCurrent)) {
        problems.deliverable = [
          'Attach the deliverable file before making a product available, otherwise a buyer has nothing to download.',
        ];
      }
      if (!typed.refundTerms) {
        problems.refundTerms = ['Publish refund terms before taking payment for a product.'];
      }

      if (Object.keys(problems).length > 0) throw new ValidationFailedException(problems);
    }

    await this.prisma.product.update({ where: { id }, data: { status } });

    await this.audit.record({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'product.status_changed',
      entityType: 'Product',
      entityId: id,
      summary: `Product "${row.title}" moved from ${row.status} to ${status}`,
      metadata: { from: row.status, to: status },
    });

    return this.findForAdmin(id);
  }

  // ---------------------------------------------------------------------------
  // Mapping
  // ---------------------------------------------------------------------------

  private toSummary(row: ProductRow): ProductSummaryDto {
    const cover = row.assets.find((link) => link.kind === 'COVER');

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      subtitle: row.subtitle,
      summary: row.summary,
      status: row.status,
      price: toMoney(row.priceAmountMinor, row.currency),
      coverImage: toImageRef(cover?.asset, this.config),
      fileFormat: row.fileFormat,
      purchasable: this.isPurchasable(row),
      featured: row.featured,
    };
  }

  private toDetail(row: ProductRow): ProductDto {
    return {
      ...this.toSummary(row),
      description: { html: row.descriptionHtml, text: row.descriptionText },
      intendedAudience: row.intendedAudience,
      benefits: row.benefits,
      contents: row.contents,
      previewImages: row.assets
        .filter((link) => link.kind === 'PREVIEW')
        .map((link) => toImageRef(link.asset, this.config))
        .filter((image): image is NonNullable<typeof image> => image !== null),
      fileSizeBytes: row.fileSizeBytes,
      pageCount: row.pageCount,
      deliveryMethod: row.deliveryMethod,
      refundTerms: row.refundTerms,
      updatePolicy: row.updatePolicy,
      updatedAt: row.updatedAt.toISOString(),
      ...(row.seoTitle ? { seoTitle: row.seoTitle } : {}),
      ...(row.seoDescription ? { seoDescription: row.seoDescription } : {}),
      ...(row.noIndex ? { noIndex: true } : {}),
    };
  }

  /** A price without a currency (or the reverse) is never storable. */
  private assertPriceCoherent(
    amountMinor: number | null | undefined,
    currency: string | null | undefined,
  ): void {
    const hasAmount = amountMinor !== null && amountMinor !== undefined;
    const hasCurrency = currency !== null && currency !== undefined && currency !== '';

    if (hasAmount && !hasCurrency) {
      throw new ValidationFailedException({ currency: ['A price needs a currency code.'] });
    }
    if (hasCurrency && !hasAmount) {
      throw new ValidationFailedException({ priceAmountMinor: ['A currency needs a price.'] });
    }
    if (hasAmount && !Number.isInteger(amountMinor)) {
      throw new ValidationFailedException({
        priceAmountMinor: ['Prices are whole minor units (for example 950000 for ₦9,500.00).'],
      });
    }
  }

  private async resolveSlug(source: string, excludeId?: string): Promise<string> {
    const base = slugify(source);
    if (!base)
      throw new ValidationFailedException({ slug: ['Could not derive a slug from the title.'] });

    const conflicts = await this.prisma.product.findMany({
      where: { slug: { startsWith: base }, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { slug: true },
    });

    return uniqueSlug(base, new Set(conflicts.map((row) => row.slug)));
  }
}
