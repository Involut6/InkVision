import { createHmac, timingSafeEqual } from 'node:crypto';

import type { Money } from '@inkvision/shared-types';

import type {
  InitiateCheckoutInput,
  InitiateCheckoutResult,
  PaymentProvider,
  VerifiedPayment,
  WebhookRequest,
} from '../payment-provider.types.js';

const PAYSTACK_API = 'https://api.paystack.co';

/**
 * Paystack integration (NGN-first, which suits the initial market).
 *
 * Status: the signature verification and the server-side verify call are
 * implemented in full, because those are the security-critical halves and they
 * must not be approximated. It has NOT been exercised against a live Paystack
 * test account in this repository, so `COMMERCE_ENABLED` stays false until
 * someone completes the checklist in README → "Enabling commerce".
 */
export class PaystackProvider implements PaymentProvider {
  readonly name = 'paystack';

  constructor(
    private readonly secretKey: string,
    private readonly currency: string,
  ) {}

  get configured(): boolean {
    return this.secretKey.length > 0;
  }

  get unavailableReason(): string | null {
    return this.configured ? null : 'PAYSTACK_SECRET_KEY is not set.';
  }

  async initiateCheckout(input: InitiateCheckoutInput): Promise<InitiateCheckoutResult> {
    const response = await this.request('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        email: input.customerEmail,
        // Paystack expects the integer minor unit, which is what we store.
        amount: input.amount.amountMinor,
        currency: input.amount.currency,
        reference: input.orderReference,
        callback_url: input.returnUrl,
        metadata: { ...input.metadata, customer_name: input.customerName },
      }),
    });

    const data = (response as { data?: { authorization_url?: string; reference?: string } }).data;

    return {
      checkoutUrl: data?.authorization_url ?? null,
      providerReference: data?.reference ?? input.orderReference,
    };
  }

  /**
   * Verifies the `x-paystack-signature` HMAC over the raw request body.
   *
   * The comparison is constant-time, and the body must be the exact bytes
   * received — re-serialising parsed JSON changes the digest and would make
   * every legitimate webhook fail.
   */
  async verifyWebhook(request: WebhookRequest): Promise<VerifiedPayment> {
    const header = request.headers['x-paystack-signature'];
    const signature = Array.isArray(header) ? header[0] : header;

    if (!signature) {
      return this.rejected('Webhook is missing the x-paystack-signature header.');
    }

    const expected = createHmac('sha512', this.secretKey).update(request.rawBody).digest('hex');

    if (!constantTimeEquals(expected, signature)) {
      return this.rejected('Webhook signature did not match.');
    }

    const event = JSON.parse(request.rawBody.toString('utf8')) as {
      event?: string;
      id?: number | string;
      data?: {
        reference?: string;
        amount?: number;
        currency?: string;
        status?: string;
        id?: number | string;
        metadata?: Record<string, string>;
      };
    };

    if (event.event !== 'charge.success') {
      return this.rejected(`Ignored Paystack event: ${event.event ?? 'unknown'}`);
    }

    const reference = event.data?.reference;
    if (!reference) return this.rejected('Webhook payload had no transaction reference.');

    // The signature proves the message came from Paystack, but the amount is
    // still re-read from Paystack's own records rather than taken from the
    // payload: this is the step that makes tampering pointless.
    return this.verifyPayment(reference);
  }

  async verifyPayment(providerReference: string): Promise<VerifiedPayment> {
    const response = await this.request(
      `/transaction/verify/${encodeURIComponent(providerReference)}`,
      { method: 'GET' },
    );

    const data = (
      response as {
        data?: {
          status?: string;
          amount?: number;
          currency?: string;
          reference?: string;
          id?: number;
          gateway_response?: string;
        };
      }
    ).data;

    if (!data) return this.rejected('Paystack returned no transaction data.');

    const amount: Money = {
      amountMinor: data.amount ?? 0,
      currency: (data.currency ?? this.currency).toUpperCase(),
    };

    if (data.status !== 'success') {
      return {
        verified: false,
        providerReference,
        providerEventId: data.id ? String(data.id) : null,
        amount,
        orderReference: data.reference ?? null,
        failureReason: data.gateway_response ?? `Transaction status: ${data.status}`,
      };
    }

    return {
      verified: true,
      providerReference,
      providerEventId: data.id ? String(data.id) : null,
      amount,
      orderReference: data.reference ?? null,
      raw: { status: data.status, gatewayResponse: data.gateway_response },
    };
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

  private async request(path: string, init: RequestInit): Promise<unknown> {
    const response = await fetch(`${PAYSTACK_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      // The provider's body is not forwarded to the client: it can echo keys.
      throw new Error(`Paystack request failed with status ${response.status}`);
    }

    return response.json();
  }
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}
