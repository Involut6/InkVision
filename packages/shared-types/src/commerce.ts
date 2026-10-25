import type { DeliveryStatus, OrderStatus, PaymentStatus } from './enums.js';
import type { Money } from './content.js';

export interface CheckoutInput {
  productSlug: string;
  customerEmail: string;
  customerName: string;
  /** Idempotency key supplied by the client to make retries safe. */
  idempotencyKey?: string;
}

/**
 * The server never accepts a price from the browser; `amount` below is the
 * price it looked up and locked onto the pending order.
 */
export interface CheckoutResponse {
  readonly orderId: string;
  readonly reference: string;
  readonly status: OrderStatus;
  readonly amount: Money;
  /** Where to send the customer to pay. Null when no provider is configured. */
  readonly checkoutUrl: string | null;
  readonly provider: string;
}

export interface OrderItemDto {
  readonly id: string;
  readonly productId: string;
  readonly productTitle: string;
  readonly quantity: number;
  readonly unitPrice: Money;
  readonly subtotal: Money;
}

export interface PaymentTransactionDto {
  readonly id: string;
  readonly provider: string;
  readonly providerReference: string | null;
  readonly status: PaymentStatus;
  readonly amount: Money;
  readonly createdAt: string;
  readonly verifiedAt: string | null;
}

export interface DigitalDeliveryDto {
  readonly id: string;
  readonly productId: string;
  readonly productTitle: string;
  readonly status: DeliveryStatus;
  readonly downloadCount: number;
  readonly maxDownloads: number;
  readonly expiresAt: string | null;
  readonly deliveredAt: string | null;
}

export interface OrderDto {
  readonly id: string;
  readonly reference: string;
  readonly status: OrderStatus;
  readonly customerEmail: string;
  readonly customerName: string;
  readonly total: Money;
  readonly items: readonly OrderItemDto[];
  readonly payments: readonly PaymentTransactionDto[];
  readonly deliveries: readonly DigitalDeliveryDto[];
  readonly createdAt: string;
  readonly paidAt: string | null;
}

/** Response of the customer-facing order lookup used by the thank-you page. */
export interface OrderAccessResponse {
  readonly order: OrderDto;
  /** Time-limited signed links. Absent until payment has been verified. */
  readonly downloads: readonly {
    readonly deliveryId: string;
    readonly productTitle: string;
    readonly url: string;
    readonly expiresAt: string;
  }[];
}

export interface CommerceStatusDto {
  readonly enabled: boolean;
  readonly provider: string;
  readonly currency: string;
  /** Human-readable reason shown in the admin UI when commerce is off. */
  readonly reason: string | null;
}
