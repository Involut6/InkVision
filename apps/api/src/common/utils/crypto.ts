import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/** Opaque, URL-safe random token. 32 bytes ≈ 256 bits of entropy. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/**
 * SHA-256 hex digest. Used to store refresh tokens, download tokens and the
 * enquiry dedupe fingerprint — never for passwords, which use Argon2id.
 */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Keyed digest, so a stolen database cannot be used to re-derive inputs. */
export function hmacSha256(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('hex');
}

/** Constant-time comparison that tolerates differing lengths. */
export function safeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  if (bufferA.length !== bufferB.length) {
    // Still do the comparison to keep the timing profile flat.
    timingSafeEqual(bufferA, bufferA);
    return false;
  }
  return timingSafeEqual(bufferA, bufferB);
}

/**
 * Pseudonymised client address. Stored instead of the raw IP so abuse controls
 * keep working without the site retaining personal data it does not need.
 */
export function hashIpAddress(ip: string | undefined, secret: string): string | null {
  if (!ip) return null;
  return hmacSha256(ip, secret);
}

/**
 * Short, human-quotable reference, e.g. `ENQ-7FQ2K4`. Case-insensitive alphabet
 * with ambiguous characters (0/O, 1/I) removed so it survives being read aloud.
 */
const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateReference(prefix: string, length = 6): string {
  const bytes = randomBytes(length);
  let suffix = '';
  for (let index = 0; index < length; index += 1) {
    suffix += REFERENCE_ALPHABET[bytes[index]! % REFERENCE_ALPHABET.length];
  }
  return `${prefix}-${suffix}`;
}
