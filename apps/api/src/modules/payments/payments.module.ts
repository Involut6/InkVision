import { Global, Module } from '@nestjs/common';

import { AppConfigService } from '../../config/configuration.js';

import { PAYMENT_PROVIDER, type PaymentProvider } from './payment-provider.types.js';
import { NullPaymentProvider } from './providers/null.provider.js';
import { PaystackProvider } from './providers/paystack.provider.js';
import { StripeProvider } from './providers/stripe.provider.js';

/**
 * Resolves the configured payment provider. Defaults to the null provider,
 * which refuses every operation — commerce is opt-in, never the default.
 */
@Global()
@Module({
  providers: [
    {
      provide: PAYMENT_PROVIDER,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService): PaymentProvider => {
        const commerce = config.commerce;

        switch (commerce.provider) {
          case 'paystack':
            return new PaystackProvider(commerce.paystackSecretKey ?? '', commerce.currency);
          case 'stripe':
            return new StripeProvider(
              commerce.stripeSecretKey ?? '',
              commerce.stripeWebhookSecret ?? '',
              commerce.currency,
            );
          default:
            return new NullPaymentProvider();
        }
      },
    },
  ],
  exports: [PAYMENT_PROVIDER],
})
export class PaymentsModule {}
