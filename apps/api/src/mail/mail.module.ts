import { Global, Module } from '@nestjs/common';

import { AppConfigService } from '../config/configuration.js';

import { ConsoleEmailTransport } from './console.transport.js';
import { MailService } from './mail.service.js';
import { EMAIL_TRANSPORT, type EmailTransport } from './mail.types.js';
import { SmtpEmailTransport } from './smtp.transport.js';

/**
 * Selects the transport from validated configuration. The factory is the only
 * place that knows which providers exist.
 */
@Global()
@Module({
  providers: [
    {
      provide: EMAIL_TRANSPORT,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService): EmailTransport => {
        const mail = config.mail;

        if (mail.provider === 'smtp') {
          return new SmtpEmailTransport({
            // Validation guarantees a host when the provider is smtp.
            host: mail.smtp.host!,
            port: mail.smtp.port ?? 587,
            secure: mail.smtp.secure,
            ...(mail.smtp.user ? { user: mail.smtp.user } : {}),
            ...(mail.smtp.password ? { password: mail.smtp.password } : {}),
            from: mail.from,
          });
        }

        return new ConsoleEmailTransport();
      },
    },
    MailService,
  ],
  exports: [MailService, EMAIL_TRANSPORT],
})
export class MailModule {}
