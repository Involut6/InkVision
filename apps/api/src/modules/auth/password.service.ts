import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

/**
 * Password hashing.
 *
 * Argon2id with parameters at the stronger end of the OWASP recommendation:
 * 19 MiB of memory, two iterations, one lane. The cost is deliberately felt on
 * the login path — it is the only defence that still works after a database
 * compromise.
 */

/**
 * `@node-rs/argon2` exports `Algorithm` as an ambient `const enum`, which has
 * no runtime value. Spelling the numeric variant out keeps the options object
 * correct under every transpiler (tsc, SWC, esbuild) rather than only under
 * one that inlines const enums.
 */
const ARGON2ID = 2;

const ARGON2_OPTIONS = {
  algorithm: ARGON2ID,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;

/** Minimum length. Length beats composition rules for real-world strength. */
export const MIN_PASSWORD_LENGTH = 12;

@Injectable()
export class PasswordService {
  async hash(plainPassword: string): Promise<string> {
    return hash(plainPassword, ARGON2_OPTIONS);
  }

  /**
   * Verifies a password. Returns false on a malformed stored hash rather than
   * throwing, so a corrupt row cannot turn into a 500 on the login endpoint.
   */
  async verify(storedHash: string, plainPassword: string): Promise<boolean> {
    try {
      return await verify(storedHash, plainPassword, ARGON2_OPTIONS);
    } catch {
      return false;
    }
  }

  /**
   * Rejects passwords that are too short or obviously weak. Returns the list of
   * problems so the caller can report all of them at once.
   */
  validateStrength(password: string): string[] {
    const problems: string[] = [];

    if (password.length < MIN_PASSWORD_LENGTH) {
      problems.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
    }
    if (password.length > 256) {
      problems.push('Password must be 256 characters or fewer.');
    }
    if (/^(.)\1+$/.test(password)) {
      problems.push('Password must not be a single repeated character.');
    }
    if (COMMON_PASSWORDS.has(password.toLowerCase())) {
      problems.push('That password is too common. Choose something less predictable.');
    }

    return problems;
  }
}

/**
 * A short denylist of passwords that pass a length check but are still trivially
 * guessable. A full breach-corpus check (e.g. Pwned Passwords k-anonymity) is
 * listed in the README as an optional hardening step.
 */
const COMMON_PASSWORDS = new Set([
  'password1234',
  'passw0rd1234',
  'administrator',
  'qwertyuiop123',
  'inkvision123',
  'letmein12345',
  'welcome12345',
  '123456789012',
]);
