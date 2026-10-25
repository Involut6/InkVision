export interface EmailMessage {
  readonly to: string;
  readonly subject: string;
  /** Plain-text body. Always present: some recipients never render HTML. */
  readonly text: string;
  readonly html?: string;
  readonly replyTo?: string;
}

export interface EmailSendResult {
  readonly delivered: boolean;
  readonly provider: string;
  readonly messageId?: string;
  readonly error?: string;
}

/**
 * The transport abstraction. Swapping provider is a configuration change, not a
 * code change, and nothing above this interface knows about SMTP.
 */
export interface EmailTransport {
  readonly name: string;
  send(message: EmailMessage): Promise<EmailSendResult>;
  /** Used by the readiness probe. */
  verify(): Promise<{ ok: boolean; detail?: string }>;
}

export const EMAIL_TRANSPORT = Symbol('EMAIL_TRANSPORT');
