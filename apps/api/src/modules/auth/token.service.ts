import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';

import { AppConfigService } from '../../config/configuration.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { sha256 } from '../../common/utils/crypto.js';

import type { AccessTokenPayload, RefreshTokenPayload } from './auth.types.js';

export interface IssuedTokens {
  readonly accessToken: string;
  readonly accessExpiresIn: number;
  readonly refreshToken: string;
  readonly refreshExpiresAt: Date;
}

interface IssueContext {
  readonly userId: string;
  readonly email: string;
  readonly role: AccessTokenPayload['role'];
  readonly familyId?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
}

/**
 * Issues, rotates and revokes tokens.
 *
 * Design:
 *   * The access token is a short-lived JWT held in memory by the admin client.
 *   * The refresh token is a JWT whose `jti` points at a stored row. Only the
 *     SHA-256 of the raw token is stored, so the database alone cannot be used
 *     to mint sessions.
 *   * Rotation issues a successor and marks the predecessor rotated. Presenting
 *     an already-rotated token is treated as theft and revokes the whole login
 *     family.
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async issue(context: IssueContext): Promise<IssuedTokens> {
    const { accessTtlSeconds, refreshTtlSeconds, accessSecret, refreshSecret } = this.config.auth;

    const accessPayload: AccessTokenPayload = {
      sub: context.userId,
      email: context.email,
      role: context.role,
      typ: 'access',
      jti: randomUUID(),
    };

    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: accessSecret,
      expiresIn: accessTtlSeconds,
    });

    const jti = randomUUID();
    const familyId = context.familyId ?? randomUUID();
    const refreshPayload: RefreshTokenPayload = {
      sub: context.userId,
      jti,
      fam: familyId,
      typ: 'refresh',
    };

    const refreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: refreshSecret,
      expiresIn: refreshTtlSeconds,
    });

    const refreshExpiresAt = new Date(Date.now() + refreshTtlSeconds * 1000);

    await this.prisma.refreshToken.create({
      data: {
        id: jti,
        userId: context.userId,
        tokenHash: sha256(refreshToken),
        familyId,
        expiresAt: refreshExpiresAt,
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
      },
    });

    return { accessToken, accessExpiresIn: accessTtlSeconds, refreshToken, refreshExpiresAt };
  }

  /** Verifies an access token. Returns null for anything invalid or expired. */
  async verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.auth.accessSecret,
      });
      return payload.typ === 'access' ? payload : null;
    } catch {
      return null;
    }
  }

  /**
   * Validates a refresh token against its stored row.
   *
   * Returns `{ reuseDetected: true }` when the token was already rotated, which
   * the caller must treat as a compromise.
   */
  async validateRefreshToken(
    token: string,
  ): Promise<
    | { readonly ok: true; readonly payload: RefreshTokenPayload }
    | { readonly ok: false; readonly reuseDetected: boolean }
  > {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.config.auth.refreshSecret,
      });
    } catch {
      return { ok: false, reuseDetected: false };
    }

    if (payload.typ !== 'refresh') return { ok: false, reuseDetected: false };

    const stored = await this.prisma.refreshToken.findUnique({ where: { id: payload.jti } });
    if (!stored) return { ok: false, reuseDetected: false };

    const presentedHash = sha256(token);

    // A rotated or revoked row being presented again means the raw token leaked.
    if (stored.revokedAt !== null || stored.rotatedToId !== null) {
      return { ok: false, reuseDetected: stored.tokenHash === presentedHash };
    }

    if (stored.tokenHash !== presentedHash) return { ok: false, reuseDetected: false };
    if (stored.expiresAt.getTime() <= Date.now()) return { ok: false, reuseDetected: false };

    return { ok: true, payload };
  }

  /**
   * Atomically rotates a refresh token: issues the successor and links the
   * predecessor to it in one transaction, so a crash cannot leave two live
   * tokens in the same family.
   */
  async rotate(
    previous: RefreshTokenPayload,
    context: Omit<IssueContext, 'familyId'>,
  ): Promise<IssuedTokens> {
    const issued = await this.issue({ ...context, familyId: previous.fam });

    await this.prisma.refreshToken.update({
      where: { id: previous.jti },
      data: { rotatedToId: this.decodeJti(issued.refreshToken), revokedAt: new Date() },
    });

    return issued;
  }

  /** Revokes one token (logout). */
  async revoke(jti: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { id: jti, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Revokes an entire login family — used on refresh-token reuse. */
  async revokeFamily(familyId: string): Promise<void> {
    const result = await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    this.logger.warn(
      { familyId, revoked: result.count },
      'Refresh token reuse detected: revoked the whole token family',
    );
  }

  /** Revokes every session for a user — used when an account is deactivated. */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Housekeeping: drops rows that can no longer be used. */
  async purgeExpired(now: Date = new Date()): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: now } },
    });
    return result.count;
  }

  private decodeJti(token: string): string | null {
    const decoded = this.jwt.decode<RefreshTokenPayload | null>(token);
    return decoded?.jti ?? null;
  }
}
