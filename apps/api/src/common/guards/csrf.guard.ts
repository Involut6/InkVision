import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { AccessDeniedException } from '../errors/app.errors.js';
import { readCookie } from '../http/cookies.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { AuthService } from '../../modules/auth/auth.service.js';
import { CSRF_HEADER_NAME, REFRESH_COOKIE_NAME } from '../../modules/auth/auth.types.js';

/** Methods that cannot change state, so they need no CSRF token. */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit CSRF protection for cookie-authenticated, state-changing
 * requests.
 *
 * Only applies when the request actually relies on the session cookie. A
 * request carrying an `Authorization: Bearer` header is not vulnerable to CSRF
 * (a cross-site form cannot set that header), so it is exempt.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;

    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method)) return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const usesBearer =
      typeof request.headers.authorization === 'string' &&
      request.headers.authorization.toLowerCase().startsWith('bearer ');
    if (usesBearer) return true;

    const refreshToken = readCookie(request, REFRESH_COOKIE_NAME);
    if (!refreshToken) return true; // Unauthenticated; AdminJwtGuard will reject.

    const presented: string | string[] | undefined = request.headers[CSRF_HEADER_NAME];
    const token = Array.isArray(presented) ? presented[0] : presented;

    if (!this.auth.verifyCsrfToken(refreshToken, token)) {
      throw new AccessDeniedException(
        'This request could not be verified. Reload the page and try again.',
      );
    }

    return true;
  }
}
