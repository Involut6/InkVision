import type { Money } from '@inkvision/shared-types';

export interface InitiateCheckoutInput {
  readonly orderReference: string;
  readonly amount: Money;
  readonly customerEmail: string;
  readonly customerName: string;
  /** Where the provider should return the customer after payment. */
  readonly returnUrl: string;
  /** Opaque value echoed back by the provider, used to match the order. */
  readonly metadata: Readonly<Record<string, string>>;
}

export interface InitiateCheckoutResult {
  /** Null when the provider cannot start a session (e.g. none configured). */
  readonly checkoutUrl: string | null;
  readonly providerReference: string | null;
}

/** The outcome of verifying a payment against the provider's own records. */
export interface VerifiedPayment {
  readonly verified: boolean;
  readonly providerReference: string;
  /** Provider event id, used for idempotency. */
  readonly providerEventId: string | null;
  readonly amount: Money;
  readonly orderReference: string | null;
  readonly failureReason?: string;
  /** Payload with secrets removed, retained for reconciliation. */
  readonly raw?: Record<string, unknown>;
}

export interface WebhookRequest {
  readonly rawBody: Buffer;
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
}

/**
 * Payment provider abstraction.
 *
 * Two rules every implementation must honour:
 *   1. `verifyWebhook` validates the provider's signature over the RAW body.
 *      An unsigned or badly-signed payload is never trusted.
 *   2. `verifyPayment` asks the provider what it believes the amount and
 *      status to be. Nothing the browser or the webhook body claims about
 *      price or success is taken at face value.
 */
export interface PaymentProvider {
  readonly name: string;
  readonly configured: boolean;
  /** Human-readable reason the provider cannot be used, if any. */
  readonly unavailableReason: string | null;

  initiateCheckout(input: InitiateCheckoutInput): Promise<InitiateCheckoutResult>;
  verifyWebhook(request: WebhookRequest): Promise<VerifiedPayment>;
  verifyPayment(providerReference: string): Promise<VerifiedPayment>;
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
