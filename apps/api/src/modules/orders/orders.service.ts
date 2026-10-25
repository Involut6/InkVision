import { Inject, Injectable, Logger } from '@nestjs/common';

import type {
  CheckoutResponse,
  CommerceStatusDto,
  OrderAccessResponse,
  OrderDto,
  Paginated,
} from '@inkvision/shared-types';

import { AppConfigService } from '../../config/configuration.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import {
  CommerceDisabledException,
  PaymentVerificationFailedException,
  ProductUnavailableException,
  ResourceNotFoundException,
} from '../../common/errors/app.errors.js';
import {
  paginate,
  resolvePagination,
  type PaginationQueryDto,
} from '../../common/dto/pagination.dto.js';
import {
  generateReference,
  hashIpAddress,
  randomToken,
  sha256,
} from '../../common/utils/crypto.js';
import { toMoney } from '../../common/utils/money.js';
import { MailService } from '../../mail/mail.service.js';
import { AuditService } from '../audit/audit.service.js';
import { DeliveriesService } from '../deliveries/deliveries.service.js';
import { ProductsService } from '../products/products.service.js';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
  type VerifiedPayment,
  type WebhookRequest,
} from '../payments/payment-provider.types.js';

import type { CheckoutDto } from './dto/checkout.dto.js';
import type { ClientContext } from '../../common/decorators/index.js';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly products: ProductsService,
    private readonly deliveries: DeliveriesService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  /** What the storefront and the admin portal are told about commerce. */
  commerceStatus(): CommerceStatusDto {
    const enabled = this.config.commerce.enabled && this.provider.configured;

    return {
      enabled,
      provider: this.provider.name,
      currency: this.config.commerce.currency,
      reason: enabled
        ? null
        : !this.config.commerce.enabled
          ? 'COMMERCE_ENABLED is false for this deployment.'
          : this.provider.unavailableReason,
    };
  }

  /**
   * Starts a purchase.
   *
   * The sequence is deliberate, and each step exists because skipping it is a
   * known way to lose money or deliver goods for free:
   *
   *   1. Refuse outright unless commerce is enabled AND a provider is configured.
   *   2. Look the product up and re-derive its price server-side. The request
   *      body carries no price at all, so there is nothing to tamper with.
   *   3. Create a PENDING order holding the price we just read.
   *   4. Ask the provider for a checkout session.
   *
   * The order is only ever marked paid by `verifyAndRecordPayment`, which talks
   * to the provider directly.
   */
  async checkout(dto: CheckoutDto, client: ClientContext): Promise<CheckoutResponse> {
    const status = this.commerceStatus();
    if (!status.enabled) throw new CommerceDisabledException();

    const { product, purchasable, reason } = await this.products.findForPurchase(dto.productSlug);
    if (!purchasable)
      throw new ProductUnavailableException(reason ?? 'This resource is not available.');

    // Non-null after `purchasable`, which requires both.
    const unitPriceMinor = product.priceAmountMinor!;
    const currency = product.currency!;

    if (dto.idempotencyKey) {
      const existing = await this.prisma.order.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
        include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
      });

      if (existing) {
        // A retried checkout returns the original order rather than charging
        // the customer twice.
        return {
          orderId: existing.id,
          reference: existing.reference,
          status: existing.status,
          amount: { amountMinor: existing.totalAmountMinor, currency: existing.currency },
          checkoutUrl: null,
          provider: this.provider.name,
        };
      }
    }

    const reference = generateReference('INK');
    const accessToken = randomToken(24);

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          reference,
          customerEmail: dto.customerEmail,
          customerName: dto.customerName,
          status: 'PENDING',
          totalAmountMinor: unitPriceMinor,
          currency,
          idempotencyKey: dto.idempotencyKey ?? null,
          accessTokenHash: sha256(accessToken),
          ipHash: hashIpAddress(client.ipAddress, this.config.auth.csrfSecret),
          userAgent: client.userAgent ?? null,
        },
      });

      await tx.orderItem.create({
        data: {
          orderId: created.id,
          productId: product.id,
          // Snapshotted, so later product edits never rewrite this order.
          productTitle: product.title,
          unitPriceMinor,
          currency,
          quantity: 1,
          subtotalMinor: unitPriceMinor,
        },
      });

      return created;
    });

    let checkoutUrl: string | null = null;

    try {
      const session = await this.provider.initiateCheckout({
        orderReference: reference,
        amount: { amountMinor: unitPriceMinor, currency },
        customerEmail: dto.customerEmail,
        customerName: dto.customerName,
        returnUrl: `${this.config.publicWebUrl}/resources/order/${reference}?token=${accessToken}`,
        metadata: { orderId: order.id, orderReference: reference },
      });

      checkoutUrl = session.checkoutUrl;

      await this.prisma.$transaction([
        this.prisma.paymentTransaction.create({
          data: {
            orderId: order.id,
            provider: this.provider.name,
            providerReference: session.providerReference,
            status: 'INITIATED',
            amountMinor: unitPriceMinor,
            currency,
          },
        }),
        this.prisma.order.update({
          where: { id: order.id },
          data: { status: 'AWAITING_PAYMENT' },
        }),
      ]);
    } catch (error) {
      // The order is marked failed rather than left dangling, so the admin
      // view shows what happened instead of a silent PENDING row.
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'FAILED',
          failureReason: error instanceof Error ? error.message.slice(0, 500) : 'Checkout failed',
        },
      });

      this.logger.error(
        { orderId: order.id, err: error instanceof Error ? error.message : String(error) },
        'Failed to initiate checkout with the payment provider',
      );

      throw new ProductUnavailableException(
        'We could not start the payment process. Please try again shortly or get in touch.',
      );
    }

    return {
      orderId: order.id,
      reference: order.reference,
      status: 'AWAITING_PAYMENT',
      amount: { amountMinor: unitPriceMinor, currency },
      checkoutUrl,
      provider: this.provider.name,
    };
  }

  /** Verifies a provider webhook and, if genuine, settles the order. */
  async handleWebhook(request: WebhookRequest): Promise<{ handled: boolean; reason?: string }> {
    if (!this.config.commerce.enabled) throw new CommerceDisabledException();

    const verified = await this.provider.verifyWebhook(request);

    if (!verified.verified) {
      this.logger.warn({ reason: verified.failureReason }, 'Webhook rejected');
      return { handled: false, reason: verified.failureReason };
    }

    return this.verifyAndRecordPayment(verified);
  }

  /**
   * Settles a verified payment. Idempotent in two independent ways:
   *
   *   * `providerEventId` is a unique column, so a redelivered webhook that
   *     reaches the insert loses the race and is treated as already-handled.
   *   * An order already PAID or FULFILLED short-circuits.
   *
   * The amount and currency are compared against the stored order before
   * anything is marked paid: a payment for the wrong amount is a failure, not a
   * sale.
   */
  async verifyAndRecordPayment(
    verified: VerifiedPayment,
  ): Promise<{ handled: boolean; reason?: string }> {
    if (!verified.orderReference) {
      throw new PaymentVerificationFailedException('The payment carried no order reference.');
    }

    const order = await this.prisma.order.findUnique({
      where: { reference: verified.orderReference },
      include: { items: true },
    });

    if (!order) {
      throw new PaymentVerificationFailedException('The payment referenced an unknown order.');
    }

    if (order.status === 'PAID' || order.status === 'FULFILLED') {
      return { handled: true, reason: 'Order was already settled.' };
    }

    if (verified.providerEventId) {
      const seen = await this.prisma.paymentTransaction.findUnique({
        where: { providerEventId: verified.providerEventId },
      });
      if (seen) return { handled: true, reason: 'This provider event was already processed.' };
    }

    if (
      verified.amount.amountMinor !== order.totalAmountMinor ||
      verified.amount.currency !== order.currency
    ) {
      await this.prisma.$transaction([
        this.prisma.paymentTransaction.create({
          data: {
            orderId: order.id,
            provider: this.provider.name,
            providerReference: verified.providerReference,
            providerEventId: verified.providerEventId,
            status: 'FAILED',
            amountMinor: verified.amount.amountMinor,
            currency: verified.amount.currency,
            failureReason: 'Amount or currency did not match the order.',
          },
        }),
        this.prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'FAILED',
            failureReason: 'Payment amount did not match the order total.',
          },
        }),
      ]);

      this.logger.error(
        {
          orderId: order.id,
          expected: `${order.totalAmountMinor} ${order.currency}`,
          received: `${verified.amount.amountMinor} ${verified.amount.currency}`,
        },
        'Payment amount mismatch: order marked failed',
      );

      throw new PaymentVerificationFailedException('The payment amount did not match the order.');
    }

    await this.prisma.$transaction([
      this.prisma.paymentTransaction.create({
        data: {
          orderId: order.id,
          provider: this.provider.name,
          providerReference: verified.providerReference,
          providerEventId: verified.providerEventId,
          status: 'SUCCEEDED',
          amountMinor: verified.amount.amountMinor,
          currency: verified.amount.currency,
          verifiedAt: new Date(),
          ...(verified.raw ? { rawPayload: verified.raw as Prisma.InputJsonObject } : {}),
        },
      }),
      this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'PAID', paidAt: new Date() },
      }),
    ]);

    await this.deliveries.provisionForOrder(order.id);
    await this.notifyCustomer(order.id);

    await this.audit.record({
      action: 'order.paid',
      entityType: 'Order',
      entityId: order.id,
      summary: `Order ${order.reference} settled and fulfilled`,
      metadata: { provider: this.provider.name, reference: verified.providerReference },
    });

    return { handled: true };
  }

  /**
   * Customer-facing order lookup for the thank-you page. The opaque token is
   * compared against a stored hash, so the page needs no login and the order
   * cannot be enumerated by reference alone.
   */
  async findByReferenceAndToken(reference: string, token: string): Promise<OrderAccessResponse> {
    const order = await this.prisma.order.findUnique({
      where: { reference },
      include: { items: true, payments: true },
    });

    if (!order?.accessTokenHash || order.accessTokenHash !== sha256(token)) {
      throw new ResourceNotFoundException('Order', reference);
    }

    const downloads =
      order.status === 'PAID' || order.status === 'FULFILLED'
        ? await this.deliveries.createLinks(order.id)
        : [];

    return { order: await this.toDto(order.id), downloads };
  }

  async list(query: PaginationQueryDto): Promise<Paginated<OrderDto>> {
    const pagination = resolvePagination(query);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
        select: { id: true },
      }),
      this.prisma.order.count(),
    ]);

    const orders = await Promise.all(rows.map((row) => this.toDto(row.id)));
    return paginate(orders, total, pagination);
  }

  async toDto(orderId: string): Promise<OrderDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payments: { orderBy: { createdAt: 'asc' } } },
    });

    if (!order) throw new ResourceNotFoundException('Order', orderId);

    return {
      id: order.id,
      reference: order.reference,
      status: order.status,
      customerEmail: order.customerEmail,
      customerName: order.customerName,
      total: { amountMinor: order.totalAmountMinor, currency: order.currency },
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productTitle: item.productTitle,
        quantity: item.quantity,
        unitPrice: toMoney(item.unitPriceMinor, item.currency)!,
        subtotal: toMoney(item.subtotalMinor, item.currency)!,
      })),
      payments: order.payments.map((payment) => ({
        id: payment.id,
        provider: payment.provider,
        providerReference: payment.providerReference,
        status: payment.status,
        amount: { amountMinor: payment.amountMinor, currency: payment.currency },
        createdAt: payment.createdAt.toISOString(),
        verifiedAt: payment.verifiedAt?.toISOString() ?? null,
      })),
      deliveries: await this.deliveries.listForOrder(order.id),
      createdAt: order.createdAt.toISOString(),
      paidAt: order.paidAt?.toISOString() ?? null,
    };
  }

  private async notifyCustomer(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return;

    const links = await this.deliveries.createLinks(orderId);

    await this.mail.trySend({
      to: order.customerEmail,
      subject: `Your InkVision Creatives purchase — ${order.reference}`,
      text: [
        `Dear ${order.customerName.split(' ')[0] ?? order.customerName},`,
        '',
        'Thank you for your purchase. Your download links are below.',
        '',
        ...links.map(
          (link) =>
            `${link.productTitle}\n  ${link.url}\n  (this link expires at ${link.expiresAt})`,
        ),
        '',
        `Order reference: ${order.reference}`,
        '',
        'Links are time-limited for your security. If one expires, reopen the order page',
        'from your confirmation and a fresh link will be generated.',
        '',
        'Kind regards,',
        'InkVision Creatives',
      ].join('\n'),
    });
  }
}
