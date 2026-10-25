import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { Permission } from '@inkvision/shared-types';

import { AccessDeniedException, UnauthenticatedException } from '../errors/app.errors.js';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';
import type { AuthenticatedUser } from '../../modules/auth/auth.types.js';

/**
 * Server-side authorisation. Runs after `AdminJwtGuard` and checks the
 * permissions the handler declared.
 *
 * This is the only authority on access: the admin UI hides what a user cannot
 * do, but hiding navigation is a convenience, not a control.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndMerge<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (required.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) throw new UnauthenticatedException();

    const granted = new Set(user.permissions);
    const missing = required.filter((permission) => !granted.has(permission));

    if (missing.length > 0) {
      throw new AccessDeniedException(
        `Your role (${user.role}) does not include: ${missing.join(', ')}.`,
      );
    }

    return true;
  }
}
