import { createHmac, timingSafeEqual } from 'node:crypto';

import type {
  InitiateCheckoutInput,
  InitiateCheckoutResult,
  PaymentProvider,
  VerifiedPayment,
  WebhookRequest,
} from '../payment-provider.types.js';

/**
 * Stripe integration.
 *
 * Status: webhook signature verification is implemented in full (it is pure
 * crypto over the raw body and must not be approximated). Session creation and
 * server-side verification are declared boundaries that need the `stripe`
 * package — see README → "Enabling commerce". They throw rather than returning
 * a plausible-looking result, so nothing can be marked paid by accident.
 */
export class StripeProvider implements PaymentProvider {
  readonly name = 'stripe';

  constructor(
    private readonly secretKey: string,
    private readonly webhookSecret: string,
    private readonly currency: string,
  ) {}

  get configured(): boolean {
    return this.secretKey.length > 0 && this.webhookSecret.length > 0;
  }

  get unavailableReason(): string | null {
    if (!this.secretKey) return 'STRIPE_SECRET_KEY is not set.';
    if (!this.webhookSecret) return 'STRIPE_WEBHOOK_SECRET is not set.';
    return (
      'Stripe Checkout session creation is not implemented yet. ' +
      'Install the `stripe` package and complete src/modules/payments/providers/stripe.provider.ts.'
    );
  }

  async initiateCheckout(_input: InitiateCheckoutInput): Promise<InitiateCheckoutResult> {
    throw new Error(
      'Stripe Checkout is not implemented yet. Install `stripe`, create a Checkout Session here, ' +
        'and return its `url`. Prices must come from the order, never from the browser.',
    );
  }

  /**
   * Verifies the `Stripe-Signature` header per Stripe's scheme: the signed
   * payload is `${timestamp}.${rawBody}`, and the timestamp is checked against
   * a tolerance so a captured webhook cannot be replayed indefinitely.
   */
  async verifyWebhook(request: WebhookRequest): Promise<VerifiedPayment> {
    const header = request.headers['stripe-signature'];
    const signature = Array.isArray(header) ? header[0] : header;

    if (!signature) return this.rejected('Webhook is missing the Stripe-Signature header.');

    const parts = new Map(
      signature.split(',').map((part) => {
        const [key, value] = part.split('=');
        return [key?.trim() ?? '', value?.trim() ?? ''] as const;
      }),
    );

    const timestamp = parts.get('t');
    const v1 = parts.get('v1');
    if (!timestamp || !v1) return this.rejected('Stripe signature header was malformed.');

    const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
    if (!Number.isFinite(ageSeconds) || ageSeconds > 300) {
      return this.rejected('Stripe webhook timestamp is outside the five-minute tolerance.');
    }

    const expected = createHmac('sha256', this.webhookSecret)
      .update(`${timestamp}.${request.rawBody.toString('utf8')}`)
      .digest('hex');

    if (!constantTimeEquals(expected, v1)) {
      return this.rejected('Stripe webhook signature did not match.');
    }

    throw new Error(
      'Stripe webhook signature verified, but event handling is not implemented yet. ' +
        'Complete verifyPayment() and map checkout.session.completed before enabling commerce.',
    );
  }

  async verifyPayment(_providerReference: string): Promise<VerifiedPayment> {
    throw new Error(
      'Stripe server-side verification is not implemented yet. Retrieve the PaymentIntent and ' +
        'compare its amount and currency against the stored order.',
    );
  }

  private rejected(reason: string): VerifiedPayment {
    return {
      verified: false,
      providerReference: '',
      providerEventId: null,
      amount: { amountMinor: 0, currency: this.currency },
      orderReference: null,
      failureReason: reason,
    };
  }
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}
