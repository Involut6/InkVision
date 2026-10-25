import { Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';

import type { EmailMessage, EmailSendResult, EmailTransport } from './mail.types.js';

export interface SmtpOptions {
  readonly host: string;
  readonly port: number;
  readonly secure: boolean;
  readonly user?: string;
  readonly password?: string;
  readonly from: string;
}

/**
 * SMTP transport, which covers every mainstream transactional provider
 * (Postmark, Resend, SES, Mailgun, …) as well as mailpit locally.
 */
export class SmtpEmailTransport implements EmailTransport {
  readonly name = 'smtp';

  private readonly logger = new Logger('SmtpEmailTransport');
  private readonly transporter: Transporter;

  constructor(private readonly options: SmtpOptions) {
    this.transporter = createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure,
      ...(options.user && options.password
        ? { auth: { user: options.user, pass: options.password } }
        : {}),
      // Bounded so a hanging provider cannot pin a request open indefinitely.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    try {
      const info = await this.transporter.sendMail({
        from: this.options.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
        ...(message.replyTo ? { replyTo: message.replyTo } : {}),
      });

      return { delivered: true, provider: this.name, messageId: info.messageId };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      // The address is not logged: delivery failures must not become a log of
      // who contacted the business.
      this.logger.error({ err: detail }, 'SMTP delivery failed');
      return { delivered: false, provider: this.name, error: detail };
    }
  }

  async verify(): Promise<{ ok: boolean; detail?: string }> {
    try {
      await this.transporter.verify();
      return { ok: true };
    } catch (error) {
      return { ok: false, detail: error instanceof Error ? error.message : String(error) };
    }
  }
}
