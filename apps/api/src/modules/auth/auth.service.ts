import { Injectable, Logger } from '@nestjs/common';

import { ROLE_PERMISSIONS, type AdminUserDto } from '@inkvision/shared-types';

import { AppConfigService } from '../../config/configuration.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import {
  AccessDeniedException,
  InvalidCredentialsException,
  UnauthenticatedException,
  ValidationFailedException,
} from '../../common/errors/app.errors.js';
import { hmacSha256, randomToken } from '../../common/utils/crypto.js';

import type { AuthenticatedUser } from './auth.types.js';
import { PasswordService } from './password.service.js';
import { TokenService, type IssuedTokens } from './token.service.js';

/** After this many consecutive failures the account is locked temporarily. */
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 15;

export interface LoginResult {
  readonly tokens: IssuedTokens;
  readonly user: AdminUserDto;
  readonly csrfToken: string;
}

interface RequestContext {
  readonly ipAddress?: string;
  readonly userAgent?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly config: AppConfigService,
    private readonly audit: AuditService,
  ) {}

  async login(email: string, password: string, context: RequestContext): Promise<LoginResult> {
    const normalisedEmail = email.trim().toLowerCase();
    const user = await this.prisma.adminUser.findUnique({ where: { email: normalisedEmail } });

    // Hash against a dummy value when the account is absent, so a missing
    // account and a wrong password take the same amount of time.
    if (!user) {
      await this.passwords.verify(DUMMY_ARGON2_HASH, password);
      throw new InvalidCredentialsException();
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      throw new AccessDeniedException(
        'This account is temporarily locked after repeated failed sign-in attempts. Try again shortly.',
      );
    }

    const passwordMatches = await this.passwords.verify(user.passwordHash, password);

    if (!passwordMatches) {
      await this.registerFailedLogin(user.id, user.failedLoginAttempts);
      throw new InvalidCredentialsException();
    }

    // An inactive account is rejected only after the password check, so the
    // response cannot be used to discover which addresses are registered.
    if (!user.isActive) {
      throw new AccessDeniedException('This account has been deactivated.');
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.adminUser.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
      }),
    ]);

    const tokens = await this.tokens.issue({
      userId: user.id,
      email: user.email,
      role: user.role,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    await this.audit.record({
      actorId: user.id,
      actorEmail: user.email,
      action: 'auth.login',
      entityType: 'AdminUser',
      entityId: user.id,
      summary: `${user.email} signed in`,
      ipAddress: context.ipAddress,
    });

    return {
      tokens,
      user: this.toDto(updated),
      csrfToken: this.mintCsrfToken(tokens.refreshToken),
    };
  }

  /**
   * Exchanges a refresh token for a new pair. Reuse of an already-rotated token
   * revokes the whole family and forces a fresh sign-in.
   */
  async refresh(refreshToken: string | undefined, context: RequestContext): Promise<LoginResult> {
    if (!refreshToken) throw new UnauthenticatedException('No session to refresh.');

    const validation = await this.tokens.validateRefreshToken(refreshToken);

    if (!validation.ok) {
      if (validation.reuseDetected) {
        const decoded = this.safeDecodeFamily(refreshToken);
        if (decoded) await this.tokens.revokeFamily(decoded);
      }
      throw new UnauthenticatedException('Your session has expired. Please sign in again.');
    }

    const user = await this.prisma.adminUser.findUnique({ where: { id: validation.payload.sub } });
    if (!user?.isActive) {
      await this.tokens.revokeFamily(validation.payload.fam);
      throw new UnauthenticatedException('Your session is no longer valid. Please sign in again.');
    }

    const tokens = await this.tokens.rotate(validation.payload, {
      userId: user.id,
      email: user.email,
      role: user.role,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return {
      tokens,
      user: this.toDto(user),
      csrfToken: this.mintCsrfToken(tokens.refreshToken),
    };
  }

  async logout(refreshToken: string | undefined, actor?: AuthenticatedUser): Promise<void> {
    if (refreshToken) {
      const validation = await this.tokens.validateRefreshToken(refreshToken);
      if (validation.ok) {
        await this.tokens.revoke(validation.payload.jti);
      }
    }

    if (actor) {
      await this.audit.record({
        actorId: actor.id,
        actorEmail: actor.email,
        action: 'auth.logout',
        entityType: 'AdminUser',
        entityId: actor.id,
        summary: `${actor.email} signed out`,
      });
    }
  }

  /** Loads the current user fresh from the database (role changes take effect). */
  async resolveAuthenticatedUser(userId: string): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.adminUser.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, role: true, isActive: true },
    });

    if (!user?.isActive) return null;

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      permissions: ROLE_PERMISSIONS[user.role],
    };
  }

  async changeOwnPassword(
    user: AuthenticatedUser,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const record = await this.prisma.adminUser.findUnique({ where: { id: user.id } });
    if (!record) throw new UnauthenticatedException();

    if (!(await this.passwords.verify(record.passwordHash, currentPassword))) {
      throw new ValidationFailedException({
        currentPassword: ['That is not your current password.'],
      });
    }

    const problems = this.passwords.validateStrength(newPassword);
    if (problems.length > 0) {
      throw new ValidationFailedException({ newPassword: problems });
    }

    await this.prisma.adminUser.update({
      where: { id: user.id },
      data: {
        passwordHash: await this.passwords.hash(newPassword),
        passwordChangedAt: new Date(),
        mustChangePassword: false,
      },
    });

    // Every other session is invalidated: a password change must end sessions
    // an attacker may already hold.
    await this.tokens.revokeAllForUser(user.id);

    await this.audit.record({
      actorId: user.id,
      actorEmail: user.email,
      action: 'auth.password_changed',
      entityType: 'AdminUser',
      entityId: user.id,
      summary: `${user.email} changed their password; all sessions revoked`,
    });
  }

  /**
   * Double-submit CSRF token, bound to the session's refresh token.
   *
   * The cookie is readable by the admin client, which echoes it in a header. An
   * attacker on another origin can neither read the cookie nor guess the value,
   * and because it is derived from the refresh token it cannot be transplanted
   * between sessions.
   */
  mintCsrfToken(refreshToken: string): string {
    return hmacSha256(refreshToken, this.config.auth.csrfSecret);
  }

  verifyCsrfToken(refreshToken: string | undefined, presented: string | undefined): boolean {
    if (!refreshToken || !presented) return false;
    const expected = this.mintCsrfToken(refreshToken);
    return expected.length === presented.length && expected === presented;
  }

  toDto(user: {
    id: string;
    email: string;
    fullName: string;
    role: AdminUserDto['role'];
    isActive: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
  }): AdminUserDto {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      permissions: ROLE_PERMISSIONS[user.role],
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private async registerFailedLogin(userId: string, currentFailures: number): Promise<void> {
    const attempts = currentFailures + 1;
    const shouldLock = attempts >= MAX_FAILED_LOGINS;

    await this.prisma.adminUser.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: attempts,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null,
      },
    });

    if (shouldLock) {
      this.logger.warn({ userId, attempts }, 'Admin account locked after repeated failed logins');
    }
  }

  private safeDecodeFamily(refreshToken: string): string | null {
    const segments = refreshToken.split('.');
    if (segments.length !== 3 || !segments[1]) return null;
    try {
      const payload = JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf8')) as {
        fam?: unknown;
      };
      return typeof payload.fam === 'string' ? payload.fam : null;
    } catch {
      return null;
    }
  }
}

/**
 * A real Argon2id hash of a value nobody knows, used to equalise response time
 * when the submitted address has no account.
 */
const DUMMY_ARGON2_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$c29tZS1maXhlZC1zYWx0LXZhbHVl$Fd3SvGvGgKX1UOLKmhIQb6BZpQQVnmkBzMrOYHLBrGk';

/** Random bytes helper re-exported for the initial-administrator script. */
export { randomToken };
