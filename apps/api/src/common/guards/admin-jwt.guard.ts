import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { UnauthenticatedException } from '../errors/app.errors.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { ACCESS_COOKIE_NAME, type AuthenticatedUser } from '../../modules/auth/auth.types.js';
import { AuthService } from '../../modules/auth/auth.service.js';
import { TokenService } from '../../modules/auth/token.service.js';
import { readCookie } from '../http/cookies.js';

/**
 * Global authentication guard.
 *
 * Registered application-wide, so every route is protected unless it carries
 * `@Public()`. The user is re-read from the database on each request, which
 * means a deactivated account or a changed role takes effect immediately
 * instead of lingering until the access token expires.
 */
@Injectable()
export class AdminJwtGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const token = extractToken(request);
    if (!token) throw new UnauthenticatedException();

    const payload = await this.tokens.verifyAccessToken(token);
    if (!payload)
      throw new UnauthenticatedException('Your session has expired. Please sign in again.');

    const user = await this.auth.resolveAuthenticatedUser(payload.sub);
    if (!user) throw new UnauthenticatedException('Your session is no longer valid.');

    request.user = user;
    return true;
  }
}

/**
 * Accepts the bearer header first, falling back to the access cookie. Both are
 * supported because the admin SPA holds the token in memory (header) while
 * server-rendered admin pages present the cookie.
 */
function extractToken(request: Request): string | null {
  const header = request.headers.authorization;
  if (typeof header === 'string' && header.toLowerCase().startsWith('bearer ')) {
    const value = header.slice(7).trim();
    if (value.length > 0) return value;
  }

  return readCookie(request, ACCESS_COOKIE_NAME) ?? null;
}
