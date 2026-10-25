import { Injectable } from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerRequest } from '@nestjs/throttler';

import type { AuthenticatedUser } from '../../modules/auth/auth.types.js';

/**
 * Rate limiting that distinguishes who is asking.
 *
 * The default tracker is the client IP, which is right for anonymous traffic
 * but wrong for the administration portal: a studio behind one office NAT would
 * share a single bucket between everyone working that day, and one person
 * paging through enquiries could lock out their colleagues.
 *
 * Authenticated requests are therefore tracked per user id instead. That is not
 * a weakening — an authenticated admin has already passed credentials, is
 * subject to permission checks, and every consequential action they take is in
 * the audit trail. Anonymous traffic, where abuse actually lives, keeps the
 * per-IP bucket unchanged.
 */
@Injectable()
export class ScopedThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, unknown>): Promise<string> {
    const user = req.user as AuthenticatedUser | undefined;
    if (user?.id) return `user:${user.id}`;

    // Behind a proxy, the first entry of X-Forwarded-For is the real client.
    const headers = req.headers as Record<string, string | string[] | undefined> | undefined;
    const forwarded = headers?.['x-forwarded-for'];
    const first = typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : forwarded?.[0];

    return `ip:${first || (req.ip as string | undefined) || 'unknown'}`;
  }

  /**
   * Authenticated administrators get a higher ceiling on the default bucket.
   * The named `auth` and `enquiry` buckets are untouched, so sign-in and public
   * form submission keep their tight limits whoever is calling.
   */
  protected override async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const request = requestProps.context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const isAuthenticated = Boolean(request.user?.id);

    if (isAuthenticated && requestProps.throttler.name === 'default') {
      return super.handleRequest({ ...requestProps, limit: requestProps.limit * 5 });
    }

    return super.handleRequest(requestProps);
  }
}
