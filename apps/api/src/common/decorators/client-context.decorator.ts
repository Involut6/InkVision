import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface ClientContext {
  readonly ipAddress: string | undefined;
  readonly userAgent: string | undefined;
}

/**
 * The request's network context, used for abuse controls and audit entries.
 * The IP is hashed before storage — see `hashIpAddress`.
 */
export const Client = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ClientContext => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const forwarded = request.headers['x-forwarded-for'];
    const forwardedFirst =
      typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : forwarded?.[0];

    return {
      ipAddress: forwardedFirst || request.ip,
      userAgent:
        typeof request.headers['user-agent'] === 'string'
          ? request.headers['user-agent'].slice(0, 255)
          : undefined,
    };
  },
);
