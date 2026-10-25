import type { AdminRole, Permission } from '@inkvision/shared-types';

/** The shape attached to `request.user` once a request is authenticated. */
export interface AuthenticatedUser {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
  readonly role: AdminRole;
  readonly permissions: readonly Permission[];
}

/** Claims carried by the short-lived access token. */
export interface AccessTokenPayload {
  /** Subject: the admin user id. */
  readonly sub: string;
  readonly email: string;
  readonly role: AdminRole;
  /** Token type, so a refresh token can never be presented as an access token. */
  readonly typ: 'access';
  /**
   * Unique per issuance. Without it, two tokens minted in the same second with
   * the same claims are byte-identical, which makes a re-issue invisible and
   * leaves a future revocation list nothing to key on.
   */
  readonly jti: string;
}

/** Claims carried by the opaque-ish refresh token (JWT wrapper over a jti). */
export interface RefreshTokenPayload {
  readonly sub: string;
  /** Identifies the stored RefreshToken row. */
  readonly jti: string;
  /** Login family, for family-wide revocation on replay detection. */
  readonly fam: string;
  readonly typ: 'refresh';
}

export const ACCESS_COOKIE_NAME = 'inkvision_access';
export const REFRESH_COOKIE_NAME = 'inkvision_refresh';
export const CSRF_COOKIE_NAME = 'inkvision_csrf';
export const CSRF_HEADER_NAME = 'x-csrf-token';
