import type { Request } from 'express';

/**
 * Reads a cookie without reaching through `any`.
 *
 * Express types `Request.cookies` as `any`, so every expression that touches it
 * loses its type. Narrowing happens once, here, and the rest of the codebase
 * gets a `string | undefined`.
 *
 * An empty cookie is treated as absent: a cleared cookie and a missing one mean
 * the same thing to every caller.
 */
export function readCookie(request: Request, name: string): string | undefined {
  const cookies: unknown = (request as { cookies?: unknown }).cookies;
  if (typeof cookies !== 'object' || cookies === null) return undefined;

  const value = (cookies as Record<string, unknown>)[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
