import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { AuthenticatedUser } from '../../modules/auth/auth.types.js';

/**
 * Injects the authenticated administrator. Only ever populated by
 * `AdminJwtGuard`, so a controller cannot be tricked into trusting a
 * client-supplied identity.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    if (!request.user) {
      throw new Error('CurrentUser used on a route that is not behind AdminJwtGuard');
    }
    return request.user;
  },
);
