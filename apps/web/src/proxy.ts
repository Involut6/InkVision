import { NextResponse, type NextRequest } from 'next/server';

/**
 * Per-request security headers. (Next.js 16 renamed this convention from
 * `middleware` to `proxy`; the behaviour is unchanged.)
 *
 * The Content-Security-Policy lives here rather than in `next.config.ts`
 * because it carries a per-response nonce: a static policy would have to allow
 * `unsafe-inline` for Next.js's hydration scripts, which defeats most of the
 * point of having a script policy at all.
 */
export default function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDevelopment = process.env.NODE_ENV === 'development';

  // The API origin must be reachable by the browser for mutations.
  const apiOrigin = safeOrigin(process.env.NEXT_PUBLIC_API_BASE_URL);

  const policy = [
    `default-src 'self'`,
    // `strict-dynamic` lets a nonce-approved script load its own chunks, which
    // is how Next.js's runtime works, without opening the door to injected
    // inline script. `unsafe-eval` is development-only (React Refresh).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${isDevelopment ? "'unsafe-eval'" : ''}`,
    // Tailwind's generated styles and next/font's injected rules are inline, so
    // style-src cannot be nonce-only without breaking the page.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: ${apiOrigin}`,
    `font-src 'self' data:`,
    `connect-src 'self' ${apiOrigin} ${isDevelopment ? 'ws: wss:' : ''}`,
    `frame-src 'self'`,
    `object-src 'none'`,
    `base-uri 'none'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    ...(isDevelopment ? [] : ['upgrade-insecure-requests']),
  ]
    .filter(Boolean)
    .join('; ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', policy);

  return response;
}

function safeOrigin(url: string | undefined): string {
  if (!url) return '';
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}

export const config = {
  // Static assets and image optimisation need no policy and benefit from
  // skipping the middleware entirely.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
