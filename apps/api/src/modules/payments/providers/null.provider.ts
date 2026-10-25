import type {
  InitiateCheckoutResult,
  PaymentProvider,
  VerifiedPayment,
} from '../payment-provider.types.js';

/**
 * The provider used when none is configured — the default.
 *
 * Every operation refuses. Crucially it does NOT simulate a successful payment:
 * a fake "paid" result is the one behaviour that could put an unpaid download
 * in a customer's hands, so the boundary fails closed instead.
 */
export class NullPaymentProvider implements PaymentProvider {
  readonly name = 'none';
  readonly configured = false;
  readonly unavailableReason =
    'No payment provider is configured. Set PAYMENT_PROVIDER and the matching credentials, then set COMMERCE_ENABLED=true.';

  async initiateCheckout(): Promise<InitiateCheckoutResult> {
    throw new Error(this.unavailableReason);
  }

  async verifyWebhook(): Promise<VerifiedPayment> {
    throw new Error(this.unavailableReason);
  }

  async verifyPayment(): Promise<VerifiedPayment> {
    throw new Error(this.unavailableReason);
  }
}
