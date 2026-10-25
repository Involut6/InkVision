import { Logger } from '@nestjs/common';

import type { EmailMessage, EmailSendResult, EmailTransport } from './mail.types.js';

/**
 * Development transport. Writes the rendered message to the log instead of
 * sending it, so the enquiry flow is fully exercisable with no mail account.
 *
 * It reports `delivered: false` deliberately — the application records that no
 * real email left the building rather than claiming a send that did not happen.
 */
export class ConsoleEmailTransport implements EmailTransport {
  readonly name = 'console';

  private readonly logger = new Logger('ConsoleEmailTransport');

  async send(message: EmailMessage): Promise<EmailSendResult> {
    this.logger.log(
      [
        '',
        '─── email (not sent: EMAIL_PROVIDER=console) ───',
        `to:      ${message.to}`,
        `subject: ${message.subject}`,
        ...(message.replyTo ? [`reply-to: ${message.replyTo}`] : []),
        '',
        message.text,
        '───────────────────────────────────────────────',
      ].join('\n'),
    );

    return { delivered: false, provider: this.name };
  }

  async verify(): Promise<{ ok: boolean; detail?: string }> {
    return { ok: true, detail: 'Console transport: messages are logged, not sent.' };
  }
}
