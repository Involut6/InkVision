import { Injectable, Logger } from '@nestjs/common';

import type { DigitalDeliveryDto } from '@inkvision/shared-types';

import { AppConfigService } from '../../config/configuration.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  DownloadLimitReachedException,
  DownloadLinkInvalidException,
  ResourceNotFoundException,
} from '../../common/errors/app.errors.js';
import { hmacSha256, safeEquals } from '../../common/utils/crypto.js';

export interface SignedDownloadLink {
  readonly deliveryId: string;
  readonly productTitle: string;
  readonly url: string;
  readonly expiresAt: string;
}

/**
 * Digital fulfilment.
 *
 * Download links are signed, time-limited and attempt-limited. The file itself
 * lives in private storage and is only ever streamed by this service after the
 * signature, the expiry, the delivery status and the attempt count have all
 * been checked — there is no URL that reaches a product file directly.
 */
@Injectable()
export class DeliveriesService {
  private readonly logger = new Logger(DeliveriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  /**
   * Creates the deliveries for a paid order and marks them available.
   *
   * Idempotent: an order whose deliveries already exist is left alone, which
   * matters because a redelivered webhook will call this again.
   */
  async provisionForOrder(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: { include: { assets: true } } } },
        deliveries: true,
      },
    });

    if (!order) throw new ResourceNotFoundException('Order', orderId);
    if (order.status !== 'PAID' && order.status !== 'FULFILLED') {
      // Defence in depth: provisioning is only ever called after verified
      // payment, but the check means a future caller cannot bypass that.
      this.logger.warn({ orderId, status: order.status }, 'Refused to provision an unpaid order');
      return;
    }

    const existing = new Set(order.deliveries.map((delivery) => delivery.productId));

    for (const item of order.items) {
      if (existing.has(item.productId)) continue;

      const deliverable = item.product.assets.find(
        (link) => link.kind === 'DELIVERABLE' && link.isCurrent,
      );

      await this.prisma.digitalProductDelivery.create({
        data: {
          orderId: order.id,
          productId: item.productId,
          // Pinned to the asset version bought, so a later product update does
          // not change what this customer receives.
          assetId: deliverable?.assetId ?? null,
          status: deliverable ? 'AVAILABLE' : 'PENDING',
          maxDownloads: this.config.commerce.downloadMaxAttempts,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      if (!deliverable) {
        this.logger.error(
          { orderId, productId: item.productId },
          'Paid order has no deliverable asset: delivery left PENDING for manual follow-up',
        );
      }
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'FULFILLED', fulfilledAt: new Date() },
    });
  }

  /**
   * Mints a signed, time-limited link for each available delivery on an order.
   *
   * The signature covers the delivery id and the expiry, so neither can be
   * changed without invalidating the link.
   */
  async createLinks(orderId: string): Promise<SignedDownloadLink[]> {
    const deliveries = await this.prisma.digitalProductDelivery.findMany({
      where: { orderId, status: { in: ['AVAILABLE', 'DELIVERED'] } },
      include: { product: { select: { title: true } } },
    });

    const ttlMs = this.config.commerce.downloadLinkTtlSeconds * 1000;

    return deliveries.map((delivery) => {
      const expiresAtMs = Date.now() + ttlMs;
      const signature = this.sign(delivery.id, expiresAtMs);
      const base = `${this.config.publicApiUrl}/${this.config.globalPrefix}/v1/downloads/${delivery.id}`;

      return {
        deliveryId: delivery.id,
        productTitle: delivery.product.title,
        url: `${base}?expires=${expiresAtMs}&signature=${signature}`,
        expiresAt: new Date(expiresAtMs).toISOString(),
      };
    });
  }

  /**
   * Validates a signed link and reserves one download attempt.
   *
   * The counter is incremented with a conditional update, so two simultaneous
   * requests cannot both consume the last remaining attempt.
   */
  async claimDownload(
    deliveryId: string,
    expires: string,
    signature: string,
  ): Promise<{ assetId: string; productTitle: string }> {
    const expiresAtMs = Number(expires);

    if (!Number.isFinite(expiresAtMs)) throw new DownloadLinkInvalidException();
    if (expiresAtMs < Date.now()) {
      throw new DownloadLinkInvalidException(
        'This download link has expired. Please request a new one.',
      );
    }
    if (!safeEquals(this.sign(deliveryId, expiresAtMs), signature)) {
      throw new DownloadLinkInvalidException();
    }

    const delivery = await this.prisma.digitalProductDelivery.findUnique({
      where: { id: deliveryId },
      include: { product: { select: { title: true } } },
    });

    if (!delivery) throw new DownloadLinkInvalidException();
    if (delivery.status === 'REVOKED' || delivery.status === 'EXPIRED') {
      throw new DownloadLinkInvalidException();
    }
    if (!delivery.assetId) {
      throw new DownloadLinkInvalidException(
        'This purchase is awaiting its file. We have been notified and will be in touch.',
      );
    }
    if (delivery.expiresAt && delivery.expiresAt.getTime() < Date.now()) {
      await this.prisma.digitalProductDelivery.update({
        where: { id: deliveryId },
        data: { status: 'EXPIRED' },
      });
      throw new DownloadLinkInvalidException('Access to this purchase has expired.');
    }

    const claimed = await this.prisma.digitalProductDelivery.updateMany({
      where: { id: deliveryId, downloadCount: { lt: delivery.maxDownloads } },
      data: {
        downloadCount: { increment: 1 },
        status: 'DELIVERED',
        deliveredAt: delivery.deliveredAt ?? new Date(),
        lastDownloadAt: new Date(),
      },
    });

    if (claimed.count === 0) throw new DownloadLimitReachedException();

    return { assetId: delivery.assetId, productTitle: delivery.product.title };
  }

  async listForOrder(orderId: string): Promise<DigitalDeliveryDto[]> {
    const rows = await this.prisma.digitalProductDelivery.findMany({
      where: { orderId },
      include: { product: { select: { title: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return rows.map((row) => ({
      id: row.id,
      productId: row.productId,
      productTitle: row.product.title,
      status: row.status,
      downloadCount: row.downloadCount,
      maxDownloads: row.maxDownloads,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      deliveredAt: row.deliveredAt?.toISOString() ?? null,
    }));
  }

  /** Support action: grant a fresh allowance after a genuine failure. */
  async resetAttempts(deliveryId: string): Promise<void> {
    await this.prisma.digitalProductDelivery.update({
      where: { id: deliveryId },
      data: { downloadCount: 0, status: 'AVAILABLE' },
    });
  }

  private sign(deliveryId: string, expiresAtMs: number): string {
    return hmacSha256(`${deliveryId}:${expiresAtMs}`, this.config.commerce.downloadLinkSecret);
  }
}
