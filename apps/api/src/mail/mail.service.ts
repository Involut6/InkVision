import { Inject, Injectable, Logger } from '@nestjs/common';

import { AppConfigService } from '../config/configuration.js';

import {
  EMAIL_TRANSPORT,
  type EmailMessage,
  type EmailSendResult,
  type EmailTransport,
} from './mail.types.js';

/**
 * Application-facing mail API.
 *
 * Sending is best-effort by design: a visitor's enquiry is already safely
 * persisted by the time this runs, so a mail outage must not turn a successful
 * submission into an error. Failures are logged and surfaced on the readiness
 * probe instead.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @Inject(EMAIL_TRANSPORT) private readonly transport: EmailTransport,
    private readonly config: AppConfigService,
  ) {}

  get providerName(): string {
    return this.transport.name;
  }

  /** The configured business inbox, if one has been set. */
  get notificationRecipient(): string | undefined {
    return this.config.mail.notificationsTo;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const result = await this.transport.send(message);

    if (!result.delivered && result.error) {
      this.logger.warn(
        { provider: result.provider, subject: message.subject },
        'Email was not delivered',
      );
    }

    return result;
  }

  /** Sends and never throws. Returns false when nothing left the building. */
  async trySend(message: EmailMessage): Promise<boolean> {
    try {
      const result = await this.send(message);
      return result.delivered;
    } catch (error) {
      this.logger.error(
        { err: error instanceof Error ? error.message : String(error) },
        'Unexpected error while sending email',
      );
      return false;
    }
  }

  async verify(): Promise<{ ok: boolean; detail?: string }> {
    return this.transport.verify();
  }
}
