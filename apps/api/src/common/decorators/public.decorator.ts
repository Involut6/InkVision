import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'inkvision:isPublic';

/**
 * Marks a route as reachable without authentication.
 *
 * Authentication is opt-OUT rather than opt-in: `AdminJwtGuard` is registered
 * globally, so forgetting a decorator fails closed (the route 401s) instead of
 * silently exposing data.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
